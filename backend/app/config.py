"""Configuration centrale BankIA (secrets, chemins, constantes de sécurité)."""
import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent      # backend/
PROJECT_ROOT = BASE_DIR.parent                          # racine du repo
DATA_DIR = PROJECT_ROOT / "data"

load_dotenv(BASE_DIR / ".env")

# --- Mode démo (doit être calculé avant la validation du secret JWT) ---
# Défaut SÛR = false : un déploiement non configuré ne fuite pas les OTP.
# La soutenance positionne explicitement DEMO_MODE=true (dans .env / .env.example).
DEMO_MODE = os.environ.get("DEMO_MODE", "false").lower() == "true"

# --- JWT / authentification ---
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_MIN = int(os.environ.get("ACCESS_TOKEN_TTL_MIN", "60"))

# Secret de signature : on REFUSE toute valeur faible/par défaut connue.
_WEAK_SECRETS = {"", "dev-insecure-change-me", "changez_moi_par_une_valeur_aleatoire", "votre_cle_ici"}
_raw_secret = os.environ.get("JWT_SECRET", "").strip()
if _raw_secret in _WEAK_SECRETS or len(_raw_secret) < 32:
    if DEMO_MODE:
        # Mode démo : secret aléatoire éphémère (sûr, mais les sessions ne survivent pas
        # au redémarrage). Définissez un JWT_SECRET fixe dans .env pour des sessions stables.
        _raw_secret = secrets.token_hex(32)
        print("[config] JWT_SECRET faible/absent — secret éphémère généré (DEMO_MODE). "
              "Définissez JWT_SECRET (>=32 octets) dans backend/.env pour des sessions persistantes.")
    else:
        raise RuntimeError(
            "JWT_SECRET manquant ou trop faible. Générez-en un : "
            "python -c \"import secrets; print(secrets.token_hex(32))\" et placez-le dans backend/.env."
        )
JWT_SECRET = _raw_secret

# Mot de passe de démonstration commun (haché au premier démarrage). À documenter pour le jury.
DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "BankIA@2026")

# --- OTP (2e facteur) ---
OTP_TTL_SEC = 300          # validité d'un code OTP
OTP_MAX_ATTEMPTS = 5       # essais avant invalidation du challenge

# --- Anti-bruteforce / verrouillage ---
LOGIN_MAX_ATTEMPTS = 5     # échecs avant verrouillage du compte
LOGIN_WINDOW_SEC = 900     # fenêtre glissante (15 min)
LOCKOUT_SEC = 900          # durée du verrouillage (15 min)
RATE_WINDOW_SEC = 60       # fenêtre du rate-limit par IP
RATE_MAX_REQUESTS = 30     # requêtes sensibles max / fenêtre / IP

# --- CORS ---
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174"
).split(",")

# --- Gemini ---
GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
GEMINI_LIVE_MODEL = os.environ.get("GEMINI_LIVE_MODEL", "gemini-3.1-flash-live-preview")
GEMINI_TEXT_MODEL = os.environ.get("GEMINI_TEXT_MODEL", "gemini-flash-latest")
