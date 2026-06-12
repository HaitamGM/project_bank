"""Accès aux données (clients, users, transactions, décisions) + journal d'audit.

Les opérations effectuées dans le site (crédits évalués, virements exécutés, débits de
solde) sont désormais PERSISTÉES dans les fichiers data/ (decisions.json, transactions.json,
clients.json). Elles survivent donc au redémarrage et apparaissent partout (Accueil, Audit,
Profil…), de façon cohérente. Pour revenir à l'état d'usine : `python scripts/generate_data.py`.
"""
import json
import threading
import time
from collections import defaultdict

from . import config, security

# Réentrant : apply_debit/add_* tiennent le verrou puis appellent save_json (qui le reprend).
_lock = threading.RLock()

# Overlays de session (réinitialisés au redémarrage)
_session_tx: dict[str, list] = defaultdict(list)
_session_decisions: dict[str, list] = defaultdict(list)
_session_solde: dict[tuple, float] = defaultdict(float)  # (clientId, rib) -> delta (débits cumulés)
_audit: list[dict] = []


def load_json(name: str):
    with open(config.DATA_DIR / name, encoding="utf-8") as f:
        return json.load(f)


def save_json(name: str, data) -> None:
    with _lock:
        with open(config.DATA_DIR / name, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


def _persist_prepend(filename: str, client_id: str, item: dict) -> None:
    """Ajoute `item` en tête de data/<filename> pour ce client et persiste.
    Gère le format dict (clé = clientId) ET le format tableau plat (champ clientId)."""
    with _lock:
        try:
            data = load_json(filename)
        except FileNotFoundError:
            data = {}
        if isinstance(data, list):
            data.insert(0, {**item, "clientId": client_id})
        else:
            if not isinstance(data, dict):
                data = {}
            data.setdefault(client_id, []).insert(0, item)
        save_json(filename, data)


# ───────────────────────── Clients ─────────────────────────

def get_clients() -> list:
    try:
        return load_json("clients.json")
    except FileNotFoundError:
        return []


def get_client_by_id(client_id: str):
    return next((c for c in get_clients() if c["id"] == client_id), None)


def add_beneficiary(client_id: str, benef: dict) -> dict | None:
    """Ajoute un bénéficiaire dans data/clients.json (bancaire.beneficiaires), persisté.
    Retourne le bénéficiaire ajouté, ou None s'il existe déjà (même RIB ou même nom)."""
    nom_l = (benef.get("nom") or "").strip().lower()
    rib = (benef.get("rib") or "").strip()
    with _lock:
        clients = get_clients()
        for c in clients:
            if c.get("id") != client_id:
                continue
            benefs = c.setdefault("bancaire", {}).setdefault("beneficiaires", [])
            for b in benefs:
                if (rib and b.get("rib") == rib) or (b.get("nom") or "").strip().lower() == nom_l:
                    return None  # doublon
            benefs.append(benef)
            save_json("clients.json", clients)
            return benef
    return None


def public_client(client: dict) -> dict:
    """Sous-ensemble sûr pour l'écran de connexion (jamais de données sensibles)."""
    p = client.get("personnel", {})
    banc = client.get("bancaire", {})
    return {
        "id": client["id"],
        "prenom": p.get("prenom", ""),
        "nom": p.get("nom", ""),
        "segment": banc.get("segment", ""),
        "photo": client.get("photo"),
    }


# ───────────────────────── Users (auth) ─────────────────────────

def get_users() -> list:
    try:
        return load_json("users.json")
    except FileNotFoundError:
        return []


def get_user_by_email(email: str):
    email = (email or "").strip().lower()
    return next((u for u in get_users() if u["email"].lower() == email), None)


def get_user_by_client_id(client_id: str):
    return next((u for u in get_users() if u.get("clientId") == client_id), None)


def ensure_users_seeded() -> None:
    """Crée data/users.json au premier démarrage : un compte par client,
    même mot de passe de démo haché en bcrypt."""
    if (config.DATA_DIR / "users.json").exists():
        return
    users = []
    for c in get_clients():
        email = c.get("personnel", {}).get("email", "").strip().lower()
        if not email:
            continue
        users.append({
            "clientId": c["id"],
            "email": email,
            "passwordHash": security.hash_password(config.DEMO_PASSWORD),
            "role": "client",
        })
    save_json("users.json", users)
    print(f"[seed] {len(users)} comptes créés dans data/users.json (mot de passe démo : {config.DEMO_PASSWORD})")


# ───────────────────────── Transactions ─────────────────────────

def get_transactions(client_id: str) -> list:
    try:
        base = load_json("transactions.json").get(client_id, [])
    except FileNotFoundError:
        base = []
    return _session_tx[client_id] + base


def add_transaction(client_id: str, tx: dict) -> None:
    """Persiste la transaction dans data/transactions.json (en tête de la liste du client)."""
    _persist_prepend("transactions.json", client_id, tx)


# ───────────────────────── Soldes (overlay de session) ─────────────────────────

def get_solde_effectif(client_id: str, rib: str, solde_seed: float) -> float:
    """Solde réel du compte. Comme les débits sont persistés dans clients.json,
    `solde_seed` (lu depuis clients.json) est déjà à jour ; on l'utilise tel quel."""
    return solde_seed


def apply_debit(client_id: str, rib: str, montant: float) -> None:
    """Débite réellement le compte source dans data/clients.json (persisté)."""
    with _lock:
        clients = get_clients()
        for c in clients:
            if c.get("id") != client_id:
                continue
            for cpt in c.get("bancaire", {}).get("comptes", []):
                if cpt.get("rib") == rib:
                    cpt["solde"] = round(cpt.get("solde", 0) - abs(montant), 2)
                    save_json("clients.json", clients)
                    return


def get_today_outgoing(client_id: str) -> float:
    """Cumul des virements sortants exécutés aujourd'hui (depuis les transactions persistées)."""
    today = time.strftime("%Y-%m-%d")
    return sum(-t["montant"] for t in get_transactions(client_id)
               if t.get("date") == today and t.get("montant", 0) < 0)


# ───────────────────────── Décisions / historique ─────────────────────────

def get_decisions(client_id: str) -> list:
    """Supporte decisions.json en dict (clé = clientId) OU en tableau plat (champ clientId)."""
    try:
        raw = load_json("decisions.json")
    except FileNotFoundError:
        raw = []
    if isinstance(raw, dict):
        base = raw.get(client_id, [])
    else:
        base = [d for d in raw if d.get("clientId") == client_id]
    return _session_decisions[client_id] + base


def add_decision(client_id: str, decision: dict) -> None:
    """Persiste la décision dans data/decisions.json (en tête de la liste du client)."""
    _persist_prepend("decisions.json", client_id, decision)


# ───────────────────────── Explicabilité / pipeline / référentiel ─────────────────────────

def get_explainability(client_id: str) -> list:
    """Explications XAI des décisions du client (explainability.json filtré)."""
    try:
        raw = load_json("explainability.json")
    except FileNotFoundError:
        return []
    return [e for e in raw if e.get("clientId") == client_id]


def get_pipeline_runs(client_id: str) -> list:
    """Traces d'exécution du pipeline multi-agents pour le client (pipeline-runs.json filtré)."""
    try:
        raw = load_json("pipeline-runs.json")
    except FileNotFoundError:
        return []
    return [r for r in raw if r.get("clientId") == client_id]


def get_analytics() -> dict:
    """Indicateurs analytiques globaux (analytics.json)."""
    try:
        return load_json("analytics.json")
    except FileNotFoundError:
        return {}


def get_agents() -> list:
    try:
        return load_json("agents.json")
    except FileNotFoundError:
        return []


def get_documents() -> list:
    try:
        return load_json("documents.json")
    except FileNotFoundError:
        return []


# ───────────────────────── Conversations (assistant vocal/texte) ─────────────────────────

def get_conversations(client_id: str) -> list:
    """Historique des conversations du client avec l'assistant (conversations.json filtré)."""
    try:
        raw = load_json("conversations.json")
    except FileNotFoundError:
        return []
    if isinstance(raw, dict):
        return raw.get(client_id, [])
    return [c for c in raw if c.get("clientId") == client_id]


def add_conversation(client_id: str, convo: dict) -> None:
    """Persiste une conversation en tête de l'historique du client (data/conversations.json)."""
    _persist_prepend("conversations.json", client_id, convo)


# ───────────────────────── Audit ─────────────────────────

def audit(event_type: str, client_id: str | None = None, ip: str | None = None, **extra) -> None:
    _audit.append({
        "ts": time.strftime("%Y-%m-%d %H:%M:%S"),
        "type": event_type,
        "clientId": client_id,
        "ip": ip,
        **extra,
    })
    # Garde-fou mémoire
    if len(_audit) > 5000:
        del _audit[:1000]


def get_audit(client_id: str) -> list:
    return [e for e in reversed(_audit) if e.get("clientId") == client_id]
