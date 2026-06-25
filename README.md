# 🏦 BankIA — Assistant bancaire vocal intelligent

> Projet de Fin d'Études (PFE) — Plateforme bancaire augmentée par l'IA : assistant vocal temps réel, authentification 2FA, pipeline de vérification multi-agents pour le crédit et le virement, et scoring de crédit explicable (XAI).

BankIA est une démonstration d'expérience bancaire nouvelle génération pour une banque marocaine. Le client se connecte de façon sécurisée (mot de passe + code OTP), puis dialogue **par la voix** (en **darija**) avec un assistant IA, ou passe par l'écran **Opérations**. Chaque demande de **crédit** ou de **virement** traverse une **pipeline d'agents de vérification** (KYC, solvabilité, anti-fraude, scoring, décision, explication) et chaque décision est **expliquée**.

---

## ✨ Fonctionnalités

- **🔐 Connexion sécurisée 2FA** — email + mot de passe (haché en bcrypt) puis code OTP à 6 chiffres ; session par jeton **JWT**.
- **🎙️ Assistant vocal temps réel** — conversation audio bidirectionnelle via Gemini Live (WebSocket **authentifié**), réponses en **darija marocaine**.
- **🤖 Pipeline de vérification multi-agents** — pour chaque crédit/virement : KYC → solvabilité → anti-fraude/BAM → scoring → décision → explication (Gemini), affichée en direct.
- **💳 Crédit** — décision déterministe (taux d'endettement ≤ 40 %, fichage BAM, incidents) + analyse documentaire IA RAG (LangChain/ChromaDB) pour valider la conformité.
- **🔁 Virement** — contrôle du solde et des plafonds, analyse anti-fraude, puis **signature par OTP** avant exécution.
- **👤 Profil détaillé** — état civil, adresse, situation pro, comptes/IBAN, cartes, plafonds, bénéficiaires, crédits en cours, risque — avec **photo de profil**.
- **🧠 Explicabilité (XAI), 📊 Analytics, 🧮 Simulateur, 🗂️ Supervision, 📂 RAG, 🛡️ Audit.**

## 🗂️ Architecture

```
PFE Project/
├── frontend/        # SPA React 19 + Vite + Tailwind v4 (interface en français)
│   ├── public/avatars/   # Photos de profil (SVG) par client
│   └── src/
│       ├── pages/        # Login (2FA), Dashboard, Assistant, Operations, Profil, XAI…
│       ├── components/   # Layout, Avatar
│       ├── services/     # apiClient, authService, pipelineService, clientService,
│       │                 #   audioRecorder, audioStreamer, geminiLiveClient
│       └── hooks/         # useClient, useTheme
├── backend/         # API FastAPI
│   └── app/
│       ├── main.py         # app, CORS, en-têtes sécurité, endpoints /me, WebSocket /ws
│       ├── auth.py         # login + OTP 2FA + JWT
│       ├── security.py     # bcrypt, JWT, OTP, anti-bruteforce, rate-limit, dépendances
│       ├── pipeline.py     # agents de vérification crédit/virement
│       ├── pipeline_routes.py
│       ├── scoring.py      # moteur de décision (port de scoring.js)
│       ├── data_store.py   # accès données + seed users + audit
│       ├── schemas.py / config.py
├── data/            # clients (profils détaillés), transactions, décisions, users (généré)…
└── validate-data.mjs
```

## 🛠️ Stack technique

| Couche    | Technologies |
|-----------|--------------|
| Frontend  | React 19, Vite, Tailwind CSS v4, React Router, TanStack Query, Framer Motion, Axios |
| Backend   | Python, FastAPI, Uvicorn, WebSockets |
| Sécurité  | bcrypt (mots de passe), PyJWT (jetons), OTP 2FA, rate-limiting, en-têtes sécurité |
| IA        | Google Gemini Live (voix) + Gemini (explications) + LangChain + ChromaDB (RAG) + HuggingFace `all-MiniLM-L6-v2` |
| Données   | Fichiers JSON (démo) |

---

## 🚀 Démarrage

### Prérequis
- Node.js 18+ · Python 3.11+
- Une clé API Google Gemini — gratuite sur [Google AI Studio](https://aistudio.google.com)

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows : .venv\Scripts\activate   |   macOS/Linux : source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env        # éditez .env : GOOGLE_API_KEY et JWT_SECRET
uvicorn app.main:app --reload --port 8000
```

Au premier démarrage, `data/users.json` est généré automatiquement (un compte par client, mot de passe de démo haché en bcrypt).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Application sur **http://localhost:5173**, API sur **http://localhost:8000** (Vite proxifie `/api` et `/ws`).

### 🔑 Comptes de démonstration

Mot de passe commun : **`BankIA@2026`** · le code OTP est affiché à l'écran en mode démo.

| Email | Client | Profil |
|-------|--------|--------|
| `y.elidrissi@email.ma` | Yasmina El Idrissi | Premium — crédit immobilier approuvé (score 79) |
| `s.amrani@email.ma` | Sara Amrani | Patrimoine — excellent profil (score 87) |
| `k.benali@email.ma` | Karim Benali | Standard — fiché BAM, crédit refusé |

---

## 🔐 Variables d'environnement (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `GOOGLE_API_KEY` | Clé API Google Gemini (**obligatoire** pour voix + explication) |
| `JWT_SECRET` | Secret de signature des jetons — **valeur aléatoire longue obligatoire** |
| `GEMINI_LIVE_MODEL` | Modèle Gemini Live (voix), valeur par défaut fournie |
| `GEMINI_TEXT_MODEL` | Modèle texte pour l'explication des décisions (repli gabarit si absent) |
| `DEMO_PASSWORD` | Mot de passe de démo commun (haché au seed) |
| `DEMO_MODE` | `true` = l'OTP est renvoyé au front pour la démo ; `false` en production |

> ⚠️ `.env` et `data/users.json` contiennent des secrets/hashes et **ne sont pas versionnés** (voir `.gitignore`).

## 🛡️ Sécurité (mesures implémentées)

- Mots de passe **hachés bcrypt**, jamais stockés en clair.
- **2FA** : code OTP expirant, à essais limités, après le mot de passe.
- **JWT** signé (HS256), avec expiration ; le client est **toujours dérivé du jeton** (pas d'IDOR).
- **WebSocket vocal authentifié** par jeton.
- **Anti-bruteforce** (verrouillage de compte) + **rate-limiting** par IP.
- **Validation** stricte des entrées (Pydantic) et **plafonds** de virement.
- **En-têtes de sécurité** (anti-clickjacking, nosniff…) et **CORS** restreint.
- **Signature OTP** des virements avant exécution + **journal d'audit**.

---

## 📚 Documentation

La connaissance essentielle du projet est consignée dans des fichiers versionnés (afin de ne rien perdre au fil des sessions) :

| Fichier | Contenu |
|---------|---------|
| [`AGENTS.md`](AGENTS.md) | Source de vérité : identité, stack, lancement, agents, conventions et pièges |
| [`CLAUDE.md`](CLAUDE.md) | Point d'entrée des assistants IA (importe `AGENTS.md`) |
| [`docs/architecture.md`](docs/architecture.md) | Architecture technique détaillée (auth, pipelines, scoring, voix, données) |
| [`docs/decisions.md`](docs/decisions.md) | Journal des décisions structurantes (ADR) |

> ⚠️ Ne pas confondre [`docs/decisions.md`](docs/decisions.md) (décisions **de projet**) avec `data/decisions.json` (**données métier** : décisions de crédit/virement des clients).

## 📝 Notes

- Données fictives, destinées à la démonstration. Projet académique — non destiné à la production telle quelle.

*Développé dans le cadre d'un Projet de Fin d'Études.*
