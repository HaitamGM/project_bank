"""Routeur des opérations : déclenche la pipeline de vérification crédit/virement,
signe les virements par OTP, et expose le journal d'audit du client connecté.
"""
import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Request, status

from . import config, data_store, pipeline, security
from .schemas import BeneficiaryRequest, CreditRequest, TransferConfirmRequest, TransferRequest

router = APIRouter(prefix="/api", tags=["pipeline"])


def _require_client(client_id: str):
    client = data_store.get_client_by_id(client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client introuvable.")
    return client


def _ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.post("/pipeline/credit")
def pipeline_credit(body: CreditRequest, request: Request, client_id: str = Depends(security.get_current_client_id)):
    if security.rate_limited(f"pipe:{client_id}"):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Trop de demandes. Patientez.")
    client = _require_client(client_id)

    result = pipeline.run_credit_pipeline(
        client, body.montant, body.dureeMois, body.objet, body.autresCharges
    )

    decision = {
        "id": "D-" + secrets.token_hex(3).upper(),
        "clientId": client_id,
        "date": time.strftime("%Y-%m-%d %H:%M"),
        "intent": f"Crédit {body.objet}",
        "type": f"credit_{body.objet}",
        "montant": body.montant,
        "dureeMois": body.dureeMois,
        "statut": result["decision"],
        "score": result["score"],
        "explication": result["explication"],
    }
    data_store.add_decision(client_id, decision)
    data_store.audit("pipeline_credit", client_id=client_id, ip=_ip(request),
                     montant=body.montant, decision=result["decision"], score=result["score"])
    result["decisionId"] = decision["id"]
    return result


@router.post("/pipeline/transfer")
def pipeline_transfer(body: TransferRequest, request: Request, client_id: str = Depends(security.get_current_client_id)):
    if security.rate_limited(f"pipe:{client_id}"):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Trop de demandes. Patientez.")
    client = _require_client(client_id)

    # RÈGLE MÉTIER : un virement n'est possible que vers un bénéficiaire ENREGISTRÉ.
    # S'il ne l'est pas : si le RIB est fourni, on l'enregistre automatiquement ; sinon on refuse.
    nom_l = body.beneficiaire.strip().lower()
    benefs = client.get("bancaire", {}).get("beneficiaires", [])
    known = any((b.get("nom") or "").strip().lower() == nom_l for b in benefs)
    if not known:
        if body.ribBeneficiaire:
            data_store.add_beneficiary(client_id, {
                "nom": body.beneficiaire.strip(),
                "banque": (body.banqueBeneficiaire or "").strip(),
                "rib": body.ribBeneficiaire.strip(),
            })
            data_store.audit("beneficiary_auto_added", client_id=client_id, ip=_ip(request),
                             beneficiaire=body.beneficiaire)
            client = _require_client(client_id)  # recharge avec le nouveau bénéficiaire
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Bénéficiaire non enregistré. Renseignez son RIB et sa banque pour l'ajouter avant le virement.",
            )

    result = pipeline.run_transfer_pipeline(client, body.montant, body.beneficiaire, body.compteSource)
    data_store.audit("pipeline_transfer", client_id=client_id, ip=_ip(request),
                     montant=body.montant, beneficiaire=body.beneficiaire, decision=result["decision"])

    if result.get("requiresOtp"):
        # Virement autorisé : on génère un défi OTP de signature (le virement n'est PAS encore exécuté).
        challenge_id, otp = security.create_transfer_challenge(client_id, {
            "montant": body.montant,
            "beneficiaire": body.beneficiaire,
            "compteSource": result["compteSource"],
            "compteSourceType": result["compteSourceType"],
        })
        result["challengeId"] = challenge_id
        result["otpExpiresIn"] = config.OTP_TTL_SEC
        print(f"[OTP virement] {body.beneficiaire} {body.montant} DH -> code : {otp}")
        if config.DEMO_MODE:
            result["devOtp"] = otp
    return result


