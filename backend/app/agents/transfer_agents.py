"""Agents de la chaîne VIREMENT.

Ordre : Identité (KYC) → Provision (solde effectif) → Plafonds → Anti-fraude → Décision.
Logique déterministe identique à l'ancien pipeline.py (débit réel via overlay, cumul quotidien).
"""
from .. import data_store
from .base import Agent, fmt
from .llm import ask


class IdentiteAgent(Agent):
    id, name, agent, tech = "kyc", "Vérification d'identité (KYC)", "Agent KYC", "Conformité"
    duration_ms = 250

    def run(self, ctx):
        p = ctx.client.get("personnel", {})
        comptes = ctx.client.get("bancaire", {}).get("comptes", [])
        source = None
        if ctx.compte_source_rib:
            source = next((c for c in comptes if c["rib"] == ctx.compte_source_rib), None)
        if source is None:
            source = next((c for c in comptes if c.get("type") == "courant"), comptes[0] if comptes else None)
        ctx.source = source
        ctx.kyc_ok = bool(p.get("cin")) and source is not None
        summary = (f"Donneur d'ordre vérifié — compte {source.get('type')} ({source.get('rib')})"
                   if ctx.kyc_ok else "Compte source introuvable")
        return self.emit(ctx, "ok" if ctx.kyc_ok else "fail", summary,
                         {"compteSource": source.get("rib") if source else None})


class ProvisionAgent(Agent):
    id, name, agent, tech = "provision", "Contrôle de provision", "Agent Comptes", "Solde disponible"
    duration_ms = 200

    def run(self, ctx):
        client_id = ctx.client.get("id")
        solde_seed = ctx.source.get("solde", 0) if ctx.source else 0
        ctx.solde = data_store.get_solde_effectif(client_id, ctx.source["rib"], solde_seed) if ctx.source else 0
        ctx.solde_ok = ctx.solde >= ctx.montant
        return self.emit(
            ctx, "ok" if ctx.solde_ok else "fail",
            f"Solde {fmt(ctx.solde)} DH {'≥' if ctx.solde_ok else '<'} montant {fmt(ctx.montant)} DH",
            {"solde": ctx.solde, "montant": ctx.montant},
        )


class LimitesAgent(Agent):
    id, name, agent, tech = "limites", "Plafonds & limites", "Agent Limites", "Règles internes"
    duration_ms = 180

    def run(self, ctx):
        client_id = ctx.client.get("id")
        plafonds = ctx.client.get("bancaire", {}).get("plafonds", {})
        ctx.plafond_op = plafonds.get("virementParOperation", 50000)
        ctx.plafond_jour = plafonds.get("virementQuotidien", 100000)
        ctx.total_jour = data_store.get_today_outgoing(client_id) if client_id else 0
        ctx.op_ok = ctx.montant <= ctx.plafond_op
        ctx.jour_ok = (ctx.total_jour + ctx.montant) <= ctx.plafond_jour
        limite_ok = ctx.op_ok and ctx.jour_ok
        if not ctx.op_ok:
            msg = f"Montant {fmt(ctx.montant)} DH > plafond/opération {fmt(ctx.plafond_op)} DH"
        elif not ctx.jour_ok:
            msg = f"Cumul du jour {fmt(ctx.total_jour + ctx.montant)} DH > plafond quotidien {fmt(ctx.plafond_jour)} DH"
        else:
            msg = (f"Montant ≤ {fmt(ctx.plafond_op)} DH/op · cumul jour "
                   f"{fmt(ctx.total_jour + ctx.montant)} ≤ {fmt(ctx.plafond_jour)} DH")
        return self.emit(ctx, "ok" if limite_ok else "fail", msg,
                         {"plafondOperation": ctx.plafond_op, "plafondQuotidien": ctx.plafond_jour,
                          "cumulJour": ctx.total_jour})


