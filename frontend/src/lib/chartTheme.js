// Palette + réglages partagés pour les graphiques recharts.
// Couleurs choisies pour rester lisibles en thème clair ET sombre.

export const CHART = {
  primary: '#4f46e5', // indigo-600
  primarySoft: 'rgba(79,70,229,0.18)',
  rose: '#f43f5e',
  roseSoft: 'rgba(244,63,94,0.18)',
  amber: '#f59e0b',
  sky: '#0ea5e9',
  teal: '#14b8a6',
  violet: '#8b5cf6',
  slate: '#94a3b8',
  grid: 'rgba(148,163,184,0.2)',
  axis: '#94a3b8',
}

// Palette ordonnée pour les séries multiples (camemberts, etc.).
export const CHART_SERIES = [CHART.primary, CHART.sky, CHART.amber, CHART.violet, CHART.rose, CHART.teal]

// Réglages communs des axes (tick lisible sur clair/sombre, pas de ligne d'axe).
export const AXIS_PROPS = {
  tick: { fill: CHART.axis, fontSize: 11 },
  tickLine: false,
  axisLine: false,
}
