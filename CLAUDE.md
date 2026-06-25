# CLAUDE.md

Ce fichier est lu automatiquement par Claude Code à chaque session. Le contexte du
projet (identité, stack, conventions, pièges, agents) est maintenu dans `AGENTS.md`,
importé ci-dessous, afin qu'aucune décision importante ne soit perdue lors d'un compactage.

@AGENTS.md

## Documents de référence
- Architecture technique détaillée : `docs/architecture.md`
- Journal des décisions (ADR) : `docs/decisions.md`
- Vue produit & démarrage : `README.md`

## Rappels rapides (détails dans AGENTS.md)
- Données à la racine `data/` (le backend lit `backend/../data`), **générées** par `python scripts/generate_data.py` (seed 42).
- `data/decisions.json` = **données de l'app**, PAS les décisions de projet (celles-ci → `docs/decisions.md`).
- Scoring : base 50, **seuil 60**, plafond d'endettement **40 %** ; `scoring.py` ↔ `scoring.js` en parité exacte (`_jsround`).
- Profils phares à préserver : Yasmina **79/approuvé**, Karim **0/refusé**, Sara **87/approuvé**.
- Ne pas « corriger » : `risque.tauxEndettement` (actuel) ≠ % de la décision (avec le crédit demandé).
