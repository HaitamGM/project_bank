import math
from datetime import datetime, timedelta

def _jsround(x):
    return math.floor(x + 0.5)

def calculate_analytics(clients_data, decisions_data, pipeline_runs):
    # Flatten decisions
    flat = []
    if isinstance(decisions_data, dict):
        for cid, dlist in decisions_data.items():
            flat.extend(dlist)
    elif isinstance(decisions_data, list):
        flat = decisions_data

    credits = [d for d in flat if "credit" in d.get("type", "")]
    virements = [d for d in flat if d.get("type") == "virement"]
    approuves = [d for d in flat if d.get("statut") in ("approuve", "execute")]
    montant_accorde = sum(d.get("montant", 0) for d in credits if d.get("statut") == "approuve")
    duree_moy = _jsround(sum(r.get("dureeTotaleMs", 0) for r in pipeline_runs) / len(pipeline_runs)) if pipeline_runs else 0

    evolution = []
    now = datetime.now()
    for m in range(11, -1, -1):
        cle = (now - timedelta(days=m * 30)).strftime("%Y-%m")
        dm = [d for d in flat if d.get("date", "").startswith(cle)]
        evolution.append({"mois": cle, "total": len(dm),
                          "approuves": len([d for d in dm if d.get("statut") in ("approuve", "execute")]),
                          "refuses": len([d for d in dm if d.get("statut") == "refuse"])})

    buckets = {"0-40": 0, "40-60": 0, "60-80": 0, "80-100": 0}
    for d in credits:
        s = d.get("score") or 0
        k = "0-40" if s < 40 else "40-60" if s < 60 else "60-80" if s < 80 else "80-100"
        buckets[k] += 1

    par_client = []
    by_id = {c["id"]: c for c in clients_data} if isinstance(clients_data, list) else {}

    # Group decisions by client id
    decisions_by_cid = {}
    for d in flat:
        cid = d.get("clientId")
        if cid:
            decisions_by_cid.setdefault(cid, []).append(d)

    for cid, lst in decisions_by_cid.items():
        client_info = by_id.get(cid, {})
        client_nom = "Inconnu"
        segment = "Inconnu"
        if client_info:
             client_nom = f"{client_info.get('personnel', {}).get('prenom', '')} {client_info.get('personnel', {}).get('nom', '')}".strip()
             segment = client_info.get("bancaire", {}).get("segment", "Inconnu")

        cred = [d for d in lst if "credit" in d.get("type", "")]
        scores = [d["score"] for d in cred if d.get("score") is not None]
        par_client.append({
            "clientId": cid,
            "clientNom": client_nom,
            "segment": segment,
            "totalDecisions": len(lst),
            "credits": len(cred),
            "virements": len([d for d in lst if d.get("type") == "virement"]),
            "tauxApprobation": round(len([d for d in lst if d.get("statut") in ("approuve", "execute")]) / len(lst), 3) if lst else 0,
            "montantAccorde": round(sum(d.get("montant", 0) for d in cred if d.get("statut") == "approuve"), 2),
            "scoreMoyen": _jsround(sum(scores) / len(scores)) if scores else None,
        })

    # repartition par type
    rep_credit = len(credits)
    rep_virement = len(virements)

    return {
        "genereLe": now.strftime("%Y-%m-%d"),
        "totalDecisions": len(flat),
        "totalCredits": len(credits),
        "totalVirements": len(virements),
        "tauxApprobation": round(len(approuves) / len(flat), 3) if flat else 0,
        "montantTotalAccorde": round(montant_accorde, 2),
        "tempsDecisionMoyenMs": duree_moy,
        "repartitionParType": {"credit": rep_credit, "virement": rep_virement},
        "repartitionParStatut": {
            "approuve": len([d for d in credits if d.get("statut") == "approuve"]),
            "execute": len([d for d in flat if d.get("statut") == "execute"]),
            "refuse": len([d for d in flat if d.get("statut") == "refuse"]),
        },
        "evolutionMensuelle": evolution,
        "distributionScoresCredit": buckets,
        "analyseParClient": par_client
    }
