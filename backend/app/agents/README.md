# 🤖 Architecture multi-agents — BankIA

Chaque **agent** a une seule responsabilité métier (un fichier, une classe). Un
**orchestrateur** les enchaîne en partageant un **contexte**, collecte la trace (`steps`)
et agrège la décision.

```
agents/
├── base.py            # classe Agent (run/reason/emit) + helpers
├── context.py         # CreditContext / TransferContext (état partagé)
├── llm.py             # accès Gemini best-effort (avis / explication)
├── credit_agents.py   # Identité → Solvabilité → Anti-fraude → Scoring → Décision → Explication
├── transfer_agents.py # Identité → Provision → Plafonds → Anti-fraude → Décision
└── orchestrator.py    # run_credit_pipeline / run_transfer_pipeline  (API drop-in)
```

## Brancher l'app dessus (1 ligne, quand tu valides)

Les appelants (`voice_tools.py`, `pipeline_routes.py`) importent `pipeline` et appellent
`pipeline.run_credit_pipeline(...)` / `pipeline.run_transfer_pipeline(...)`.
L'orchestrateur expose **exactement les mêmes signatures et sorties**. Pour basculer sans
toucher aux appelants, il suffit de faire de `pipeline.py` un ré-export :

```python
# backend/app/pipeline.py
from .agents.orchestrator import run_credit_pipeline, run_transfer_pipeline  # noqa: F401
```

(Parité vérifiée : Yasmina 79/approuvé, Karim 0/refusé, Sara 87/approuvé — identique à l'ancien code.)

## Rendre un agent « intelligent » (étape suivante)

Chaque agent hérite de `Agent` et peut surcharger **`reason(ctx)`** pour produire un avis
en langage naturel via Gemini (`from .llm import ask`). Aujourd'hui seul l'`ExplicationAgent`
appelle Gemini ; on peut, agent par agent, ajouter :

- **Anti-fraude** : faire raisonner Gemini sur des signaux faibles (libellés de virements,
  vélocité, bénéficiaire inhabituel) et renvoyer un niveau de risque argumenté.
- **Solvabilité** : commentaire sur la soutenabilité (saisonnalité des revenus, reste à vivre).
- **Conformité** : citer la règle BAM/RAG applicable.

Garder la **décision déterministe** (règles dures + scoring) ; l'IA ajoute du **raisonnement
et de l'explication**, jamais le verdict — c'est l'approche hybride choisie.

## Tester

```bash
cd backend && ./.venv/Scripts/python.exe -c "from app.agents import run_credit_pipeline; \
from app import data_store; \
print(run_credit_pipeline(data_store.get_client_by_id('CL-2024-0042'), 600000, 240, 'immobilier', 0, False)['score'])"
```
