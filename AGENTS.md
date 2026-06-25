# AGENTS.md — Contexte projet BankIA (source de vérité pour les agents IA)

> **But de ce fichier** : conserver le contexte essentiel du projet **hors de la mémoire de conversation**, pour qu'aucune décision importante ne soit perdue lors d'un *compactage* de Claude. Ce fichier (et `CLAUDE.md` qui l'importe) est relu **à chaque session**. Quand une décision structurante est prise, on la consigne ici et dans [`docs/decisions.md`](docs/decisions.md).

---

## 1. Ce qu'est BankIA

**BankIA** est un **Projet de Fin d'Études (PFE)** : une démonstration de banque marocaine « augmentée par l'IA ». Un client se connecte de façon sécurisée (mot de passe + OTP 2FA), puis **dialogue par la voix en darija** avec un assistant, ou passe par l'écran **Opérations**. Chaque demande de **crédit** ou de **virement** traverse une **pipeline d'agents de vérification déterministe**, et chaque décision est **expliquée** (XAI). Thème : une banque entièrement automatisée mais **transparente**.

**3 profils phares** (login + soutenance, à ne jamais casser) :

| Client | Email | Mot de passe | Scénario attendu |
|--------|-------|--------------|------------------|
| Yasmina El Idrissi (`CL-2024-0042`) | `y.elidrissi@email.ma` | `BankIA@2026` | Immo 600k/240 → score **79**, **approuvé** |
| Karim Benali (`CL-2024-0043`) | `k.benali@email.ma` | `BankIA@2026` | Fiché BAM + 2 incidents → score **0**, **refusé** |
| Sara Amrani (`CL-2024-0044`) | `s.amrani@email.ma` | `BankIA@2026` | Immo 800k/240 → score **87**, **approuvé** |

> ⚠️ Le moteur donne **79** pour Yasmina (pas 78). Les « 78 » écrits à la main dans d'anciens seeds sont narratifs ; la source de vérité est le moteur de scoring.

---

## 2. Stack

| Couche | Technologies |
|--------|--------------|
| Frontend | React 19, Vite, **Tailwind CSS v4** (classes utilitaires uniquement, **pas de fichier de config**), React Router v7, TanStack Query, Framer Motion, lucide-react, Axios |
| Backend | Python 3.11+, FastAPI, Uvicorn, WebSockets |
| Sécurité | bcrypt, PyJWT (HS256), OTP 2FA, rate-limiting, verrouillage de compte, en-têtes de sécurité |
| IA | Google **Gemini Live** (voix, function calling) + **Gemini** texte (explication) — paquet `google-genai` |
| Données | Fichiers JSON (démo), **générés** par `scripts/generate_data.py` |

---

## 3. Lancer le projet

Vous pouvez lancer simultanément le backend et le frontend en utilisant l'un des scripts de démarrage rapide à la racine du projet :

```powershell
# Option A : Double-cliquer sur 'run.bat' ou le lancer depuis un terminal
.\run.bat

# Option B : Lancer le script PowerShell
.\run.ps1
```

*(Ces scripts détectent automatiquement votre environnement virtuel `.mivenv` ou `.venv` et ouvrent deux fenêtres de terminal distinctes).*

### Lancement manuel classique :
```bash
# Backend (venv dans backend/.mivenv ou .venv)
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows  | source .venv/bin/activate  (macOS/Linux)
pip install -r requirements.txt
cp .env.example .env             # éditer : GOOGLE_API_KEY (vraie clé) + JWT_SECRET (aléatoire long)
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev                      # http://localhost:5173 ; Vite proxifie /api et /ws -> :8000
```

- Au 1ᵉʳ démarrage, `data/users.json` est **auto-généré** depuis `clients.json` (mot de passe `BankIA@2026` haché bcrypt). Supprimer ce fichier + redémarrer pour reseeder.
- **Régénérer toutes les données** : `python scripts/generate_data.py` (déterministe, **seed 42**).
- `.env` et `data/users.json` contiennent des secrets/hashes → **non versionnés** (`.gitignore`).

---

## 4. Carte du code

```
PFE Project/
├── frontend/src/
│   ├── pages/        Login, Dashboard, Assistant (voix), Operations (pipeline+OTP),
│   │                 Profil, XAI, Analytics, Simulateur, Supervision, Documents, Historique
│   ├── components/   Layout, Avatar, Pipeline (timeline d'agents partagée), LanguageSwitcher
│   ├── services/     apiClient (axios+JWT), authService, pipelineService, clientService,
│   │                 audioRecorder (mic→PCM16 16k), audioStreamer (PCM16 24k, barge-in),
│   │                 geminiLiveClient (WS), mockData (legacy), scoring.js (miroir front)
│   ├── hooks/        useClient, useTheme
│   ├── lib/          format.js (fmt MAD/dates)
│   └── i18n/         translations.js, I18nContext (FR/darija)
├── backend/app/
│   ├── main.py             app, CORS, en-têtes sécurité, /me, WebSocket /ws (voix)
│   ├── auth.py             login + OTP 2FA + émission JWT
│   ├── security.py         bcrypt, JWT, OTP, anti-bruteforce, rate-limit, challenges virement, deps
│   ├── pipeline.py         agents de vérification crédit + virement (déterministe)
│   ├── pipeline_routes.py  routes REST de la pipeline (écran Opérations)
│   ├── scoring.py          moteur de décision crédit (port fidèle de scoring.js)
│   ├── voice_tools.py      4 outils function-calling de l'assistant vocal
│   ├── data_store.py       accès données, seed users, audit, soldes effectifs de session
│   └── schemas.py / config.py
├── data/             clients, transactions, decisions, explainability, pipeline-runs,
│                     analytics, agents, documents (+ users.json généré)
├── scripts/generate_data.py   générateur déterministe (seed 42)
├── docs/architecture.md       architecture détaillée
└── docs/decisions.md          journal des décisions (ADR)
```

---

## 5. Les agents de vérification

⚠️ **Deux représentations des agents** — ne pas les confondre :

1. **Pipeline live** (`backend/app/pipeline.py`) — émet des `steps` exécutés en vrai :
   - **Crédit** : `kyc` (Agent KYC) → `capacite` (Agent Solvabilité) → `fraude` (Agent Risque / BAM) → `scoring` (Agent Scoring) → `decision` (Agent Décision) → `explication` (Agent Explication, **Gemini** hybride + repli gabarit).
   - **Virement** : `kyc` (Agent KYC) → `provision` (Agent Comptes) → `limites` (Agent Limites) → `fraude` (Agent Anti-fraude) → `decision` (Agent Décision), puis **signature OTP** avant exécution.
2. **Catalogue d'affichage** (`data/agents.json`, page Supervision) — 6 agents « métier » nommés autrement : `AG-CRM`, `AG-FIN`, `AG-RISK`, `AG-DEC`, `AG-EXEC`, `AG-XAI` (avec latences simulées). C'est de la **donnée d'affichage**, pas le moteur.

**Assistant vocal → vraie pipeline** : `voice_tools.py` déclare 4 outils à Gemini Live :
`evaluer_credit`, `preparer_virement`, `confirmer_virement`, `consulter_comptes`. Quand le client parle, Gemini **appelle l'outil**, qui exécute **les mêmes agents** que l'écran Opérations (`use_ai=False` pour la rapidité, l'assistant verbalise lui-même), persiste décision + audit (`canal:"vocal"`), renvoie une réponse au modèle **et** un `tool_event` à l'UI pour animer la pipeline en direct.

---

## 6. Moteur de scoring (résumé — détail dans docs/architecture.md)

`backend/app/scoring.py` = **port Python fidèle** de `frontend/src/services/scoring.js`. Parité exacte garantie par `_jsround(x) = floor(x + 0.5)` (= `Math.round` JS).

- Score base **50**, borné **0–100**. **Seuil d'acceptation = 60**. Taux nominal **4,85 %**.
- Contributions : taux d'endettement (poids dominant, **plafond 40 %**), revenu, ancienneté, incidents (−9/incident), fichage BAM (−35 si fiché, +6 sinon).
- **Règles dures** (refus même si score ≥ 60) : fichage BAM, taux d'endettement > 40 %, KYC échoué.

---

## 7. Conventions & pièges — NE PAS « corriger »

- **`risque.tauxEndettement` est le ratio _actuel_** du client (Yasmina ≈ 6 %). Le % affiché dans une décision/XAI est le ratio **_avec le crédit demandé_** (Yasmina 28 %). Ils **doivent** différer — ce n'est pas un bug.
- **Score 79 ≠ 78** pour Yasmina : le moteur fait foi, les seeds narratifs « 78 » sont volontairement laissés.
- **Données à la racine `data/`**, PAS `backend/data/` : le backend lit `DATA_DIR = backend/../data`.
- **`data/decisions.json` = données de l'app** (decisions crédit/virement par client, dict keyed par `clientId`, ~117 entrées générées). **Ne JAMAIS y mettre des décisions de projet** — celles-ci vont dans [`docs/decisions.md`](docs/decisions.md).
- **Tailwind v4 sans config** : pas de `tailwind.config.js`, uniquement des classes utilitaires.
- **Le client est toujours dérivé du JWT** côté backend (pas d'`id` client pris du corps de requête → pas d'IDOR).
- **Pages encore en mock** : XAI, Analytics, Supervision, Documents/RAG lisent `mockData.js`, pas encore les vrais fichiers `data/`. (Prochaine étape de câblage.)

---

## 8. Design

Identité visuelle **émeraude/vert** (le violet a été **rejeté**), UI en **français**, sections « qualité jury ». Voir la mémoire `design-emerald-fintech` et `docs/decisions.md`.

---

## 9. Pour en savoir plus

- Architecture technique détaillée → [`docs/architecture.md`](docs/architecture.md)
- Journal des décisions (ADR) → [`docs/decisions.md`](docs/decisions.md)
- Vue produit / démarrage → [`README.md`](README.md)
