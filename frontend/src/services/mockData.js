// AUTO-GÉNÉRÉ par scripts/generate_data.py — ne pas éditer à la main.
// Vues dérivées des vraies données pour les pages XAI / Analytique / Base RAG / Supervision.

export const mockClient = {
  "id": "CL-2024-0042",
  "photo": "/avatars/CL-2024-0042.svg",
  "personnel": {
    "civilite": "Mme",
    "prenom": "Yasmina",
    "nom": "El Idrissi",
    "genre": "F",
    "cin": "XL983794",
    "dateNaissance": "1999-01-30",
    "lieuNaissance": "Casablanca",
    "age": 27,
    "nationalite": "Marocaine",
    "telephone": "+212 6 17 39 14 50",
    "email": "y.elidrissi@email.ma",
    "ville": "Casablanca",
    "adresse": {
      "rue": "103 Avenue Ibn Batouta",
      "quartier": "Maârif",
      "ville": "Casablanca",
      "codePostal": "20330",
      "pays": "Maroc"
    },
    "situationFamiliale": "Marié(e)",
    "nombreEnfants": 3,
    "niveauEtudes": "Bac+5 — Ingénierie",
    "pieceIdentite": {
      "type": "CIN",
      "numero": "XL983794",
      "validiteJusquau": "2029-07-03",
      "verifiee": true
    }
  },
  "professionnel": {
    "profession": "Ingénieure informatique",
    "secteur": "Technologie",
    "employeur": "Capgemini Maroc",
    "typeContrat": "CDI",
    "secteurActivite": "Technologie",
    "dateEmbauche": "2023-06-28",
    "ancienneteMois": 36,
    "revenuMensuel": 18000,
    "revenuAnnuel": 216000,
    "autresRevenus": 0,
    "modeVersementSalaire": "Virement"
  },
  "bancaire": {
    "agence": "BankIA Maârif",
    "conseiller": "Mme Nadia Cherkaoui",
    "clientDepuis": "2019-06-14",
    "segment": "Premium",
    "scoreInterne": 81,
    "compteActif": true,
    "chargesMensuelles": 1100,
    "comptes": [
      {
        "rib": "230 815 8196001338908386 38",
        "iban": "MA64 2308 1581 9600 1338 9083",
        "type": "courant",
        "intitule": "Compte courant principal",
        "solde": 44835.14,
        "devise": "MAD",
        "dateOuverture": "2019-06-14"
      },
      {
        "rib": "230 815 0265423511615594 15",
        "iban": "MA64 2308 1502 6542 3511 6155",
        "type": "epargne",
        "intitule": "Compte sur carnet",
        "solde": 260811.49,
        "devise": "MAD",
        "dateOuverture": "2019-10-12",
        "tauxInteret": 0.025
      }
    ],
    "cartes": [
      {
        "type": "Crédit",
        "reseau": "Visa Gold",
        "titulaire": "YASMINA EL IDRISSI",
        "numero": "4012 9696 5328 2388",
        "numeroMasque": "4012 •••• •••• 2388",
        "cvv": "710",
        "plafondMensuel": 30000,
        "expiration": "02/28",
        "statut": "active"
      },
      {
        "type": "Crédit",
        "reseau": "Visa Gold",
        "titulaire": "YASMINA EL IDRISSI",
        "numero": "4024 8480 1845 9166",
        "numeroMasque": "4024 •••• •••• 9166",
        "cvv": "146",
        "plafondMensuel": 30000,
        "expiration": "03/30",
        "statut": "active"
      }
    ],
    "plafonds": {
      "virementParOperation": 50000,
      "virementQuotidien": 100000,
      "retraitQuotidien": 5000
    },
    "beneficiaires": [
      {
        "nom": "Loyer — Résidence Al Manar",
        "rib": "230 815 8495931034131647 91",
        "banque": "CIH"
      },
      {
        "nom": "Mohammed Alaoui",
        "rib": "230 815 5255341928327648 38",
        "banque": "BMCE"
      }
    ],
    "creditsEnCours": [
      {
        "type": "Crédit auto",
        "organisme": "BankIA",
        "capitalRestant": 20857,
        "mensualite": 1100,
        "echeance": "2028-04-07"
      }
    ]
  },
  "risque": {
    "incidentsPaiement": 0,
    "fichageBam": false,
    "tauxEndettement": 0.061,
    "niveauRisque": "Faible",
    "scoreBam": "A",
    "categorieRisque": "Faible",
    "derniereRevue": "2026-06-02"
  }
};

