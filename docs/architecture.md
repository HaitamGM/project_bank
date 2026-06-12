# Architecture technique — BankIA

> Document de référence technique. Pour le contexte global et les conventions, voir [`../AGENTS.md`](../AGENTS.md). Pour l'historique des choix, voir [`decisions.md`](decisions.md).

## 1. Vue d'ensemble

BankIA est une **SPA React** (frontend) adossée à une **API FastAPI** (backend). Toutes les opérations sensibles (login, crédit, virement, voix) passent par le backend, qui détient la logique de décision et la sécurité. Les données de démonstration sont des fichiers JSON à la racine `data/`, **générés** de façon déterministe.

```
Navigateur (React 19 + Vite)
   │  REST /api/*  (Axios + intercepteur JWT)
   │  WebSocket /ws  (audio temps réel)
   ▼
FastAPI (uvicorn :8000)
   ├── auth        login → OTP 2FA → JWT
   ├── pipeline    agents de vérification crédit / virement (déterministe)
   ├── scoring     moteur de décision crédit (0–100)
   ├── voice_tools function calling de l'assistant vocal
   ├── security    bcrypt, JWT, OTP, rate-limit, lockout, challenges
   └── data_store  lecture data/*.json, seed users, audit, soldes de session
        │
        ▼
   Google Gemini Live (voix)  +  Gemini texte (explication XAI)
```

Vite proxifie `/api` et `/ws` vers `http://localhost:8000` (voir `frontend/vite.config.js`).

## 2. Frontend

