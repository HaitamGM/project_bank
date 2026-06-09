// ⚠️ TEMPORAIRE — imite ce que le backend renverra.
export const mockClient = {
  id: "CL-2024-0042",
  personnel: {
    prenom: "Yasmina", nom: "El Idrissi", cin: "BK123456",
    dateNaissance: "1996-03-15", telephone: "+212 661 23 45 67",
    email: "y.elidrissi@email.ma", ville: "Casablanca", situationFamiliale: "Célibataire",
  },
  professionnel: {
    profession: "Ingénieure informatique", employeur: "OCP SA", typeContrat: "CDI",
    ancienneteMois: 36, revenuMensuel: 18000, secteur: "Industrie",
  },
  bancaire: {
    clientDepuis: "2018-09-10", segment: "Premium", scoreInterne: 78,
    comptes: [
      { rib: "230 815 1234567890123456 78", type: "courant", solde: 45230.50, devise: "MAD" },
      { rib: "230 815 9876543210987654 32", type: "epargne", solde: 120000.00, devise: "MAD" },
    ],
  },
  risque: { incidentsPaiement: 0, fichageBam: false, tauxEndettement: 0.08 },
};

export const mockTransactions = [
  { id: "T1", date: "2026-06-05", libelle: "Virement reçu — Salaire OCP", montant: 18000 },
  { id: "T2", date: "2026-06-04", libelle: "Paiement carte — Marjane", montant: -842.30 },
  { id: "T3", date: "2026-06-03", libelle: "Retrait GAB — Maarif", montant: -2000 },
  { id: "T4", date: "2026-06-01", libelle: "Virement émis — Loyer", montant: -6500 },
];

export const mockDecisions = [
  { id: "D-001", date: "2026-06-05 14:32", intent: "Crédit immobilier", montant: 600000, statut: "approuve", explication: "Profil stable, taux d'endettement 28% sous le seuil de 40%." },
  { id: "D-002", date: "2026-06-03 10:15", intent: "Virement", montant: 5000, statut: "execute", explication: "Solde suffisant, bénéficiaire vérifié, virement exécuté." },
  { id: "D-003", date: "2026-05-28 16:45", intent: "Crédit consommation", montant: 200000, statut: "refuse", explication: "Taux d'endettement dépassé (52% > seuil 40%)." },
];

export const mockDocuments = [
  { id: "DOC-1", titre: "Politique crédit immobilier 2026", type: "Politique", chunks: 42, dateIndex: "2026-05-10" },
  { id: "DOC-2", titre: "Règlement Bank Al-Maghrib — Circulaire 1/G/2020", type: "Réglementation", chunks: 78, dateIndex: "2026-05-10" },
  { id: "DOC-3", titre: "Plafonds et conditions de virement", type: "Procédure", chunks: 23, dateIndex: "2026-05-11" },
  { id: "DOC-4", titre: "Conditions générales crédit consommation", type: "Politique", chunks: 35, dateIndex: "2026-05-12" },
  { id: "DOC-5", titre: "Procédure anti-fraude virements", type: "Sécurité", chunks: 19, dateIndex: "2026-05-12" },
];

// ─────────────────────────────────────────────────────────────
// Explicabilité (XAI) — radiographie de la décision phare D-001
// Base 50 + somme des contributions (= +28) → score 78, seuil 60 → approuvé.
// ─────────────────────────────────────────────────────────────
export const mockXai = {
  decisionId: "D-001",
  intent: "Crédit immobilier",
  montant: 600000,
  statut: "approuve",
  score: 78,
  seuil: 60,
  scoreBase: 50,
  confiance: 0.93,
  resume:
    "Décision favorable portée par un taux d'endettement maîtrisé (28 %) et un revenu stable, légèrement pénalisée par le montant élevé et le LTV de 80 %.",
  features: [
    { label: "Taux d'endettement 28 %", valeur: "28 %", impact: 11, direction: "positif" },
    { label: "Revenu mensuel", valeur: "18 000 DH", impact: 7, direction: "positif" },
    { label: "Historique BAM sain", valeur: "0 incident", impact: 6, direction: "positif" },
    { label: "Durée 20 ans", valeur: "240 mois", impact: 5, direction: "positif" },
    { label: "Ancienneté CDI", valeur: "36 mois", impact: 4, direction: "positif" },
    { label: "Montant élevé", valeur: "600 000 DH", impact: -2, direction: "negatif" },
    { label: "Quotité de financement (LTV)", valeur: "80 %", impact: -3, direction: "negatif" },
  ],
  counterfactuals: [
    { condition: "Si le taux d'endettement dépassait 40 %", scoreSimule: 52, resultat: "refuse" },
    { condition: "Si la cliente était fichée Bank Al-Maghrib", scoreSimule: 43, resultat: "refuse" },
    { condition: "Avec un apport de 30 % (LTV 70 %)", scoreSimule: 84, resultat: "approuve" },
    { condition: "Si l'ancienneté était inférieure à 12 mois", scoreSimule: 72, resultat: "approuve" },
  ],
  sources: [
    { docId: "DOC-1", titre: "Politique crédit immobilier 2026", extrait: "Le taux d'endettement maximal autorisé est de 40 % des revenus nets mensuels.", pertinence: 0.96 },
    { docId: "DOC-1", titre: "Politique crédit immobilier 2026", extrait: "La quotité de financement (LTV) ne peut excéder 80 % pour une résidence principale.", pertinence: 0.83 },
    { docId: "DOC-2", titre: "Circulaire BAM 1/G/2020", extrait: "Consultation obligatoire du fichier central des incidents de remboursement.", pertinence: 0.88 },
  ],
};