export const mockTransactions = [
  {
    "id": "TX-0042-022",
    "date": "2026-07-07",
    "libelle": "Station-service Afriquia",
    "montant": -520.07,
    "categorie": "Transport",
    "type": "debit"
  },
  {
    "id": "TX-0042-025",
    "date": "2026-07-07",
    "libelle": "Pharmacie",
    "montant": -371.92,
    "categorie": "Santé",
    "type": "debit"
  },
  {
    "id": "TX-0042-026",
    "date": "2026-06-28",
    "libelle": "Paiement carte — Carrefour",
    "montant": -783.36,
    "categorie": "Courses",
    "type": "debit"
  },
  {
    "id": "TX-0042-027",
    "date": "2026-06-28",
    "libelle": "Facture Lydec — Électricité/Eau",
    "montant": -553.32,
    "categorie": "Factures",
    "type": "debit"
  },
  {
    "id": "TX-0042-021",
    "date": "2026-06-25",
    "libelle": "Paiement carte — Carrefour",
    "montant": -581.82,
    "categorie": "Courses",
    "type": "debit"
  },
  {
    "id": "TX-0042-024",
    "date": "2026-06-20",
    "libelle": "Paiement restaurant",
    "montant": -496.69,
    "categorie": "Loisirs",
    "type": "debit"
  },
  {
    "id": "TX-0042-023",
    "date": "2026-06-18",
    "libelle": "Facture Maroc Telecom",
    "montant": -262.01,
    "categorie": "Factures",
    "type": "debit"
  },
  {
    "id": "TX-0042-028",
    "date": "2026-06-17",
    "libelle": "Prélèvement — Crédit auto",
    "montant": -1100,
    "categorie": "Crédit",
    "type": "debit"
  }
];

