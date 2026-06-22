import secrets
import time

def generate_pipeline_run(decision_id, client_id, result):
    """Génère l'objet `pipeline_run` à partir du résultat du pipeline (`result['steps']`)."""
    etapes = []
    duree_totale = 0
    for s in result.get("steps", []):
        dms = s.get("durationMs", 0)
        duree_totale += dms
        etapes.append({
            "agentId": s.get("id"),
            "agent": s.get("name"),
            "statut": "succès" if s.get("status") == "ok" else ("échec" if s.get("status") == "fail" else "avertissement"),
            "dureeMs": dms,
            "sortie": s.get("summary")
        })

    return {
        "runId": "RUN-" + secrets.token_hex(2).upper(),
        "decisionId": decision_id,
        "clientId": client_id,
        "horodatage": time.strftime("%Y-%m-%d %H:%M:%S"),
        "dureeTotaleMs": duree_totale,
        "statutGlobal": "terminé",
        "etapes": etapes
    }
