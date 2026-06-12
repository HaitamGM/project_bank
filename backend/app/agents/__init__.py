"""Architecture multi-agents BankIA.

Un agent = une responsabilité métier isolée (un fichier / une classe). L'orchestrateur
les enchaîne en partageant un contexte, collecte la trace (steps) et agrège la décision.

POINT D'ENTRÉE (drop-in, mêmes signatures que l'ancien pipeline.py) :
    from .agents import run_credit_pipeline, run_transfer_pipeline

Chaque agent peut être « intelligent » : sa méthode .reason(ctx) peut interroger Gemini
pour produire un avis en langage naturel (désactivé par défaut pour la vitesse/parité).
"""
from .orchestrator import run_credit_pipeline, run_transfer_pipeline

__all__ = ["run_credit_pipeline", "run_transfer_pipeline"]
