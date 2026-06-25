// ⚠️ TEMPORAIRE — moteur de décision transparent côté front.
// Sert de source de vérité unique pour le Simulateur, et corrobore le récit de la page Explicabilité (XAI).
// Remplacera l'appel au backend de scoring le moment venu.

export const TAUX_ANNUEL = 0.0485 // 4,85 % — taux nominal crédit immobilier
export const SEUIL_ACCEPTATION = 60

/** Mensualité d'un crédit amortissable (formule des annuités constantes). */
export function mensualite(montant, dureeMois, tauxAnnuel = TAUX_ANNUEL) {
  const r = tauxAnnuel / 12
  if (r === 0) return montant / dureeMois
  return (montant * r) / (1 - Math.pow(1 + r, -dureeMois))
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

/**
 * Score de crédit explicable (0–100) + décision.
 * Retourne le détail des contributions pour alimenter un graphe « waterfall ».
 */
export function scoreCredit({
  revenuMensuel,
  montant,
  dureeMois,
  autresCharges = 0,
  ancienneteMois = 36,
  incidentsPaiement = 0,
  fichageBam = false,
}) {
  const m = mensualite(montant, dureeMois)
  const tauxEndettement = (m + autresCharges) / revenuMensuel

  const contributions = [{ label: 'Score de base', impact: 50, kind: 'base' }]
  let score = 50

  // Taux d'endettement — poids dominant, plafond réglementaire à 40 %
  let endImpact
  if (tauxEndettement <= 0.4) endImpact = Math.round(((0.4 - tauxEndettement) / 0.4) * 38)
  else endImpact = -Math.round(((tauxEndettement - 0.4) / 0.2) * 45)
  endImpact = clamp(endImpact, -45, 38)
  score += endImpact
  contributions.push({ label: `Taux d'endettement ${(tauxEndettement * 100).toFixed(0)} %`, impact: endImpact })

  // Revenu mensuel
  const revImpact = clamp(Math.round((revenuMensuel - 8000) / 1500), -8, 12)
  score += revImpact
  contributions.push({ label: `Revenu ${revenuMensuel.toLocaleString('fr-MA')} DH`, impact: revImpact })

  // Ancienneté professionnelle (CDI)
  const ancImpact = clamp(Math.round((ancienneteMois - 12) / 6), -5, 8)
  score += ancImpact
  contributions.push({ label: `Ancienneté ${ancienneteMois} mois`, impact: ancImpact })

  // Incidents de paiement
  const incImpact = -incidentsPaiement * 9
  if (incidentsPaiement > 0) {
    score += incImpact
    contributions.push({ label: `${incidentsPaiement} incident(s) de paiement`, impact: incImpact })
  }

  // Fichage Bank Al-Maghrib
  const bamImpact = fichageBam ? -35 : 6
  score += bamImpact
  contributions.push({ label: fichageBam ? 'Fiché Bank Al-Maghrib' : 'Historique BAM sain', impact: bamImpact })

  score = clamp(Math.round(score), 0, 100)

  return {
    score,
    seuil: SEUIL_ACCEPTATION,
    decision: score >= SEUIL_ACCEPTATION ? 'approuve' : 'refuse',
    mensualite: Math.round(m),
    tauxEndettement,
    tauxAnnuel: TAUX_ANNUEL,
    coutTotal: Math.round(m * dureeMois),
    contributions,
  }
}

/** Cas de référence (la cliente Yasmina, crédit immo 600 000 DH) → score 78, approuvé. */
export const SIMULATEUR_DEFAUT = {
  revenuMensuel: 18000,
  montant: 600000,
  dureeMois: 240,
  autresCharges: 1100,
  ancienneteMois: 36,
  incidentsPaiement: 0,
  fichageBam: false,
}