@router.post("/pipeline/transfer/confirm")
def pipeline_transfer_confirm(body: TransferConfirmRequest, request: Request, client_id: str = Depends(security.get_current_client_id)):
    if security.rate_limited(f"otp:{client_id}"):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Trop de tentatives. Patientez.")

    transfer, reason = security.verify_transfer_challenge(client_id, body.challengeId, body.otp)
    if transfer is None:
        data_store.audit("transfer_otp_failure", client_id=client_id, ip=_ip(request), reason=reason)
        messages = {
            "challenge_invalide": "Session de virement invalide.",
            "expire": "Code expiré, relancez le virement.",
            "trop_d_essais": "Trop d'essais, relancez le virement.",
            "otp_incorrect": "Code OTP incorrect.",
        }
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=messages.get(reason, "Vérification échouée."))

    # Re-contrôle du solde au MOMENT de l'exécution (ferme le TOCTOU entre /transfer et /confirm),
    # puis débit atomique du compte source.
    montant = transfer["montant"]
    rib = transfer.get("compteSource")
    client = data_store.get_client_by_id(client_id)
    source = next((c for c in (client or {}).get("bancaire", {}).get("comptes", []) if c["rib"] == rib), None)
    solde_seed = source.get("solde", 0) if source else 0
    solde_effectif = data_store.get_solde_effectif(client_id, rib, solde_seed) if rib else 0
    if source is None or solde_effectif < montant:
        data_store.audit("transfer_insufficient_funds", client_id=client_id, ip=_ip(request), montant=montant)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Solde insuffisant au moment de l'exécution.")
    data_store.apply_debit(client_id, rib, montant)

    # Exécution : on enregistre l'opération (overlay de session) et l'historique.
    tx = {
        "id": "VIR-" + secrets.token_hex(3).upper(),
        "date": time.strftime("%Y-%m-%d"),
        "libelle": f"Virement émis — {transfer['beneficiaire']}",
        "montant": -abs(transfer["montant"]),
    }
    data_store.add_transaction(client_id, tx)
    decision = {
        "id": "D-" + secrets.token_hex(3).upper(),
        "clientId": client_id,
        "date": time.strftime("%Y-%m-%d %H:%M"),
        "intent": "Virement",
        "type": "virement",
        "montant": transfer["montant"],
        "statut": "execute",
        "explication": f"Virement de {round(transfer['montant'])} DH vers {transfer['beneficiaire']} signé par OTP et exécuté.",
    }
    data_store.add_decision(client_id, decision)
    data_store.audit("transfer_executed", client_id=client_id, ip=_ip(request),
                     montant=transfer["montant"], beneficiaire=transfer["beneficiaire"])

    return {
        "status": "execute",
        "reference": tx["id"],
        "montant": transfer["montant"],
        "beneficiaire": transfer["beneficiaire"],
        "transaction": tx,
        "message": "Virement exécuté avec succès.",
    }


@router.post("/clients/me/beneficiaries", status_code=status.HTTP_201_CREATED)
def add_beneficiary(body: BeneficiaryRequest, request: Request, client_id: str = Depends(security.get_current_client_id)):
    """Enregistre un nouveau bénéficiaire pour le client connecté (persisté dans clients.json)."""
    if security.rate_limited(f"benef:{client_id}"):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Trop de demandes. Patientez.")
    _require_client(client_id)
    benef = {
        "nom": body.nom.strip(),
        "banque": body.banque.strip(),
        # Un RIB est requis comme clé d'affichage : on en génère un si absent.
        "rib": body.rib.strip() or ("BEN-" + secrets.token_hex(4).upper()),
    }
    added = data_store.add_beneficiary(client_id, benef)
    if added is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ce bénéficiaire est déjà enregistré.")
    data_store.audit("beneficiary_added", client_id=client_id, ip=_ip(request), beneficiaire=benef["nom"])
    return added


@router.get("/audit/me")
def audit_me(client_id: str = Depends(security.get_current_client_id)):
    return data_store.get_audit(client_id)