export const mockDecisions = [
  {
    "id": "DEC-0008",
    "clientId": "CL-2024-0042",
    "clientNom": "Yasmina El Idrissi",
    "date": "2026-06-01 09:40",
    "intent": "Crédit personnel",
    "type": "credit",
    "sousType": "Crédit personnel",
    "objet": "personnel",
    "montant": 195000,
    "dureeMois": 180,
    "statut": "approuve",
    "score": 91,
    "mensualite": 1527,
    "tauxInteret": 0.0485,
    "tauxEndettementApres": 0.146,
    "explication": "Demande de Crédit personnel approuvée. Score 91/100  taux d'endettement après crédit 15 % sous le seuil de 40 %. Mensualité estimée : 1 527 MAD."
  },
  {
    "id": "DEC-0004",
    "clientId": "CL-2024-0042",
    "clientNom": "Yasmina El Idrissi",
    "date": "2026-05-22 19:15",
    "intent": "Crédit personnel",
    "type": "credit",
    "sousType": "Crédit personnel",
    "objet": "personnel",
    "montant": 387000,
    "dureeMois": 120,
    "statut": "approuve",
    "score": 78,
    "mensualite": 4076,
    "tauxInteret": 0.0485,
    "tauxEndettementApres": 0.288,
    "explication": "Demande de Crédit personnel approuvée. Score 78/100  taux d'endettement après crédit 29 % sous le seuil de 40 %. Mensualité estimée : 4 076 MAD."
  },
  {
    "id": "DEC-0013",
    "clientId": "CL-2024-0042",
    "clientNom": "Yasmina El Idrissi",
    "date": "2026-04-01 20:21",
    "intent": "Virement",
    "type": "virement",
    "sousType": "Virement",
    "montant": 3730.31,
    "statut": "execute",
    "score": null,
    "beneficiaire": "Loyer — Résidence Al Manar",
    "soldeAvant": 44835.14,
    "soldeApres": 41104.83,
    "explication": "Solde suffisant  bénéficiaire vérifié. Virement de 3 730 MAD vers Loyer — Résidence Al Manar."
  },
  {
    "id": "DEC-0007",
    "clientId": "CL-2024-0042",
    "clientNom": "Yasmina El Idrissi",
    "date": "2026-03-15 07:20",
    "intent": "Virement",
    "type": "virement",
    "sousType": "Virement",
    "montant": 10957.18,
    "statut": "execute",
    "score": null,
    "beneficiaire": "Mohammed Alaoui",
    "soldeAvant": 44835.14,
    "soldeApres": 33877.96,
    "explication": "Solde suffisant  bénéficiaire vérifié. Virement de 10 957 MAD vers Mohammed Alaoui."
  },
  {
    "id": "DEC-0001",
    "clientId": "CL-2024-0042",
    "clientNom": "Yasmina El Idrissi",
    "date": "2026-01-15 07:00",
    "intent": "Virement",
    "type": "virement",
    "sousType": "Virement",
    "montant": 6317.52,
    "statut": "execute",
    "score": null,
    "beneficiaire": "Mohammed Alaoui",
    "soldeAvant": 44835.14,
    "soldeApres": 38517.62,
    "explication": "Solde suffisant  bénéficiaire vérifié. Virement de 6 318 MAD vers Mohammed Alaoui."
  },
  {
    "id": "DEC-0015",
    "clientId": "CL-2024-0042",
    "clientNom": "Yasmina El Idrissi",
    "date": "2025-12-28 14:19",
    "intent": "Crédit immobilier",
    "type": "credit",
    "sousType": "Crédit immobilier",
    "objet": "immobilier",
    "montant": 476000,
    "dureeMois": 180,
    "statut": "approuve",
    "score": 80,
    "mensualite": 3727,
    "tauxInteret": 0.0485,
    "tauxEndettementApres": 0.268,
    "explication": "Demande de Crédit immobilier approuvée. Score 80/100  taux d'endettement après crédit 27 % sous le seuil de 40 %. Mensualité estimée : 3 727 MAD."
  },
  {
    "id": "DEC-0012",
    "clientId": "CL-2024-0042",
    "clientNom": "Yasmina El Idrissi",
    "date": "2025-12-16 19:42",
    "intent": "Crédit immobilier",
    "type": "credit",
    "sousType": "Crédit immobilier",
    "objet": "immobilier",
    "montant": 742000,
    "dureeMois": 48,
    "statut": "refuse",
    "score": 22,
    "mensualite": 17037,
    "tauxInteret": 0.0485,
    "tauxEndettementApres": 1.008,
    "explication": "Demande de Crédit immobilier refusée. Un montant réduit à environ 266 000 MAD respecterait le seuil d'endettement de 40 %."
  },
  {
    "id": "DEC-0003",
    "clientId": "CL-2024-0042",
    "clientNom": "Yasmina El Idrissi",
    "date": "2025-12-01 13:25",
    "intent": "Virement",
    "type": "virement",
    "sousType": "Virement",
    "montant": 10692.03,
    "statut": "execute",
    "score": null,
    "beneficiaire": "Loyer — Résidence Al Manar",
    "soldeAvant": 44835.14,
    "soldeApres": 34143.11,
    "explication": "Solde suffisant  bénéficiaire vérifié. Virement de 10 692 MAD vers Loyer — Résidence Al Manar."
  },
  {
    "id": "DEC-0005",
    "clientId": "CL-2024-0042",
    "clientNom": "Yasmina El Idrissi",
    "date": "2025-11-21 04:13",
    "intent": "Virement",
    "type": "virement",
    "sousType": "Virement",
    "montant": 8515.28,
    "statut": "execute",
    "score": null,
    "beneficiaire": "Mohammed Alaoui",
    "soldeAvant": 44835.14,
    "soldeApres": 36319.86,
    "explication": "Solde suffisant  bénéficiaire vérifié. Virement de 8 515 MAD vers Mohammed Alaoui."
  },
  {
    "id": "DEC-0014",
    "clientId": "CL-2024-0042",
    "clientNom": "Yasmina El Idrissi",
    "date": "2025-11-11 13:15",
    "intent": "Crédit consommation",
    "type": "credit",
    "sousType": "Crédit consommation",
    "objet": "consommation",
    "montant": 773000,
    "dureeMois": 24,
    "statut": "refuse",
    "score": 22,
    "mensualite": 33861,
    "tauxInteret": 0.0485,
    "tauxEndettementApres": 1.942,
    "explication": "Demande de Crédit consommation refusée. Un montant réduit à environ 139 000 MAD respecterait le seuil d'endettement de 40 %."
  },
  {
    "id": "DEC-0011",
    "clientId": "CL-2024-0042",
    "clientNom": "Yasmina El Idrissi",
    "date": "2025-10-08 12:25",
    "intent": "Virement",
    "type": "virement",
    "sousType": "Virement",
    "montant": 11237.97,
    "statut": "execute",
    "score": null,
    "beneficiaire": "Mohammed Alaoui",
    "soldeAvant": 44835.14,
    "soldeApres": 33597.17,
    "explication": "Solde suffisant  bénéficiaire vérifié. Virement de 11 238 MAD vers Mohammed Alaoui."
  },
  {
    "id": "DEC-0009",
    "clientId": "CL-2024-0042",
    "clientNom": "Yasmina El Idrissi",
    "date": "2025-08-27 13:18",
    "intent": "Crédit personnel",
    "type": "credit",
    "sousType": "Crédit personnel",
    "objet": "personnel",
    "montant": 767000,
    "dureeMois": 48,
    "statut": "refuse",
    "score": 22,
    "mensualite": 17611,
    "tauxInteret": 0.0485,
    "tauxEndettementApres": 1.04,
    "explication": "Demande de Crédit personnel refusée. Un montant réduit à environ 266 000 MAD respecterait le seuil d'endettement de 40 %."
  },
  {
    "id": "DEC-0002",
    "clientId": "CL-2024-0042",
    "clientNom": "Yasmina El Idrissi",
    "date": "2025-08-23 06:48",
    "intent": "Crédit auto",
    "type": "credit",
    "sousType": "Crédit auto",
    "objet": "auto",
    "montant": 334000,
    "dureeMois": 24,
    "statut": "refuse",
    "score": 22,
    "mensualite": 14631,
    "tauxInteret": 0.0485,
    "tauxEndettementApres": 0.874,
    "explication": "Demande de Crédit auto refusée. Un montant réduit à environ 139 000 MAD respecterait le seuil d'endettement de 40 %."
  },
  {
    "id": "DEC-0010",
    "clientId": "CL-2024-0042",
    "clientNom": "Yasmina El Idrissi",
    "date": "2025-08-02 08:48",
    "intent": "Virement",
    "type": "virement",
    "sousType": "Virement",
    "montant": 4266.59,
    "statut": "execute",
    "score": null,
    "beneficiaire": "Mohammed Alaoui",
    "soldeAvant": 44835.14,
    "soldeApres": 40568.55,
    "explication": "Solde suffisant  bénéficiaire vérifié. Virement de 4 267 MAD vers Mohammed Alaoui."
  },
  {
    "id": "DEC-0006",
    "clientId": "CL-2024-0042",
    "clientNom": "Yasmina El Idrissi",
    "date": "2025-07-01 20:34",
    "intent": "Crédit immobilier",
    "type": "credit",
    "sousType": "Crédit immobilier",
    "objet": "immobilier",
    "montant": 401000,
    "dureeMois": 120,
    "statut": "approuve",
    "score": 77,
    "mensualite": 4224,
    "tauxInteret": 0.0485,
    "tauxEndettementApres": 0.296,
    "explication": "Demande de Crédit immobilier approuvée. Score 77/100  taux d'endettement après crédit 30 % sous le seuil de 40 %. Mensualité estimée : 4 224 MAD."
  }
];