// ─────────────────────────────────────────────────────────────
// Tableau analytique — agrégats sur l'ensemble des décisions
// ─────────────────────────────────────────────────────────────
export const mockAnalytics = {
  kpis: {
    totalDecisions: 1284,
    tauxApprobation: 0.71,
    montantOctroye: 48200000,
    delaiMoyenSec: 3.4,
    scoreMoyen: 68,
  },
  parMois: [
    { mois: "Jan", approuve: 142, refuse: 58 },
    { mois: "Fév", approuve: 156, refuse: 61 },
    { mois: "Mar", approuve: 168, refuse: 54 },
    { mois: "Avr", approuve: 175, refuse: 70 },
    { mois: "Mai", approuve: 188, refuse: 66 },
    { mois: "Juin", approuve: 197, refuse: 72 },
  ],
  parType: [
    { type: "Crédit immobilier", count: 412, montant: 31200000 },
    { type: "Crédit consommation", count: 386, montant: 9800000 },
    { type: "Virement", count: 486, montant: 7200000 },
  ],
  scoreDistribution: [
    { bucket: "0–20", count: 38 },
    { bucket: "20–40", count: 96 },
    { bucket: "40–60", count: 241 },
    { bucket: "60–80", count: 532 },
    { bucket: "80–100", count: 377 },
  ],
  motifsRefus: [
    { motif: "Taux d'endettement > 40 %", count: 168 },
    { motif: "Fichage Bank Al-Maghrib", count: 92 },
    { motif: "Ancienneté insuffisante", count: 61 },
    { motif: "Incidents de paiement", count: 44 },
    { motif: "Pièces incomplètes", count: 27 },
  ],
};

// ─────────────────────────────────────────────────────────────
// Supervision multi-agents — pipeline orchestré (rejoue la décision D-001)
// ─────────────────────────────────────────────────────────────
export const mockAgents = [
  { id: "transcription", nom: "Transcription vocale", tech: "Gemini Live · STT", role: "Convertit la parole en texte", dureeMs: 480, statut: "ok" },
  { id: "nlu", nom: "Compréhension (NLU)", tech: "Gemini · classification", role: "Détecte l'intention de la demande", dureeMs: 220, statut: "ok" },
  { id: "extraction", nom: "Extraction d'entités", tech: "Gemini · function calling", role: "Isole montant, durée et objet", dureeMs: 180, statut: "ok" },
  { id: "kyc", nom: "Vérification KYC", tech: "Service interne", role: "Contrôle identité et conformité client", dureeMs: 310, statut: "ok" },
  { id: "rag", nom: "Recherche RAG", tech: "Vector store · embeddings", role: "Récupère les règles et politiques applicables", dureeMs: 540, statut: "ok" },
  { id: "risque", nom: "Scoring de risque", tech: "Modèle de décision", role: "Calcule le score d'octroi", dureeMs: 260, statut: "ok" },
  { id: "decision", nom: "Décision", tech: "Règles · seuil", role: "Agrège le score et applique le seuil", dureeMs: 130, statut: "ok" },
  { id: "explication", nom: "Explication (XAI)", tech: "Gemini · génération", role: "Rédige le justificatif lisible", dureeMs: 350, statut: "ok" },
];

// Flux de messages entre agents (offsets cumulés en ms) pour le rejeu animé.
export const mockPipelineRun = {
  decisionId: "D-001",
  totalMs: 2470,
  events: [
    { t: 0, from: "client", to: "transcription", label: "Flux audio", detail: "« Je voudrais un crédit immobilier de 600 000 DH… »" },
    { t: 480, from: "transcription", to: "nlu", label: "Texte transcrit", detail: "Confiance STT 0,97" },
    { t: 700, from: "nlu", to: "extraction", label: "Intention : Crédit", detail: "Confiance 0,98" },
    { t: 880, from: "extraction", to: "kyc", label: "Entités", detail: "montant=600 000 · durée=240 · objet=immobilier" },
    { t: 1190, from: "kyc", to: "rag", label: "Client vérifié", detail: "CIN BK123456 · segment Premium" },
    { t: 1730, from: "rag", to: "risque", label: "3 règles trouvées", detail: "endettement 40 % · LTV 80 % · fichage BAM" },
    { t: 1990, from: "risque", to: "decision", label: "Score 78/100", detail: "endettement 28 % sous le seuil" },
    { t: 2120, from: "decision", to: "explication", label: "Approuvé", detail: "78 ≥ seuil 60" },
    { t: 2470, from: "explication", to: "client", label: "Justificatif", detail: "Explication en langage naturel rendue" },
  ],
};