"""Accès Gemini pour les agents (best-effort, repli silencieux).

Permet à un agent de produire un avis / une explication en langage naturel.
Si la clé est absente ou l'appel échoue, renvoie None et l'agent retombe sur son
gabarit déterministe — la décision n'en dépend jamais.
"""
from .. import config


def ask(prompt: str) -> str | None:
    if not config.GEMINI_API_KEY:
        return None
    try:
        from google import genai
        client = genai.Client(api_key=config.GEMINI_API_KEY)
        resp = client.models.generate_content(model=config.GEMINI_TEXT_MODEL, contents=prompt)
        text = (getattr(resp, "text", "") or "").strip()
        return text or None
    except Exception as e:  # noqa: BLE001
        print(f"[agents.llm] Gemini indisponible, repli déterministe : {e}")
        return None