export const mockDocuments = [
  {
    "id": "DOC-001",
    "titre": "Politique de crédit immobilier 2026",
    "type": "Politique",
    "chunks": 79,
    "dateIndex": "2026-05-30"
  },
  {
    "id": "DOC-002",
    "titre": "Circulaire Bank Al-Maghrib 1/G/2020",
    "type": "Réglementation",
    "chunks": 29,
    "dateIndex": "2026-05-16"
  },
  {
    "id": "DOC-003",
    "titre": "Conditions générales du crédit à la consommation",
    "type": "Politique",
    "chunks": 67,
    "dateIndex": "2026-05-25"
  },
  {
    "id": "DOC-004",
    "titre": "Barème des crédits automobiles",
    "type": "Politique",
    "chunks": 71,
    "dateIndex": "2026-05-21"
  },
  {
    "id": "DOC-005",
    "titre": "Plafonds et conditions des virements",
    "type": "Procédure",
    "chunks": 49,
    "dateIndex": "2026-04-23"
  },
  {
    "id": "DOC-006",
    "titre": "Procédure de lutte anti-fraude",
    "type": "Sécurité",
    "chunks": 20,
    "dateIndex": "2026-05-09"
  }
];

export const mockXai = {
  "decisionId": "DEC-0008",
  "intent": "Crédit immobilier",
  "montant": 600000,
  "statut": "approuve",
  "score": 79,
  "seuil": 60,
  "scoreBase": 50,
  "confiance": 0.93,
  "resume": "Décision favorable portée par un taux d'endettement maîtrisé (28 %) et un revenu stable, conforme au plafond réglementaire de 40 %.",
  "features": [
    {
      "label": "Taux d'endettement",
      "valeur": "28 %",
      "impact": 12,
      "direction": "positif"
    },
    {
      "label": "Revenu mensuel",
      "valeur": "18 000 DH",
      "impact": 7,
      "direction": "positif"
    },
    {
      "label": "Ancienneté CDI",
      "valeur": "36 mois",
      "impact": 4,
      "direction": "positif"
    },
    {
      "label": "Historique BAM sain",
      "valeur": "0 incident",
      "impact": 6,
      "direction": "positif"
    }
  ],
  "counterfactuals": [
    {
      "condition": "Si le taux d'endettement dépassait 40 % (charges +6 000 DH)",
      "scoreSimule": 22,
      "resultat": "refuse"
    },
    {
      "condition": "Si la cliente était fichée Bank Al-Maghrib",
      "scoreSimule": 38,
      "resultat": "refuse"
    },
    {
      "condition": "Avec un apport de 30 % (montant 420 000 DH)",
      "scoreSimule": 85,
      "resultat": "approuve"
    },
    {
      "condition": "Si l'ancienneté était inférieure à 12 mois",
      "scoreSimule": 74,
      "resultat": "approuve"
    }
  ],
  "sources": [
    {
      "docId": "DOC-001",
      "titre": "Politique de crédit immobilier 2026",
      "extrait": "Le taux d'endettement maximal autorisé est de 40 % des revenus nets mensuels.",
      "pertinence": 0.96
    },
    {
      "docId": "DOC-001",
      "titre": "Politique de crédit immobilier 2026",
      "extrait": "La quotité de financement (LTV) ne peut excéder 80 % pour une résidence principale.",
      "pertinence": 0.83
    },
    {
      "docId": "DOC-002",
      "titre": "Circulaire Bank Al-Maghrib 1/G/2020",
      "extrait": "Consultation obligatoire du fichier central des incidents de remboursement.",
      "pertinence": 0.88
    }
  ]
};

