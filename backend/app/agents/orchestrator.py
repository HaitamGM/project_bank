"""Orchestrateur multi-agents.

Construit le contexte, exécute la chaîne d'agents dans l'ordre, puis agrège la trace
et la décision. Les fonctions publiques ont EXACTEMENT la même signature et la même
forme de sortie que l'ancien `pipeline.py` → remplacement transparent (drop-in).
"""
from ..scoring import SEUIL_ACCEPTATION, TAUX_ANNUEL
from .context import CreditContext, TransferContext
from .credit_agents import CREDIT_AGENTS
from .transfer_agents import TRANSFER_AGENTS


# ───────────────────────────── Crédit ─────────────────────────────

def _init_credit(ctx: CreditContext):
    prof = ctx.client.get("professionnel", {})
    banc = ctx.client.get("bancaire", {})
    risque = ctx.client.get("risque", {})
    ctx.revenu = prof.get("revenuMensuel", 0)
    ctx.charges_actuelles = banc.get("chargesMensuelles", round(risque.get("tauxEndettement", 0) * ctx.revenu))
    ctx.incidents = risque.get("incidentsPaiement", 0)
    ctx.bam = bool(risque.get("fichageBam", False))


def run_credit_pipeline(client, montant, duree_mois, objet="immobilier", autres_charges_demande=0, use_ai=True):
    ctx = CreditContext(client=client, montant=montant, duree_mois=duree_mois, objet=objet,
                        autres_charges_demande=autres_charges_demande, use_ai=use_ai)
    _init_credit(ctx)
    for agent in CREDIT_AGENTS:
        agent.run(ctx)
    return {
        "type": "credit",
        "decision": "approuve" if ctx.approved else "refuse",
        "score": ctx.result["score"],
        "seuil": SEUIL_ACCEPTATION,
        "mensualite": round(ctx.mensualite),
        "tauxEndettement": round(ctx.taux_endettement, 4),
        "tauxAnnuel": TAUX_ANNUEL,
        "coutTotal": round(ctx.mensualite * ctx.duree_mois),
        "contributions": ctx.result["contributions"],
        "explication": ctx.explication,
        "montant": montant,
        "dureeMois": duree_mois,
        "objet": objet,
        "steps": ctx.steps,
    }


# ───────────────────────────── Virement ─────────────────────────────

def run_transfer_pipeline(client, montant, beneficiaire, compte_source_rib=None, use_ai=True):
    ctx = TransferContext(client=client, montant=montant, beneficiaire=beneficiaire,
                          compte_source_rib=compte_source_rib, use_ai=use_ai)
    for agent in TRANSFER_AGENTS:
        agent.run(ctx)
    return {
        "type": "transfer",
        "decision": "approuve" if ctx.approved else "refuse",
        "requiresOtp": ctx.approved,
        "montant": montant,
        "beneficiaire": beneficiaire,
        "beneficiaireConnu": ctx.known,
        "compteSource": ctx.source.get("rib") if ctx.source else None,
        "compteSourceType": ctx.source.get("type") if ctx.source else None,
        "soldeAvant": ctx.solde,
        "motifRefus": ctx.motif,
        "steps": ctx.steps,
    }
