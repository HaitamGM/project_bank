"""Façade stable de la pipeline de vérification crédit / virement.

⚠️ L'IMPLÉMENTATION vit désormais dans app/agents/ — architecture multi-agents
(un fichier par agent + orchestrateur). Ce module reste le POINT D'ACCÈS attendu par
voice_tools.py et pipeline_routes.py : mêmes fonctions, mêmes signatures, mêmes sorties.

Pour revenir à l'ancienne implémentation monolithique, consulter l'historique Git.
"""
from .agents.orchestrator import run_credit_pipeline, run_transfer_pipeline  # noqa: F401
from .agents.llm import ask as ai_explanation  # rétro-compatibilité  # noqa: F401

__all__ = ["run_credit_pipeline", "run_transfer_pipeline", "ai_explanation"]
