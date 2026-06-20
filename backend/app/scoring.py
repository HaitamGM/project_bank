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


def montant_max_eligible(revenu, charges, duree_mois):
    """Plus grand montant gardant l'endettement ≤ 40 % (pour le contrefactuel)."""
    mens_dispo = 0.40 * revenu - charges
    if mens_dispo <= 0:
        return 0
    r = TAUX_ANNUEL / 12
    montant = mens_dispo * (1 - (1 + r) ** (-duree_mois)) / r
    return max(0, _jsround(montant / 1000) * 1000)


def generate_xai(decision_id, client_id, ev, revenu, charges, duree_mois, anc, incidents, fichage, contrat):
    """Construit l'objet XAI à partir du résultat du scoring pour la page Centre d'explicabilité."""
    taux = ev["tauxEndettement"]
    facteurs = [
        {"nom": "Taux d'endettement après crédit", "valeur": f"{_jsround(taux * 100)}%", "seuil": "40%", "poids": 0.35,
         "impact": "négatif" if taux > 0.40 else "positif"},
        {"nom": "Fichage Bank Al-Maghrib", "valeur": "Oui" if fichage else "Non", "poids": 0.25,
         "impact": "négatif" if fichage else "positif"},
        {"nom": "Incidents de paiement (12 mois)", "valeur": incidents, "poids": 0.20,
         "impact": "négatif" if incidents > 0 else "positif"},
        {"nom": "Ancienneté professionnelle", "valeur": f"{anc} mois", "poids": 0.10,
         "impact": "positif" if anc >= 24 else "neutre"},
        {"nom": "Type de contrat", "valeur": contrat, "poids": 0.10,
         "impact": "positif" if contrat in ("CDI", "Titulaire") else "neutre"},
    ]
    cf = None
    if ev["decision"] == "refuse":
        if fichage:
            cf = "La régularisation auprès de Bank Al-Maghrib est requise avant toute nouvelle demande."
        elif taux > 0.40:
            cf = f"Un montant réduit à environ {montant_max_eligible(revenu, charges, duree_mois):,} MAD respecterait le seuil de 40 %.".replace(",", " ")
        elif incidents > 1:
            cf = "Une réduction des incidents de paiement améliorerait l'éligibilité."
        else:
            cf = f"Un score d'au moins {SEUIL_ACCEPTATION} est requis."

    return {
        "decisionId": decision_id,
        "clientId": client_id,
        "scoreFinal": ev["score"],
        "statut": ev["decision"],
        "scoreBase": 50,
        "seuil": SEUIL_ACCEPTATION,
        "facteurs": facteurs,
        "contributions": ev.get("contributions", []),
        "contrefactuel": cf,
        "reglesActivees": [
            {"regle": "Taux d'endettement <= 40%", "respectee": taux <= 0.40},
            {"regle": "Absence de fichage BAM", "respectee": not fichage},
            {"regle": f"Score minimum de {SEUIL_ACCEPTATION}/100", "respectee": ev["score"] >= SEUIL_ACCEPTATION}
        ]
    }


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
