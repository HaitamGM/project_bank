# 🏦 BankIA — Assistant bancaire vocal intelligent

> Projet de Fin d'Études (PFE) — Plateforme bancaire augmentée par l'IA, avec assistant vocal temps réel, scoring de crédit explicable (XAI) et supervision multi-agents.

BankIA est une démonstration d'expérience bancaire nouvelle génération pour une banque marocaine. Le client dialogue **par la voix** avec un assistant IA capable de traiter des demandes de **crédit** et de **virement**, en s'appuyant sur le profil réel du compte. Chaque décision est **expliquée** (explicabilité / XAI) et **supervisée**.

---

## ✨ Fonctionnalités

- **🎙️ Assistant vocal temps réel** — conversation audio bidirectionnelle via Gemini Live (WebSocket), réponses en français (comprend aussi la darija).
- **💳 Demandes de crédit** — évaluation selon le profil (revenu, taux d'endettement, incidents, fichage BAM) avec décision motivée.
- **🔁 Virements** — vérification du solde et confirmation de l'opération.
- **🧠 Explicabilité (XAI)** — visualisation des facteurs ayant influencé chaque décision.
- **📊 Analytics & Supervision** — tableaux de bord, suivi des décisions et des pipelines.
- **🧮 Simulateur de crédit** — estimation interactive de la capacité d'emprunt.
- **📂 Documents & Historique** — gestion documentaire et traçabilité des opérations.

## 🗂️ Architecture

```
PFE Project/
├── frontend/        # SPA React 19 + Vite + Tailwind v4 (interface en français)
│   └── src/
│       ├── pages/        # Login, Dashboard, Assistant, XAI, Analytics, Simulateur…
│       ├── components/   # Layout & composants partagés
│       ├── services/     # mockData, scoring, clientService
│       └── hooks/        # useClient, useTheme
├── backend/         # API FastAPI + passerelle Gemini Live (voix)
│   └── app/main.py       # endpoints REST + WebSocket /ws
├── data/            # Données mock (clients, transactions, décisions, XAI…)
└── validate-data.mjs     # Script de validation des fichiers de données
```

## 🛠️ Stack technique

| Couche    | Technologies |
|-----------|--------------|
| Frontend  | React 19, Vite, Tailwind CSS v4, React Router, TanStack Query, Framer Motion, Axios |
| Backend   | Python, FastAPI, Uvicorn, WebSockets |
| IA        | Google Gemini Live (`google-genai`) — audio temps réel |
| Données   | Fichiers JSON mock (démo) |

---

## 🚀 Démarrage

### Prérequis
- Node.js 18+
- Python 3.11+
- Une clé API Google Gemini — gratuite sur [Google AI Studio](https://aistudio.google.com)

### 1. Backend (API + voix)

```bash
cd backend
python -m venv .venv
# Windows : .venv\Scripts\activate   |   macOS/Linux : source .venv/bin/activate
pip install -r requirements.txt

# Configurer la clé API
cp .env.example .env        # puis éditez .env et renseignez GOOGLE_API_KEY

uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

L'application est servie sur **http://localhost:5173** et communique avec l'API sur **http://localhost:8000**.

---

## 🔐 Variables d'environnement

À placer dans `backend/.env` (voir `backend/.env.example`) :

| Variable            | Description |
|---------------------|-------------|
| `GOOGLE_API_KEY`    | Clé API Google Gemini (**obligatoire**) |
| `GEMINI_LIVE_MODEL` | Nom du modèle Gemini Live (optionnel, valeur par défaut fournie) |

> ⚠️ Le fichier `.env` contient des secrets et **n'est jamais versionné** (voir `.gitignore`). Ne partagez que `.env.example`.

---

## 📝 Notes

- Les données (`data/*.json`) sont **fictives**, destinées à la démonstration.
- Projet académique — non destiné à une mise en production telle quelle.

---

*Développé dans le cadre d'un Projet de Fin d'Études.*
