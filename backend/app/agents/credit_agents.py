"""Agents de la chaîne CRÉDIT.

Ordre : Identité (KYC) → Solvabilité → Anti-fraude/BAM → Scoring → Décision → Explication.
La logique déterministe reproduit EXACTEMENT l'ancien pipeline.py (parité de décision).
"""
from .. import config, data_store
from ..scoring import SEUIL_ACCEPTATION, mensualite, score_credit
from .base import Agent, fmt
from .llm import ask


class IdentiteAgent(Agent):
    id, name, agent, tech = "kyc", "Vérification d'identité (KYC)", "Agent KYC", "Conformité · CIN/BAM"
    duration_ms = 280

    def run(self, ctx):
        p = ctx.client.get("personnel", {})
        banc = ctx.client.get("bancaire", {})
        ctx.kyc_ok = bool(p.get("cin")) and banc.get("compteActif", True)
        summary = (f"Identité confirmée — CIN {p.get('cin', '?')}, client depuis {banc.get('clientDepuis', '?')}"
                   if ctx.kyc_ok else "Identité ou compte non vérifiés")
        return self.emit(ctx, "ok" if ctx.kyc_ok else "fail", summary,
                         {"cin": p.get("cin"), "segment": banc.get("segment"),
                          "compteActif": banc.get("compteActif", True)})


class SolvabiliteAgent(Agent):
    id, name, agent, tech = "capacite", "Capacité de remboursement", "Agent Solvabilité", "Calcul d'annuités"
    duration_ms = 240

    def run(self, ctx):
        ctx.mensualite = mensualite(ctx.montant, ctx.duree_mois)
        ctx.result = score_credit(
            revenuMensuel=ctx.revenu, montant=ctx.montant, dureeMois=ctx.duree_mois,
            autresCharges=ctx.charges_actuelles + ctx.autres_charges_demande,
            ancienneteMois=ctx.client.get("professionnel", {}).get("ancienneteMois", 0),
            incidentsPaiement=ctx.incidents, fichageBam=ctx.bam,
        )
        ctx.taux_endettement = ctx.result["tauxEndettement"]
        ctx.capacite_ok = ctx.taux_endettement <= 0.40
        return self.emit(
            ctx, "ok" if ctx.capacite_ok else "fail",
            f"Mensualité ≈ {fmt(ctx.mensualite)} DH · taux d'endettement {round(ctx.taux_endettement * 100)} % "
            f"({'≤' if ctx.capacite_ok else '>'} plafond 40 %)",
            {"mensualite": round(ctx.mensualite), "chargesActuelles": ctx.charges_actuelles,
             "tauxEndettement": round(ctx.taux_endettement, 4), "revenuMensuel": ctx.revenu},
        )


class FraudeAgent(Agent):
    id, name, agent, tech = "fraude", "Anti-fraude & conformité", "Agent Risque", "Fichier central BAM"
    duration_ms = 300

    def run(self, ctx):
        if ctx.bam:
            status, msg = "fail", "Client fiché Bank Al-Maghrib — octroi bloqué"
        elif ctx.incidents > 0:
            status, msg = "warn", f"{ctx.incidents} incident(s) de paiement sur 12 mois"
        else:
            status, msg = "ok", "Aucun incident, non fiché BAM"
        return self.emit(ctx, status, msg, {"fichageBam": ctx.bam, "incidentsPaiement": ctx.incidents})


class ScoringAgent(Agent):
    id, name, agent, tech = "scoring", "Scoring de crédit", "Agent Scoring", "Modèle explicable (0–100)"
    duration_ms = 260

    def run(self, ctx):
        return self.emit(
            ctx, "ok", f"Score {ctx.result['score']}/100 (seuil {SEUIL_ACCEPTATION})",
            {"score": ctx.result["score"], "seuil": SEUIL_ACCEPTATION, "contributions": ctx.result["contributions"]},
        )


class DecisionAgent(Agent):
    id, name, agent, tech = "decision", "Décision finale", "Agent Décision", "Seuil + règles dures"
    duration_ms = 130

    def run(self, ctx):
        hard_fail = ctx.bam or not ctx.capacite_ok or not ctx.kyc_ok
        ctx.approved = ctx.result["score"] >= SEUIL_ACCEPTATION and not hard_fail
        return self.emit(
            ctx, "ok" if ctx.approved else "fail",
            "Crédit approuvé" if ctx.approved else "Crédit refusé",
            {"approuve": ctx.approved, "score": ctx.result["score"], "seuil": SEUIL_ACCEPTATION},
        )


