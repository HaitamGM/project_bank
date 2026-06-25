"""Primitives de sécurité : hachage de mot de passe (bcrypt), JWT, OTP 2FA,
anti-bruteforce, rate-limiting et dépendances FastAPI d'authentification.

Stores en mémoire (suffisant pour une démo mono-processus). En production :
Redis + envoi OTP par SMS/email + secret JWT robuste hors du code.
"""
import secrets
import time
import uuid
from collections import defaultdict

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from . import config

# ───────────────────────── Mots de passe ─────────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ───────────────────────── JWT ─────────────────────────

def create_access_token(claims: dict) -> tuple[str, int]:
    now = int(time.time())
    ttl = config.ACCESS_TOKEN_TTL_MIN * 60
    payload = {**claims, "type": "access", "iat": now, "exp": now + ttl, "jti": uuid.uuid4().hex}
    token = jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)
    return token, ttl


def decode_token(token: str):
    try:
        return jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


# ───────────────────────── OTP login (2FA) ─────────────────────────
_otp_store: dict[str, dict] = {}


def _gen_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def create_otp_challenge(client_id: str, email: str) -> tuple[str, str]:
    purge_stale()
    challenge_id = secrets.token_urlsafe(18)
    otp = _gen_otp()
    _otp_store[challenge_id] = {
        "clientId": client_id, "email": email, "otp": otp,
        "exp": time.time() + config.OTP_TTL_SEC, "attempts": 0,
    }
    return challenge_id, otp


def verify_otp_challenge(challenge_id: str, otp: str) -> tuple[str | None, str | None]:
    """Renvoie (clientId, None) si OK, sinon (None, raison)."""
    c = _otp_store.get(challenge_id)
    if not c:
        return None, "challenge_invalide"
    if time.time() > c["exp"]:
        _otp_store.pop(challenge_id, None)
        return None, "expire"
    c["attempts"] += 1
    if c["attempts"] > config.OTP_MAX_ATTEMPTS:
        _otp_store.pop(challenge_id, None)
        return None, "trop_d_essais"
    if not secrets.compare_digest(str(otp), c["otp"]):
        return None, "otp_incorrect"
    client_id = c["clientId"]
    _otp_store.pop(challenge_id, None)
    return client_id, None


# ───────────────────── OTP signature de virement ─────────────────────
_tx_store: dict[str, dict] = {}


def create_transfer_challenge(client_id: str, transfer: dict) -> tuple[str, str]:
    purge_stale()
    challenge_id = secrets.token_urlsafe(18)
    otp = _gen_otp()
    _tx_store[challenge_id] = {
        "clientId": client_id, "transfer": transfer, "otp": otp,
        "exp": time.time() + config.OTP_TTL_SEC, "attempts": 0,
    }
    return challenge_id, otp


def verify_transfer_challenge(client_id: str, challenge_id: str, otp: str):
    """Renvoie (transfer, None) si OK, sinon (None, raison)."""
    c = _tx_store.get(challenge_id)
    if not c or c["clientId"] != client_id:
        return None, "challenge_invalide"
    if time.time() > c["exp"]:
        _tx_store.pop(challenge_id, None)
        return None, "expire"
    c["attempts"] += 1
    if c["attempts"] > config.OTP_MAX_ATTEMPTS:
        _tx_store.pop(challenge_id, None)
        return None, "trop_d_essais"
    if not secrets.compare_digest(str(otp), c["otp"]):
        return None, "otp_incorrect"
    transfer = c["transfer"]
    _tx_store.pop(challenge_id, None)
    return transfer, None


# ─────────────────── Anti-bruteforce (verrouillage) ───────────────────
_login_fail: dict[str, list[float]] = defaultdict(list)
_locked_until: dict[str, float] = {}


def is_locked(email: str) -> bool:
    until = _locked_until.get(email)
    if until is None:
        return False
    if time.time() < until:
        return True
    _locked_until.pop(email, None)
    return False


def record_login_failure(email: str) -> None:
    now = time.time()
    arr = [t for t in _login_fail[email] if now - t < config.LOGIN_WINDOW_SEC]
    arr.append(now)
    _login_fail[email] = arr
    if len(arr) >= config.LOGIN_MAX_ATTEMPTS:
        _locked_until[email] = now + config.LOCKOUT_SEC


def reset_login_failures(email: str) -> None:
    _login_fail.pop(email, None)
    _locked_until.pop(email, None)


# ─────────────────── Rate-limit générique par IP ───────────────────
_rate: dict[str, list[float]] = defaultdict(list)


def rate_limited(key: str, max_n: int = config.RATE_MAX_REQUESTS, window: int = config.RATE_WINDOW_SEC) -> bool:
    """True si la limite est dépassée."""
    now = time.time()
    arr = [t for t in _rate[key] if now - t < window]
    arr.append(now)
    _rate[key] = arr
    return len(arr) > max_n


def purge_stale() -> None:
    """Purge opportuniste des entrées expirées (évite la croissance mémoire non bornée).
    Appelée lors de la création de défis (fréquence faible)."""
    now = time.time()
    for cid in [k for k, v in list(_otp_store.items()) if now > v["exp"]]:
        _otp_store.pop(cid, None)
    for cid in [k for k, v in list(_tx_store.items()) if now > v["exp"]]:
        _tx_store.pop(cid, None)
    for email in [k for k, u in list(_locked_until.items()) if now >= u]:
        _locked_until.pop(email, None)
    for email in [k for k, arr in list(_login_fail.items()) if not any(now - t < config.LOGIN_WINDOW_SEC for t in arr)]:
        _login_fail.pop(email, None)
    for key in [k for k, arr in list(_rate.items()) if not any(now - t < config.RATE_WINDOW_SEC for t in arr)]:
        _rate.pop(key, None)


# ─────────────────── Dépendances FastAPI ───────────────────
_bearer = HTTPBearer(auto_error=False)


def get_current_claims(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentification requise")
    claims = decode_token(creds.credentials)
    if claims is None or claims.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Jeton invalide ou expiré")
    return claims


def get_current_client_id(claims: dict = Depends(get_current_claims)) -> str:
    return claims["sub"]
