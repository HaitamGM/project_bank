# Journal des décisions (ADR) — BankIA

> Décisions **structurantes du projet** (architecture, sécurité, design). À ne pas confondre avec `data/decisions.json`, qui contient les **données métier** (décisions de crédit/virement des clients). Une décision par entrée, la plus récente en haut.

Format : `ADR-NNN — Titre · Date · Statut (accepté / remplacé / abandonné)`.

---

## ADR-011 — Assistant multimodal (clavier) + orchestration des agents · 2026-06-12 · accepté
**Contexte** : certains utilisateurs ne peuvent/veulent pas parler ; le jury attend une présentation « moderne » du travail des agents.
**Décision** :
- **Entrée clavier** en plus de la voix. Front `geminiLiveClient.sendText()` → message WS `{type:'text'}` → backend `session.send_client_content(...)`. La **réponse reste vocale** (modality AUDIO) **et écrite en temps réel** (transcription de sortie, déjà câblée). Le **micro est désormais optionnel** (best-effort) : en cas de refus/absence, la session continue en **mode texte seul**. Démarrage possible directement au clavier (`startSession({withMic:false, initialText})`).
- **Vue d'orchestration** : nouveau composant `frontend/src/components/AgentOrchestration.jsx` (flux horizontal animé : nœuds-agents, connecteurs qui se remplissent, paquet de données, agent actif, latences, progression). `useStepReveal` exporté depuis `Pipeline.jsx` pour **synchroniser** l'orchestration et le détail par agent sur le même tempo.
**Perf** : animations transform/opacity/width uniquement (GPU) ; pas de double minuterie (le hook interne de `PipelineView` est neutralisé quand le parent fournit le tempo).
**Validé** : `npm run build` OK, `py_compile` backend OK.

## ADR-010 — Persistance du contexte projet en fichiers versionnés · 2026-06-12 · accepté
**Contexte** : le contexte important risque d'être perdu lors d'un compactage de la conversation Claude.
**Décision** : maintenir le contexte hors mémoire de conversation, dans des fichiers du dépôt : `AGENTS.md` (source de vérité agents), `CLAUDE.md` (importe `AGENTS.md`, lu à chaque session), `docs/architecture.md`, `docs/decisions.md`, `README.md`.
**Conséquence** : `data/decisions.json` reste réservé aux **données de l'app** ; les décisions de **projet** vont ici.

## ADR-009 — La voix déclenche la VRAIE pipeline (function calling) · 2026-06 · accepté
**Décision** : Gemini Live appelle 4 outils (`evaluer_credit`, `preparer_virement`, `confirmer_virement`, `consulter_comptes`) dans `voice_tools.py`, qui exécutent **les mêmes agents** que l'écran Operations.
**Pourquoi** : l'assistant ne doit **jamais** inventer un score/solde/décision ; tout vient de la pipeline. `use_ai=False` côté voix (l'assistant verbalise lui-même) pour la rapidité.
**Conséquence** : un `tool_event` est renvoyé à l'UI pour animer la pipeline en direct ; décisions/audit persistés avec `canal:"vocal"`.

## ADR-008 — Données générées de façon déterministe · 2026-06 · accepté
**Décision** : `scripts/generate_data.py` (seed 42) génère les 8 JSON de `data/` à la racine, en **réutilisant le modèle de scoring** pour que l'historique colle au moteur live.
**Pourquoi** : cohérence totale entre données affichées et décisions recalculables ; reproductibilité.
**Conséquence** : `data/` à la **racine** (le backend lit `backend/../data`), pas `backend/data/`. Régénération : `python scripts/generate_data.py`.

## ADR-007 — Durcissement sécurité (revue adversariale) · 2026-06 · accepté
**Décision** : après revue multi-agents (10 correctifs) : pas de secret JWT par défaut (refus de démarrer hors `DEMO_MODE`), `DEMO_MODE` par défaut **false**, débit réel du solde + re-check anti-TOCTOU à la confirmation, plafond quotidien appliqué, rate-limit + verrouillage de compte, en-têtes de sécurité, autorisation **dérivée du jeton** (pas d'IDOR), WebSocket authentifié.
**Statut** : accepté ; mesures documentées dans `README.md` et `docs/architecture.md`.

## ADR-006 — Authentification 2FA + JWT · 2026-06 · accepté
**Décision** : login mot de passe (**bcrypt**) → **OTP 2FA** 6 chiffres → **JWT HS256** expirant. `users.json` auto-seedé depuis `clients.json` au démarrage (mot de passe démo `BankIA@2026`).
**Pourquoi** : crédibilité « grade banque » pour la soutenance, sans backend lourd.

## ADR-005 — Backend FastAPI modulaire · 2026-06 · accepté
**Décision** : découpage `backend/app/{config, security, data_store, schemas, auth, pipeline, pipeline_routes, scoring, main}.py` (deps : bcrypt, pyjwt, email-validator, google-genai).
**Pourquoi** : lisibilité, testabilité, séparation claire des responsabilités.

## ADR-004 — Parité scoring front/back (`_jsround`) · 2026-06 · accepté
**Décision** : `scoring.py` est un **port fidèle** de `scoring.js` ; arrondi `_jsround(x)=floor(x+0.5)` pour reproduire `Math.round` JS au bit près.
**Conséquence** : Simulateur (front) et pipeline (back) donnent le **même** score. Yasmina = **79** (les seeds « 78 » sont narratifs, non corrigés).

## ADR-003 — `tauxEndettement` actuel ≠ avec crédit · accepté
**Décision** : `risque.tauxEndettement` représente l'endettement **actuel** ; le % d'une décision/XAI est l'endettement **avec le crédit demandé**.
**Pourquoi** : c'est métier, pas un bug. **Ne pas « harmoniser ».**

## ADR-002 — Identité visuelle émeraude / vert · accepté
**Décision** : palette **émeraude/vert**, UI **française**, sections « qualité jury ». Le **violet** initial a été **rejeté**.
**Référence** : mémoire `design-emerald-fintech`.

## ADR-001 — Concept : banque vocale, automatisée et transparente · accepté
**Décision** : démonstration d'une banque où le client opère **par la voix (darija)** ; des **agents** décident de façon autonome et le système **explique** chaque décision (XAI).
**3 profils phares** (à préserver) : Yasmina (immo → 79, approuvé), Karim (fiché BAM → 0, refusé), Sara (immo → 87, approuvé).
