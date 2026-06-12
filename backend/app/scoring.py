"""Moteur de décision crédit — port Python fidèle de frontend/src/services/scoring.js.
Source de vérité unique côté backend ; reproduit exactement les scores du Simulateur et de la page XAI.
"""
import math

TAUX_ANNUEL = 0.0485        # 4,85 % — taux nominal crédit immobilier
SEUIL_ACCEPTATION = 60


def mensualite(montant, duree_mois, taux_annuel=TAUX_ANNUEL):
    """Mensualité d'un crédit amortissable (annuités constantes)."""
    r = taux_annuel / 12
    if r == 0:
        return montant / duree_mois
    return (montant * r) / (1 - (1 + r) ** (-duree_mois))


def _clamp(v, lo, hi):
    return max(lo, min(hi, v))


def _jsround(x):
    """Arrondi identique à JavaScript Math.round (floor(x + 0.5)), pour une parité exacte avec scoring.js."""
    return math.floor(x + 0.5)


def score_credit(
    revenuMensuel,
    montant,
    dureeMois,
    autresCharges=0,
    ancienneteMois=36,
    incidentsPaiement=0,
    fichageBam=False,
):
    """Score de crédit explicable (0–100) + décision. Renvoie aussi le détail des contributions."""
    m = mensualite(montant, dureeMois)
    taux_endettement = (m + autresCharges) / revenuMensuel

    contributions = [{"label": "Score de base", "impact": 50, "kind": "base"}]
    score = 50

    # Taux d'endettement — poids dominant, plafond réglementaire à 40 %
    if taux_endettement <= 0.4:
        end_impact = _jsround(((0.4 - taux_endettement) / 0.4) * 38)
    else:
        end_impact = -_jsround(((taux_endettement - 0.4) / 0.2) * 45)
    end_impact = _clamp(end_impact, -45, 38)
    score += end_impact
    contributions.append({"label": f"Taux d'endettement {_jsround(taux_endettement * 100)} %", "impact": end_impact})

    # Revenu mensuel
    rev_impact = _clamp(_jsround((revenuMensuel - 8000) / 1500), -8, 12)
    score += rev_impact
    contributions.append({"label": f"Revenu {revenuMensuel:,.0f} DH".replace(",", " "), "impact": rev_impact})

    # Ancienneté professionnelle
    anc_impact = _clamp(_jsround((ancienneteMois - 12) / 6), -5, 8)
    score += anc_impact
    contributions.append({"label": f"Ancienneté {ancienneteMois} mois", "impact": anc_impact})

    # Incidents de paiement
    if incidentsPaiement > 0:
        inc_impact = -incidentsPaiement * 9
        score += inc_impact
        contributions.append({"label": f"{incidentsPaiement} incident(s) de paiement", "impact": inc_impact})

    # Fichage Bank Al-Maghrib
    bam_impact = -35 if fichageBam else 6
    score += bam_impact
    contributions.append({"label": "Fiché Bank Al-Maghrib" if fichageBam else "Historique BAM sain", "impact": bam_impact})

    score = _clamp(_jsround(score), 0, 100)

    return {
        "score": score,
        "seuil": SEUIL_ACCEPTATION,
        "decision": "approuve" if score >= SEUIL_ACCEPTATION else "refuse",
        "mensualite": _jsround(m),
        "tauxEndettement": taux_endettement,
        "tauxAnnuel": TAUX_ANNUEL,
        "coutTotal": _jsround(m * dureeMois),
        "contributions": contributions,
    }