class ExplicationAgent(Agent):
    id, name, agent = "explication", "Explication (XAI)", "Agent Explication"
    duration_ms = 320

    def run(self, ctx):
        ctx.explication = self._template(ctx)
        if ctx.use_ai:
            ai = ask(self._prompt(ctx))
            if ai:
                ctx.explication = ai
        tech = "Gemini · génération" if config.GEMINI_API_KEY else "Gabarit déterministe"
        self.tech = tech
        return self.emit(ctx, "ok", "Justificatif en langage naturel généré",
                         {"texte": ctx.explication}, self.duration_ms)

    def _template(self, ctx):
        p = ctx.client.get("personnel", {})
        nom = f"{p.get('prenom', '')} {p.get('nom', '')}".strip()
        base = f"Demande de crédit {ctx.objet} de {fmt(ctx.montant)} DH sur {ctx.duree_mois} mois pour {nom or 'le client'}. "
        if ctx.approved:
            return base + (
                f"Décision favorable : score {ctx.result['score']}/100 au-dessus du seuil de {SEUIL_ACCEPTATION}, "
                f"taux d'endettement de {round(ctx.taux_endettement * 100)} % sous le plafond réglementaire de 40 %, historique sain."
            )
        motifs = []
        if ctx.bam:
            motifs.append("client fiché Bank Al-Maghrib")
        if ctx.taux_endettement > 0.40:
            motifs.append(f"taux d'endettement de {round(ctx.taux_endettement * 100)} % au-dessus du plafond de 40 %")
        if ctx.incidents > 0:
            motifs.append(f"{ctx.incidents} incident(s) de paiement")
        if not motifs:
            motifs.append(f"score {ctx.result['score']}/100 sous le seuil de {SEUIL_ACCEPTATION}")
        return base + "Décision défavorable : " + ", ".join(motifs) + "."

    def _prompt(self, ctx):
        return (
            "Tu es un conseiller bancaire marocain. Rédige en français, en 2 phrases claires et "
            "professionnelles, l'explication de cette décision de crédit pour le client. "
            f"Décision : {'APPROUVÉ' if ctx.approved else 'REFUSÉ'}. "
            f"Montant : {round(ctx.montant)} DH sur {ctx.duree_mois} mois ({ctx.objet}). "
            f"Score : {ctx.result['score']}/100 (seuil {SEUIL_ACCEPTATION}). "
            f"Taux d'endettement avec ce crédit : {round(ctx.taux_endettement * 100)} % (plafond 40 %). "
            f"Fiché BAM : {'oui' if ctx.bam else 'non'}. Incidents : {ctx.incidents}. "
            "Ne donne aucun chiffre faux, reste factuel."
        )


# Politiques applicables par objet de crédit (titres = ceux de data/documents.json).
RAG_PAR_OBJET = {
    "immobilier": ["Politique de crédit immobilier 2026", "Circulaire Bank Al-Maghrib 1/G/2020"],
    "consommation": ["Conditions générales du crédit à la consommation", "Circulaire Bank Al-Maghrib 1/G/2020"],
    "auto": ["Barème des crédits automobiles", "Circulaire Bank Al-Maghrib 1/G/2020"],
    "personnel": ["Conditions générales du crédit à la consommation"],
    "travaux": ["Politique de crédit immobilier 2026", "Circulaire Bank Al-Maghrib 1/G/2020"],
}


class ConformiteAgent(Agent):
    """Agent INTELLIGENT (RAG) : ancre la décision dans la base documentaire réelle
    (data/documents.json). Sélectionne la/les politique(s) applicable(s) à l'objet du
    crédit, vérifie chaque règle clé (endettement ≤ 40 %, consultation BAM) et cite ses
    sources. Grounding documentaire — ne change pas le verdict, il le justifie."""
    id, name, agent, tech = "conformite", "Conformité réglementaire (RAG)", "Agent Conformité", "Recherche documentaire"
    duration_ms = 360

    def run(self, ctx):
        docs = self._retrieve(ctx.objet)
        checks = [
            ("Taux d'endettement ≤ 40 %", ctx.taux_endettement <= 0.40, f"{round(ctx.taux_endettement * 100)} %"),
            ("Consultation Bank Al-Maghrib", not ctx.bam, "fiché" if ctx.bam else "non fiché"),
        ]
        nb_ok = sum(1 for _, ok, _ in checks if ok)
        if ctx.bam or ctx.taux_endettement > 0.40:
            status = "fail"
        elif nb_ok < len(checks):
            status = "warn"
        else:
            status = "ok"
        titres = [d["titre"] for d in docs]
        summary = (f"{nb_ok}/{len(checks)} règles respectées — décision adossée à : " + " · ".join(titres)
                   if titres else f"{nb_ok}/{len(checks)} règles respectées")
        return self.emit(ctx, status, summary, {
            "regles": [{"regle": r, "respectee": ok, "valeur": v} for r, ok, v in checks],
            "sources": [{"docId": d.get("id"), "titre": d.get("titre"), "extrait": d.get("extrait")} for d in docs],
        })

    def _retrieve(self, objet):
        try:
            alldocs = data_store.load_json("documents.json")
        except Exception:  # noqa: BLE001
            return []
        wanted = RAG_PAR_OBJET.get(objet, ["Circulaire Bank Al-Maghrib 1/G/2020"])
        # Conserve l'ordre de `wanted`.
        by_titre = {d.get("titre"): d for d in alldocs}
        return [by_titre[t] for t in wanted if t in by_titre]


# Ordre d'exécution de la chaîne crédit (7 agents : conformité RAG insérée avant la décision).
CREDIT_AGENTS = [
    IdentiteAgent(), SolvabiliteAgent(), FraudeAgent(), ScoringAgent(),
    ConformiteAgent(), DecisionAgent(), ExplicationAgent(),
]
