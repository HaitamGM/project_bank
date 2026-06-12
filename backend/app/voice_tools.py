"""Outils (function calling) de l'assistant vocal.

Relient la voix à la VRAIE pipeline de vérification : quand le client demande un
crédit ou un virement à l'oral, Gemini Live appelle l'un de ces outils, qui exécute
exactement les mêmes agents que la page Opérations, persiste la décision et l'audit,
puis renvoie deux choses :
  - une réponse structurée *pour le modèle* (qu'il lira à voix haute, sans rien inventer) ;
  - un événement *pour l'UI* (full pipeline + décision) afin d'animer les agents en direct.
"""
import asyncio
import secrets
import time

from . import config, data_store, pipeline, security

# ───────────────────────── Déclarations exposées à Gemini Live ─────────────────────────

TOOL_DECLARATIONS = [
    {
        "function_declarations": [
            {
                "name": "evaluer_credit",
                "description": (
                    "Lance la pipeline de vérification d'une demande de crédit "
                    "(KYC, capacité de remboursement, anti-fraude Bank Al-Maghrib, scoring, décision). "
                    "À appeler dès que le montant et la durée sont connus."
                ),
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "montant": {"type": "NUMBER", "description": "Montant demandé en dirhams (MAD)."},
                        "duree_mois": {"type": "INTEGER", "description": "Durée de remboursement en mois."},
                        "objet": {
                            "type": "STRING",
                            "description": "Objet du crédit : immobilier, consommation, auto ou travaux.",
                        },
                    },
                    "required": ["montant", "duree_mois"],
                },
            },
            {
                "name": "preparer_virement",
                "description": (
                    "Lance la pipeline de vérification d'un virement (KYC, provision, plafonds, anti-fraude). "
                    "Si le virement est autorisé, un code OTP de signature à 6 chiffres est généré."
                ),
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "montant": {"type": "NUMBER", "description": "Montant à virer en dirhams (MAD)."},
                        "beneficiaire": {"type": "STRING", "description": "Nom du bénéficiaire."},
                        "rib": {"type": "STRING", "description": "RIB ou IBAN du bénéficiaire. OBLIGATOIRE si le bénéficiaire n'est pas déjà enregistré."},
                        "banque": {"type": "STRING", "description": "Banque du bénéficiaire (utile si nouveau bénéficiaire)."},
                    },
                    "required": ["montant", "beneficiaire"],
                },
            },
            {
                "name": "confirmer_virement",
                "description": (
                    "Signe et exécute le virement préparé juste avant, avec le code OTP à 6 chiffres "
                    "dicté par le client."
                ),
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "otp": {"type": "STRING", "description": "Code OTP à 6 chiffres."},
                    },
                    "required": ["otp"],
                },
            },
            {
                "name": "consulter_comptes",
                "description": "Renvoie les soldes des comptes du client (courant, épargne) et le solde total.",
                "parameters": {"type": "OBJECT", "properties": {}},
            },
        ]
    }
]


def prompt_section() -> str:
    """Instructions ajoutées au prompt système pour forcer l'usage des outils."""
    return """

OUTILS (function calling) — RÈGLE ABSOLUE :
- Tu disposes d'outils qui exécutent la VRAIE pipeline bancaire. Tu DOIS les appeler ; ne simule JAMAIS un résultat, n'invente JAMAIS un score, un solde, une mensualité ni une décision.
- CRÉDIT : dès que tu connais le montant et la durée, dis une courte phrase ("Je lance la vérification…") puis appelle evaluer_credit. Ensuite, explique la décision UNIQUEMENT à partir du résultat renvoyé (decision, score, taux d'endettement, mensualité).
- VIREMENT : un virement n'est possible que vers un bénéficiaire ENREGISTRÉ. Dès que tu connais le montant et le bénéficiaire, appelle preparer_virement. Si l'outil répond « besoin_donnees_beneficiaire », c'est un nouveau bénéficiaire : demande au client son RIB (ou IBAN) et le nom de sa banque, puis rappelle preparer_virement avec montant, beneficiaire, rib et banque (le système l'enregistre automatiquement). Si le résultat demande un OTP (requiert_otp = true), demande au client de lire à voix haute le code à 6 chiffres affiché à l'écran, puis appelle confirmer_virement avec ce code.
- SOLDE / COMPTES : appelle consulter_comptes.
- Si un paramètre manque (montant, durée, bénéficiaire), demande-le au client AVANT d'appeler l'outil.
"""