export const mockAnalytics = {
  "kpis": {
    "totalDecisions": 113,
    "tauxApprobation": 0.54,
    "montantOctroye": 5861000,
    "delaiMoyenSec": 1.2,
    "scoreMoyen": 42
  },
  "parMois": [
    {
      "mois": "Jan",
      "approuve": 5,
      "refuse": 3
    },
    {
      "mois": "Fév",
      "approuve": 5,
      "refuse": 5
    },
    {
      "mois": "Mar",
      "approuve": 2,
      "refuse": 5
    },
    {
      "mois": "Avr",
      "approuve": 9,
      "refuse": 3
    },
    {
      "mois": "Mai",
      "approuve": 3,
      "refuse": 1
    },
    {
      "mois": "Juin",
      "approuve": 2,
      "refuse": 1
    }
  ],
  "parType": [
    {
      "type": "Crédit immobilier",
      "count": 14,
      "montant": 7751000
    },
    {
      "type": "Crédit conso/auto",
      "count": 54,
      "montant": 24369000
    },
    {
      "type": "Virement",
      "count": 45,
      "montant": 299794
    }
  ],
  "scoreDistribution": [
    {
      "bucket": "0–20",
      "count": 20
    },
    {
      "bucket": "20–40",
      "count": 19
    },
    {
      "bucket": "40–60",
      "count": 4
    },
    {
      "bucket": "60–80",
      "count": 15
    },
    {
      "bucket": "80–100",
      "count": 10
    }
  ],
  "motifsRefus": [
    {
      "motif": "Taux d'endettement > 40 %",
      "count": 34
    },
    {
      "motif": "Fichage Bank Al-Maghrib",
      "count": 10
    },
    {
      "motif": "Incidents de paiement",
      "count": 7
    }
  ]
};

