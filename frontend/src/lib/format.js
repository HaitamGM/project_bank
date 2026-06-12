// Format monétaire marocain partagé.
export const fmt = (n) => Math.round(n ?? 0).toLocaleString('fr-MA')
