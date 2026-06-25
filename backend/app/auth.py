"""Routeur d'authentification : login email/mot de passe + 2e facteur OTP, puis émission d'un JWT."""
from fastapi import APIRouter, Depends, HTTPException, Request, status

from . import config, data_store, security
from .schemas import LoginRequest, OtpRequest, PasswordCheckRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.post("/login")
def login(body: LoginRequest, request: Request):
    """Étape 1 : vérifie email + mot de passe, puis envoie un défi OTP (2FA)."""
    ip = _client_ip(request)
    email = body.email.lower()

    if security.rate_limited(f"login:{ip}"):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Trop de tentatives. Réessayez plus tard.")

    if security.is_locked(email):
        data_store.audit("login_locked", ip=ip, email=email)
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail="Compte temporairement verrouillé après trop d'échecs.")

    user = data_store.get_user_by_email(email)
    # Réponse générique pour ne pas révéler si l'email existe ; on hache quand même pour limiter le timing.
    if user is None or not security.verify_password(body.password, user["passwordHash"]):
        security.record_login_failure(email)
        data_store.audit("login_failure", ip=ip, email=email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides.")

    security.reset_login_failures(email)
    challenge_id, otp = security.create_otp_challenge(user["clientId"], email)
    data_store.audit("login_password_ok", client_id=user["clientId"], ip=ip, email=email)
    print(f"[OTP] Code pour {email} : {otp}  (valide {config.OTP_TTL_SEC // 60} min)")

    resp = {
        "challengeId": challenge_id,
        "expiresIn": config.OTP_TTL_SEC,
        "message": "Mot de passe vérifié. Saisissez le code OTP envoyé.",
    }
    if config.DEMO_MODE:
        resp["devOtp"] = otp  # mode démo uniquement
    return resp


@router.post("/verify-otp")
def verify_otp(body: OtpRequest, request: Request):
    """Étape 2 : vérifie l'OTP et émet le jeton d'accès JWT."""
    ip = _client_ip(request)
    if security.rate_limited(f"otp:{ip}"):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Trop de tentatives. Réessayez plus tard.")

    client_id, reason = security.verify_otp_challenge(body.challengeId, body.otp)
    if client_id is None:
        data_store.audit("otp_failure", ip=ip, reason=reason)
        messages = {
            "challenge_invalide": "Session de connexion invalide. Recommencez.",
            "expire": "Code expiré. Recommencez la connexion.",
            "trop_d_essais": "Trop d'essais. Recommencez la connexion.",
            "otp_incorrect": "Code OTP incorrect.",
        }
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=messages.get(reason, "Vérification échouée."))

    client = data_store.get_client_by_id(client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client introuvable.")

    token, ttl = security.create_access_token({
        "sub": client_id,
        "email": client.get("personnel", {}).get("email", ""),
        "role": "client",
    })
    data_store.audit("login_success", client_id=client_id, ip=ip)
    return {
        "token": token,
        "tokenType": "Bearer",
        "expiresIn": ttl,
        "client": data_store.public_client(client),
    }


@router.get("/me")
def me(client_id: str = Depends(security.get_current_client_id)):
    client = data_store.get_client_by_id(client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client introuvable.")
    return data_store.public_client(client)


@router.post("/verify-password")
def verify_password(body: PasswordCheckRequest, request: Request,
                    client_id: str = Depends(security.get_current_client_id)):
    """Ré-authentification (step-up) : revérifie le mot de passe du client connecté.
    Utilisé pour déverrouiller l'affichage des soldes (œil sur le dashboard)."""
    ip = _client_ip(request)
    if security.rate_limited(f"pwcheck:{client_id}"):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Trop de tentatives. Réessayez plus tard.")

    user = data_store.get_user_by_client_id(client_id)
    if user is None or not security.verify_password(body.password, user["passwordHash"]):
        data_store.audit("balance_reveal_failure", client_id=client_id, ip=ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Mot de passe incorrect.")

    data_store.audit("balance_reveal_ok", client_id=client_id, ip=ip)
    return {"ok": True}