# ───────────────────────── Dispatch ─────────────────────────

async def handle(fc, client: dict, client_id: str, pending: dict):
    """Exécute un appel d'outil Gemini.

    Renvoie un tuple (reponse_modele: dict, evenement_ui: dict | None).
    `pending` est un état mutable propre à la session WebSocket (mémorise le challenge OTP).
    """
    name = getattr(fc, "name", None)
    args = dict(getattr(fc, "args", None) or {})
    try:
        if name == "evaluer_credit":
            return await _credit(args, client, client_id)
        if name == "preparer_virement":
            return await _prepare_transfer(args, client, client_id, pending)
        if name == "confirmer_virement":
            return await _confirm_transfer(args, client, client_id, pending)
        if name == "consulter_comptes":
            return _comptes(client)
    except Exception as e:  # noqa: BLE001 — l'erreur est remontée au modèle, pas de crash de session
        print(f"[voice_tools] erreur outil {name} : {e}")
        return {"erreur": f"Erreur interne lors de l'exécution de {name}."}, None
    return {"erreur": f"Outil inconnu : {name}."}, None


# ───────────────────────── Crédit ─────────────────────────

async def _credit(args, client, client_id):
    montant = float(args.get("montant") or 0)
    duree = int(args.get("duree_mois") or 0)
    objet = (args.get("objet") or "immobilier").strip() or "immobilier"
    if montant <= 0 or duree <= 0:
        return {"erreur": "Le montant et la durée (en mois) sont requis."}, None

    # use_ai=False : l'assistant vocal verbalisera lui-même l'explication, on garde la pipeline rapide.
    result = await asyncio.to_thread(
        pipeline.run_credit_pipeline, client, montant, duree, objet, 0, False
    )

    decision = {
        "id": "D-" + secrets.token_hex(3).upper(),
        "clientId": client_id,
        "date": time.strftime("%Y-%m-%d %H:%M"),
        "intent": f"Crédit {objet} (vocal)",
        "type": f"credit_{objet}",
        "montant": montant,
        "dureeMois": duree,
        "statut": result["decision"],
        "score": result["score"],
        "explication": result["explication"],
        "canal": "vocal",
    }
    data_store.add_decision(client_id, decision)
    data_store.audit("voice_credit", client_id=client_id, montant=montant,
                     decision=result["decision"], score=result["score"])
    result["decisionId"] = decision["id"]

    model_resp = {
        "decision": result["decision"],
        "score": result["score"],
        "seuil": result["seuil"],
        "mensualite": result["mensualite"],
        "taux_endettement_pourcent": round(result["tauxEndettement"] * 100),
        "cout_total": result["coutTotal"],
        "explication": result["explication"],
    }
    return model_resp, {"tool": "credit", "result": result}


# ───────────────────────── Virement ─────────────────────────