class FraudeAgent(Agent):
    """Agent INTELLIGENT (hybride) : règles déterministes pour le statut + raisonnement
    Gemini pour un avis de risque argumenté (sur le bénéficiaire, le montant et l'historique
    récent du client). L'IA n'autorise jamais ; elle évalue et explique le risque."""
    id, name, agent, tech = "fraude", "Analyse anti-fraude", "Agent Anti-fraude", "Scoring transaction"
    duration_ms = 240

    def run(self, ctx):
        benefs = ctx.client.get("bancaire", {}).get("beneficiaires", [])
        ctx.known = any((b.get("nom", "").strip().lower() == ctx.beneficiaire.strip().lower()) for b in benefs)
        ctx.ratio = (ctx.montant / ctx.solde) if ctx.solde else 1
        if not ctx.known and ctx.ratio > 0.5:
            status, msg = "warn", "Nouveau bénéficiaire et montant élevé — vérification renforcée requise"
        elif not ctx.known:
            status, msg = "warn", "Bénéficiaire non enregistré — confirmation OTP requise"
        else:
            status, msg = "ok", "Bénéficiaire enregistré et habituel"

        details = {"beneficiaireConnu": ctx.known, "ratioSolde": round(ctx.ratio, 2)}
        if ctx.use_ai:
            avis = self.reason(ctx)
            if avis:
                details["avis"] = avis
                msg = f"{msg} · Avis IA : {avis}"
                self.tech = "Gemini · raisonnement anti-fraude"
        return self.emit(ctx, status, msg, details)

    def reason(self, ctx):
        """Avis de risque en une phrase, via Gemini (best-effort, repli silencieux)."""
        recent = []
        try:
            for t in data_store.get_transactions(ctx.client.get("id")):
                if t.get("montant", 0) < 0:
                    recent.append(f"{t.get('libelle', '?')} {fmt(abs(t['montant']))} DH")
                if len(recent) >= 5:
                    break
        except Exception:  # noqa: BLE001
            pass
        prompt = (
            "Tu es un agent anti-fraude bancaire marocain. En UNE seule phrase courte en français, "
            "donne un niveau de risque (faible / modéré / élevé) et la raison principale pour ce VIREMENT. "
            "Ne donne PAS de verdict d'autorisation, uniquement l'évaluation du risque, de façon factuelle.\n"
            f"- Montant : {round(ctx.montant)} DH\n"
            f"- Bénéficiaire : {ctx.beneficiaire} ({'enregistré et habituel' if ctx.known else 'NOUVEAU, non enregistré'})\n"
            f"- Solde disponible : {round(ctx.solde)} DH (le virement représente {round(ctx.ratio * 100)} % du solde)\n"
            f"- Derniers débits du client : {', '.join(recent) if recent else 'aucun'}"
        )
        return ask(prompt)


class DecisionAgent(Agent):
    id, name, agent, tech = "decision", "Décision", "Agent Décision", "Agrégation des contrôles"
    duration_ms = 120

    def run(self, ctx):
        ctx.approved = ctx.kyc_ok and ctx.solde_ok and ctx.op_ok and ctx.jour_ok
        if not ctx.approved:
            if not ctx.kyc_ok:
                ctx.motif = "Identité / compte non vérifiés"
            elif not ctx.solde_ok:
                ctx.motif = "Solde insuffisant"
            elif not ctx.op_ok:
                ctx.motif = f"Montant au-dessus du plafond par opération ({fmt(ctx.plafond_op)} DH)"
            elif not ctx.jour_ok:
                ctx.motif = "Plafond de virement quotidien dépassé"
        return self.emit(
            ctx, "ok" if ctx.approved else "fail",
            "Virement autorisé — signature OTP requise" if ctx.approved else "Virement refusé",
            {"approuve": ctx.approved},
        )


TRANSFER_AGENTS = [
    IdentiteAgent(), ProvisionAgent(), LimitesAgent(), FraudeAgent(), DecisionAgent(),
]
