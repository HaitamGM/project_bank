"""Abstractions communes aux agents : classe de base, format d'une étape, helpers."""


def fmt(n) -> str:
    """Formate un nombre avec séparateur d'espace (style marocain/français)."""
    return f"{round(n):,}".replace(",", " ")


def make_step(id, name, agent, tech, status, summary, details=None, duration_ms=200):
    """Construit l'entrée de trace d'un agent (format consommé par l'UI Pipeline)."""
    return {
        "id": id, "name": name, "agent": agent, "tech": tech,
        "status": status, "summary": summary, "details": details or {}, "durationMs": duration_ms,
    }


class Agent:
    """Agent métier. Sous-classer et implémenter `run(ctx)`.

    Attributs de classe (métadonnées affichées dans la trace) :
      id   — identifiant court (kyc, capacite, scoring…)
      name — libellé lisible
      agent— nom de l'agent
      tech — technologie/méthode

    `run(ctx)` lit/écrit le contexte partagé, ajoute son étape à `ctx.steps`
    et renvoie cette étape. `reason(ctx)` est un point d'extension optionnel
    pour un avis généré par LLM (renvoie None par défaut).
    """
    id: str = ""
    name: str = ""
    agent: str = ""
    tech: str = ""
    duration_ms: int = 200

    def run(self, ctx):  # pragma: no cover - interface
        raise NotImplementedError

    def reason(self, ctx):
        """Avis optionnel en langage naturel (Gemini). None = pas d'avis."""
        return None

    def emit(self, ctx, status, summary, details=None, duration_ms=None):
        step = make_step(self.id, self.name, self.agent, self.tech, status, summary,
                         details, duration_ms or self.duration_ms)
        ctx.steps.append(step)
        return step