- **Pages** (`frontend/src/pages/`) : `Login` (2 étapes : mot de passe → OTP), `Dashboard`, `Assistant` (voix temps réel), `Operations` (pipeline live + signature OTP), `Profil`, `XAI`, `Analytics`, `Simulateur`, `Supervision`, `Documents`, `Historique`.
- **Composants** (`frontend/src/components/`) : `Layout` (navigation : *Espace client* / *Démonstration*), `Avatar` (SVG par client dans `public/avatars/<id>.svg`), `Pipeline` (timeline d'agents **partagée** entre Operations et Assistant), `LanguageSwitcher`.
- **Services** (`frontend/src/services/`) :
  - `apiClient.js` — Axios + intercepteur qui injecte le JWT (`Authorization: Bearer`).
  - `authService.js`, `pipelineService.js`, `clientService.js` (appelle `/clients/me*`).
  - `audioRecorder.js` — micro → **PCM16 16 kHz** base64.
  - `audioStreamer.js` — lecture **PCM16 24 kHz**, sans coupure (*gapless*) + *barge-in*.
  - `geminiLiveClient.js` — client WebSocket : envoie d'abord `{type:init, clientId}`, puis `{type:audio}` ; expose `ontoolevent` pour les `tool_event` de la pipeline.
  - `scoring.js` — **miroir front** du moteur (Simulateur/XAI) ; `scoring.py` en est le port fidèle.
  - `mockData.js` — *legacy*, encore utilisé par XAI/Analytics/Supervision/Documents.
- **Hooks** : `useClient`, `useTheme` (bascule via classe `.dark`).
- **i18n** : `translations.js` + `I18nContext` (FR / darija).
- **Tailwind v4** : classes utilitaires uniquement, **aucun** `tailwind.config.js`.

## 3. Backend — modules

| Module | Rôle |
|--------|------|
| `main.py` | App FastAPI, CORS restreint, en-têtes de sécurité, endpoints `/me`, WebSocket `/ws` (relais voix + function calling) |
| `auth.py` | Login email+mot de passe → OTP 2FA → émission JWT |
| `security.py` | bcrypt, JWT (HS256), OTP, anti-bruteforce, rate-limit, *challenges* de virement, dépendances d'autorisation |
| `pipeline.py` | Agents de vérification crédit & virement (déterministe) + explication hybride |
| `pipeline_routes.py` | Routes REST de la pipeline (écran Operations) |
| `scoring.py` | Moteur de décision crédit (port fidèle de `scoring.js`) |
| `voice_tools.py` | 4 outils function-calling de l'assistant vocal |
| `data_store.py` | Lecture `data/*.json`, seed `users.json`, journal d'audit, soldes effectifs de session |
| `schemas.py` / `config.py` | Modèles Pydantic / configuration & variables d'environnement |

## 4. Authentification (2FA + JWT)

1. `POST /auth/login` — email + mot de passe (vérifié **bcrypt**). En cas de succès, un **OTP 6 chiffres** est généré (en `DEMO_MODE`, renvoyé au front sous `devOtp` pour la soutenance).
2. `POST /auth/verify-otp` — l'OTP (expirant, à essais limités) est validé → émission d'un **JWT HS256** signé avec `JWT_SECRET`, avec expiration.
3. Toutes les routes protégées dérivent **le client depuis le JWT** (jamais d'`id` venant du corps de requête → pas d'IDOR).
4. Le **WebSocket `/ws`** est authentifié par jeton (la voix n'est pas ouverte sans login).

Défenses : pas de secret JWT par défaut faible (le backend **refuse de démarrer** hors `DEMO_MODE` sans `JWT_SECRET`), `DEMO_MODE` par défaut **false**, verrouillage de compte après échecs, rate-limit par IP, en-têtes anti-clickjacking / nosniff, CORS restreint.

## 5. Pipeline crédit (`run_credit_pipeline`)

Six étapes, chacune renvoyée comme `step` (id, agent, statut ok/warn/fail, résumé, détails) :

1. **`kyc` — Agent KYC** : CIN présente + compte actif.
2. **`capacite` — Agent Solvabilité** : mensualité (annuités constantes) ; **taux d'endettement ≤ 40 %** (charges actuelles + mensualité du nouveau crédit ÷ revenu).
3. **`fraude` — Agent Risque (BAM)** : `fail` si fiché Bank Al-Maghrib ; `warn` si incidents > 0 ; `ok` sinon.
4. **`scoring` — Agent Scoring** : score 0–100 (voir §7), seuil 60.
5. **`decision` — Agent Décision** : approuvé ssi `score ≥ 60` **ET** aucune **règle dure** (BAM, endettement > 40 %, KYC ko).
6. **`explication` — Agent Explication (XAI)** : texte naturel **Gemini** (`GEMINI_TEXT_MODEL`) si clé dispo, sinon **repli gabarit déterministe** (`_credit_explanation_template`). La décision ne dépend jamais de l'IA.

Retour : `decision`, `score`, `seuil`, `mensualite`, `tauxEndettement`, `coutTotal`, `contributions`, `explication`, `steps`.

## 6. Pipeline virement (`run_transfer_pipeline`)

Cinq étapes + signature OTP :

1. **`kyc` — Agent KYC** : donneur d'ordre + propriété du compte source (par défaut le compte `courant`).
2. **`provision` — Agent Comptes** : **solde effectif** = solde seed **moins** débits déjà appliqués dans la session (`data_store.get_solde_effectif`) ≥ montant.
3. **`limites` — Agent Limites** : montant ≤ **plafond par opération** ET cumul du jour ≤ **plafond quotidien** (`data_store.get_today_outgoing`).
4. **`fraude` — Agent Anti-fraude** : bénéficiaire connu ? ratio montant/solde ; `warn` si nouveau bénéficiaire / montant élevé.
5. **`decision` — Agent Décision** : autorisé ssi KYC + provision + limites OK → `requiresOtp:true`.

Puis **signature OTP** : `security.create_transfer_challenge` génère un *challenge* + OTP ; `verify_transfer_challenge` revérifie le solde (**re-check anti-TOCTOU**) avant d'exécuter, débite le compte (overlay `_session_solde`), écrit la transaction et la décision (`canal` selon l'origine).

## 7. Moteur de scoring (`scoring.py` ↔ `scoring.js`)

Constantes : `TAUX_ANNUEL = 0.0485`, `SEUIL_ACCEPTATION = 60`. Parité JS/Python via `_jsround(x) = floor(x + 0.5)`.

```
mensualité = montant·r / (1 − (1+r)^(−durée))      avec r = taux_annuel / 12
taux_endettement = (mensualité + autresCharges) / revenuMensuel

score = 50 (base)
  + endettement :  ≤40 % → round(((0.4−t)/0.4)·38)   borné [-45, +38]
                   >40 % → −round(((t−0.4)/0.2)·45)
  + revenu      :  clamp(round((revenu−8000)/1500), −8, +12)
  + ancienneté  :  clamp(round((ancienneté−12)/6), −5, +8)
  + incidents   :  −9 × nb_incidents
  + BAM         :  −35 si fiché, sinon +6
score = clamp(round(score), 0, 100)
```

Le **taux d'endettement** est le facteur dominant. La décision finale combine `score ≥ 60` et les **règles dures**.

> **Piège à ne pas corriger** : `risque.tauxEndettement` (dans `clients.json`) est le ratio **actuel** du client ; le % affiché dans une décision/XAI est le ratio **avec le crédit demandé** — ils diffèrent volontairement.

## 8. Assistant vocal (Gemini Live + function calling)

- `main.py` `/ws` relaie l'audio navigateur ↔ Gemini Live et déclare `tools=` dans `LiveConnectConfig`.
- Quand Gemini décide d'agir, il émet `message.tool_call.function_calls` → `voice_tools.handle` exécute l'outil :
  - **`evaluer_credit`** (montant, durée, objet) → `run_credit_pipeline` (`use_ai=False`).
  - **`preparer_virement`** (montant, bénéficiaire) → `run_transfer_pipeline` ; si autorisé, génère un OTP que le client lit à voix haute.
  - **`confirmer_virement`** (otp) → vérifie le challenge et exécute.
  - **`consulter_comptes`** → soldes + total.
- Chaque outil renvoie **(réponse au modèle, événement UI)** : la réponse structurée est lue à voix haute (l'assistant n'invente aucun chiffre), l'événement `tool_event` anime la pipeline dans `Assistant.jsx` (composant `Pipeline` partagé). Décisions et audit persistés avec `canal:"vocal"`.

## 9. Couche données

- **8 fichiers JSON** à la racine `data/` (le backend lit `DATA_DIR = backend/../data`), **générés** par `scripts/generate_data.py` (déterministe, **seed 42**) :
  `clients` (10 profils riches), `transactions` (dict par `clientId`), `decisions` (**dict par `clientId`**, ~117), `explainability` (~77), `pipeline-runs` (~117), `analytics` (globaux + `analyseParClient`×10), `agents` (6, catalogue d'affichage), `documents` (6, RAG).
- `users.json` est **généré au démarrage** depuis `clients.json` (non versionné).
- Le générateur **réutilise le modèle de scoring** (mêmes constantes, `_jsround`) pour que l'historique colle au moteur live.
- **Schéma client riche** : `personnel{civilite, genre, age, adresse{...}, pieceIdentite, cin}`, `professionnel{revenuMensuel, autresRevenus, revenuAnnuel, ancienneteMois, ...}`, `bancaire{agence, conseiller, segment, scoreInterne, chargesMensuelles, comptes[+rib/iban], cartes[], plafonds{virementParOperation, virementQuotidien}, beneficiaires[], creditsEnCours[]}`, `risque{tauxEndettement, incidentsPaiement, fichageBam, niveauRisque, scoreBam}`, `photo`.

## 10. État du câblage

| Domaine | État |
|---------|------|
| Login 2FA, JWT, autorisations | **Réel** |
| Pipeline crédit / virement (Operations) | **Réel** |
| Assistant vocal → vraie pipeline | **Réel** |
| Scoring (Simulateur, XAI calc) | **Réel** (parité front/back) |
| XAI, Analytics, Supervision, Documents/RAG | **Encore mock** (`mockData.js`) — câblage aux vrais `data/*.json` = prochaine étape |