export const mockAgents = [
  {
    "id": "transcription",
    "nom": "Transcription vocale",
    "tech": "Gemini Live · STT",
    "role": "Convertit la parole en texte",
    "dureeMs": 480,
    "statut": "ok"
  },
  {
    "id": "nlu",
    "nom": "Compréhension (NLU)",
    "tech": "Gemini · classification",
    "role": "Détecte l'intention de la demande",
    "dureeMs": 220,
    "statut": "ok"
  },
  {
    "id": "extraction",
    "nom": "Extraction d'entités",
    "tech": "Gemini · function calling",
    "role": "Isole montant, durée et objet",
    "dureeMs": 180,
    "statut": "ok"
  },
  {
    "id": "kyc",
    "nom": "Vérification KYC",
    "tech": "Service interne",
    "role": "Contrôle identité et conformité client",
    "dureeMs": 310,
    "statut": "ok"
  },
  {
    "id": "rag",
    "nom": "Recherche RAG",
    "tech": "Vector store · embeddings",
    "role": "Récupère les règles et politiques applicables",
    "dureeMs": 540,
    "statut": "ok"
  },
  {
    "id": "risque",
    "nom": "Scoring de risque",
    "tech": "Modèle de décision",
    "role": "Calcule le score d'octroi",
    "dureeMs": 260,
    "statut": "ok"
  },
  {
    "id": "decision",
    "nom": "Décision",
    "tech": "Règles · seuil",
    "role": "Agrège le score et applique le seuil",
    "dureeMs": 130,
    "statut": "ok"
  },
  {
    "id": "explication",
    "nom": "Explication (XAI)",
    "tech": "Gemini · génération",
    "role": "Rédige le justificatif lisible",
    "dureeMs": 350,
    "statut": "ok"
  }
];

export const mockPipelineRun = {
  "decisionId": "DEC-0008",
  "totalMs": 2470,
  "events": [
    {
      "t": 0,
      "from": "client",
      "to": "transcription",
      "label": "Flux audio",
      "detail": "« Je voudrais un crédit immobilier de 600 000 DH… »"
    },
    {
      "t": 480,
      "from": "transcription",
      "to": "nlu",
      "label": "Texte transcrit",
      "detail": "Confiance STT 0,97"
    },
    {
      "t": 700,
      "from": "nlu",
      "to": "extraction",
      "label": "Intention : Crédit",
      "detail": "Confiance 0,98"
    },
    {
      "t": 880,
      "from": "extraction",
      "to": "kyc",
      "label": "Entités",
      "detail": "montant=600 000 · durée=240 · objet=immobilier"
    },
    {
      "t": 1190,
      "from": "kyc",
      "to": "rag",
      "label": "Client vérifié",
      "detail": "Identité confirmée · segment Premium"
    },
    {
      "t": 1730,
      "from": "rag",
      "to": "risque",
      "label": "Règles trouvées",
      "detail": "endettement 40 % · LTV 80 % · fichage BAM"
    },
    {
      "t": 1990,
      "from": "risque",
      "to": "decision",
      "label": "Score 79/100",
      "detail": "endettement 28 % sous le seuil"
    },
    {
      "t": 2120,
      "from": "decision",
      "to": "explication",
      "label": "Approuvé",
      "detail": "79 ≥ seuil 60"
    },
    {
      "t": 2470,
      "from": "explication",
      "to": "client",
      "label": "Justificatif",
      "detail": "Explication en langage naturel rendue"
    }
  ]
};