async def _prepare_transfer(args, client, client_id, pending):
    montant = float(args.get("montant") or 0)
    benef = (args.get("beneficiaire") or "").strip()
    rib = (args.get("rib") or "").strip()
    banque = (args.get("banque") or "").strip()
    if montant <= 0 or not benef:
        return {"erreur": "Le montant et le nom du bénéficiaire sont requis."}, None

    # RÈGLE MÉTIER : virement uniquement vers un bénéficiaire ENREGISTRÉ.
    # Si nouveau : il faut le RIB → on l'enregistre automatiquement avant de continuer.
    benefs = client.get("bancaire", {}).get("beneficiaires", [])
    known = any((b.get("nom") or "").strip().lower() == benef.lower() for b in benefs)
    if not known:
        if not rib:
            return {
                "besoin_donnees_beneficiaire": True,
                "message": (f"{benef} n'est pas un bénéficiaire enregistré. Demande au client son RIB "
                            "(ou IBAN) et le nom de sa banque, puis rappelle preparer_virement avec "
                            "montant, beneficiaire, rib et banque."),
            }, None
        data_store.add_beneficiary(client_id, {"nom": benef, "banque": banque, "rib": rib})
        data_store.audit("beneficiary_auto_added", client_id=client_id, beneficiaire=benef, canal="vocal")
        client = data_store.get_client_by_id(client_id) or client  # recharge avec le nouveau bénéficiaire

    result = await asyncio.to_thread(pipeline.run_transfer_pipeline, client, montant, benef, None)
    data_store.audit("voice_transfer", client_id=client_id, montant=montant,
                     beneficiaire=benef, decision=result["decision"])

    ui = {"tool": "transfer", "result": result}

    if result.get("requiresOtp"):
        challenge_id, otp = security.create_transfer_challenge(client_id, {
            "montant": montant,
            "beneficiaire": benef,
            "compteSource": result["compteSource"],
            "compteSourceType": result["compteSourceType"],
        })
        pending["transfer"] = challenge_id
        result["challengeId"] = challenge_id
        model_resp = {
            "decision": "approuve",
            "requiert_otp": True,
            "montant": montant,
            "beneficiaire": benef,
            "beneficiaire_connu": result["beneficiaireConnu"],
            "instruction": ("Virement autorisé. Demande au client de lire le code OTP à 6 chiffres "
                            "affiché à l'écran, puis appelle confirmer_virement avec ce code."),
        }
        if config.DEMO_MODE:
            result["devOtp"] = otp
            ui["devOtp"] = otp
            print(f"[OTP virement vocal] {benef} {montant} DH -> code : {otp}")
    else:
        model_resp = {
            "decision": "refuse",
            "motif": result.get("motifRefus") or "Contrôles non satisfaits.",
            "montant": montant,
            "beneficiaire": benef,
        }
    return model_resp, ui


async def _confirm_transfer(args, client, client_id, pending):
    otp = str(args.get("otp") or "").replace(" ", "")
    challenge_id = pending.get("transfer")
    if not challenge_id:
        return {"erreur": "Aucun virement n'est en attente de signature."}, None

    transfer, reason = security.verify_transfer_challenge(client_id, challenge_id, otp)
    if transfer is None:
        data_store.audit("voice_transfer_otp_failure", client_id=client_id, reason=reason)
        return {"statut": "echec", "raison": reason}, {"tool": "transfer_otp", "ok": False, "reason": reason}

    pending["transfer"] = None
    tx = {
        "id": "VIR-" + secrets.token_hex(3).upper(),
        "date": time.strftime("%Y-%m-%d"),
        "libelle": f"Virement émis — {transfer['beneficiaire']}",
        "montant": -abs(transfer["montant"]),
    }
    data_store.add_transaction(client_id, tx)
    data_store.apply_debit(client_id, transfer.get("compteSource"), transfer["montant"])
    decision = {
        "id": "D-" + secrets.token_hex(3).upper(),
        "clientId": client_id,
        "date": time.strftime("%Y-%m-%d %H:%M"),
        "intent": "Virement (vocal)",
        "type": "virement",
        "montant": transfer["montant"],
        "statut": "execute",
        "explication": (f"Virement de {round(transfer['montant'])} DH vers "
                        f"{transfer['beneficiaire']} signé par OTP (vocal) et exécuté."),
        "canal": "vocal",
    }
    data_store.add_decision(client_id, decision)
    data_store.audit("voice_transfer_executed", client_id=client_id,
                     montant=transfer["montant"], beneficiaire=transfer["beneficiaire"])

    model_resp = {
        "statut": "execute",
        "reference": tx["id"],
        "montant": transfer["montant"],
        "beneficiaire": transfer["beneficiaire"],
    }
    ui = {
        "tool": "transfer_executed",
        "reference": tx["id"],
        "montant": transfer["montant"],
        "beneficiaire": transfer["beneficiaire"],
        "transaction": tx,
    }
    return model_resp, ui


# ───────────────────────── Comptes / solde ─────────────────────────

def _comptes(client):
    comptes = client.get("bancaire", {}).get("comptes", [])
    liste = [
        {"type": c.get("type"), "intitule": c.get("intitule"),
         "solde": c.get("solde"), "devise": c.get("devise", "MAD")}
        for c in comptes
    ]
    total = round(sum(c.get("solde", 0) for c in comptes), 2)
    return ({"comptes": liste, "solde_total": total},
            {"tool": "comptes", "comptes": liste, "soldeTotal": total})
