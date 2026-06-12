"""
Générateur de données BankIA — données bancaires marocaines réalistes, riches et cohérentes.

Produit 8 fichiers JSON dans data/ + un avatar SVG par client dans frontend/public/avatars/ :
  clients.json, transactions.json, decisions.json, explainability.json,
  pipeline-runs.json, analytics.json, agents.json, documents.json

Particularités :
- Déterministe (seed fixe) → mêmes données à chaque exécution.
- Schéma RICHE compatible avec le backend/front actuels (auth, pipeline, page Profil).
- PARITÉ DE SCORING : utilise exactement le moteur de scoring.js / backend/app/scoring.py
  (base 50 + contributions, plafond d'endettement 40 %, seuil 60, arrondi façon JS).
- 3 profils « phares » imposés (Yasmina/Karim/Sara) conservés pour la démo et le login.

Usage :  python scripts/generate_data.py
Aucune dépendance externe.
"""
import json
import math
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

# La console Windows (cp1252) ne gère pas certains caractères ; on force l'UTF-8 en sortie.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

random.seed(42)

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
AVATAR_DIR = ROOT / "frontend" / "public" / "avatars"
AUJOURDHUI = datetime(2026, 6, 12)

TAUX_ANNUEL = 0.0485      # taux nominal (aligné sur scoring.js)
SEUIL_ACCEPTATION = 60
SEUIL_ENDETTEMENT = 0.40

# ────────────────────────── Moteur de scoring (miroir de scoring.js) ──────────────────────────

def _jsround(x):
    return math.floor(x + 0.5)


def _clamp(v, lo, hi):
    return max(lo, min(hi, v))


def mensualite(montant, duree_mois, taux=TAUX_ANNUEL):
    r = taux / 12
    if r == 0:
        return montant / duree_mois
    return (montant * r) / (1 - (1 + r) ** (-duree_mois))


def score_credit(revenu, montant, duree_mois, autres_charges, anciennete, incidents, fichage):
    m = mensualite(montant, duree_mois)
    taux = (m + autres_charges) / revenu if revenu else 1

    contributions = [{"label": "Score de base", "impact": 50, "kind": "base"}]
    score = 50

    if taux <= 0.4:
        end = _clamp(_jsround(((0.4 - taux) / 0.4) * 38), -45, 38)
    else:
        end = _clamp(-_jsround(((taux - 0.4) / 0.2) * 45), -45, 38)
    score += end
    contributions.append({"label": f"Taux d'endettement {_jsround(taux * 100)} %", "impact": end})

    rev = _clamp(_jsround((revenu - 8000) / 1500), -8, 12)
    score += rev
    contributions.append({"label": f"Revenu {revenu:,.0f} DH".replace(",", " "), "impact": rev})

    anc = _clamp(_jsround((anciennete - 12) / 6), -5, 8)
    score += anc
    contributions.append({"label": f"Ancienneté {anciennete} mois", "impact": anc})

    if incidents > 0:
        inc = -incidents * 9
        score += inc
        contributions.append({"label": f"{incidents} incident(s) de paiement", "impact": inc})

    bam = -35 if fichage else 6
    score += bam
    contributions.append({"label": "Fiché Bank Al-Maghrib" if fichage else "Historique BAM sain", "impact": bam})

    score = _clamp(_jsround(score), 0, 100)
    # Décision = seuil de score + règles dures (identique à la pipeline backend)
    hard_fail = fichage or (taux > SEUIL_ENDETTEMENT) or (incidents > 1)
    approuve = score >= SEUIL_ACCEPTATION and not hard_fail
    return {
        "score": score, "decision": "approuve" if approuve else "refuse",
        "mensualite": _jsround(m), "tauxEndettement": round(taux, 3),
        "contributions": contributions,
    }


def montant_max_eligible(revenu, charges, duree_mois):
    """Plus grand montant gardant l'endettement ≤ 40 % (pour le contrefactuel)."""
    mens_dispo = SEUIL_ENDETTEMENT * revenu - charges
    if mens_dispo <= 0:
        return 0
    r = TAUX_ANNUEL / 12
    montant = mens_dispo * (1 - (1 + r) ** (-duree_mois)) / r
    return max(0, _jsround(montant / 1000) * 1000)


# ────────────────────────── Données curées (réalisme marocain) ──────────────────────────

PRENOMS_H = ["Mohammed", "Youssef", "Omar", "Hamza", "Anas", "Reda", "Mehdi", "Othmane", "Yassine", "Amine"]
PRENOMS_F = ["Imane", "Fatima", "Nada", "Meryem", "Houda", "Asmae", "Loubna", "Sanae", "Nisrine", "Hajar"]
NOMS = ["Alaoui", "Cherkaoui", "El Amrani", "Berrada", "Lahlou", "Sebti", "Bennis", "Naciri", "Chraibi", "Sqalli"]

VILLES = {
    "Casablanca": ("20330", ["Maârif", "Gauthier", "Ain Diab", "Bourgogne"]),
    "Rabat": ("10080", ["Agdal", "Hassan", "Hay Riad", "Souissi"]),
    "Marrakech": ("40000", ["Guéliz", "Hivernage", "Targa"]),
    "Tanger": ("90000", ["Malabata", "Iberia"]),
    "Fès": ("30000", ["Atlas", "Saiss"]),
    "Agadir": ("80000", ["Founty", "Talborjt"]),
}
PROFESSIONS = [
    ("Ingénieur(e) informatique", "Technologie", 12000, 26000, "CDI", "Bac+5 — Ingénierie"),
    ("Médecin", "Santé", 15000, 35000, "CDI", "Doctorat en médecine"),
    ("Enseignant(e)", "Éducation", 6000, 12000, "CDI", "Bac+5"),
    ("Comptable", "Finance", 8000, 16000, "CDI", "Bac+3 — Comptabilité"),
    ("Cadre commercial", "Commerce", 9000, 19000, "CDI", "Bac+4 — Commerce"),
    ("Architecte", "BTP", 12000, 26000, "Libéral", "Bac+6 — Architecture"),
    ("Avocat(e)", "Juridique", 10000, 30000, "Libéral", "Master en droit"),
    ("Pharmacien(ne)", "Santé", 12000, 24000, "Libéral", "Doctorat en pharmacie"),
]
EMPLOYEURS = {
    "Technologie": ["Maroc Telecom", "OCP SA", "Inwi", "Capgemini Maroc"],
    "Santé": ["CHU Ibn Rochd", "Clinique Al Madina", "Cabinet privé"],
    "Éducation": ["Université Mohammed V", "Groupe Scolaire OSUI"],
    "Finance": ["Attijariwafa Bank", "BMCE Bank", "CIH Bank"],
    "Commerce": ["Marjane Holding", "Label'Vie", "Cosumar"],
    "BTP": ["TGCC", "SGTM", "Cabinet d'architecture"],
    "Juridique": ["Cabinet d'avocats", "Étude notariale"],
}
LIBELLES_DEBIT = [
    ("Paiement carte — Marjane", 200, 1200, "Courses"),
    ("Paiement carte — Carrefour", 150, 900, "Courses"),
    ("Retrait GAB", 500, 3000, "Retrait"),
    ("Facture Lydec — Électricité/Eau", 200, 800, "Factures"),
    ("Facture Maroc Telecom", 100, 500, "Factures"),
    ("Paiement restaurant", 80, 600, "Loisirs"),
    ("Station-service Afriquia", 200, 700, "Transport"),
    ("Pharmacie", 50, 400, "Santé"),
    ("Achat en ligne — Jumia", 150, 2000, "Shopping"),
]
BENEFICIAIRES_POOL = [
    ("Mohammed Alaoui", "BMCE"), ("Fatima Berrada", "Attijariwafa"),
    ("Société ATLAS SARL", "Banque Populaire"), ("Loyer — Résidence Al Manar", "CIH"),
    ("École Al Madina", "Attijariwafa"), ("Karim Tazi", "CFG Bank"),
]
TYPES_CREDIT = ["immobilier", "consommation", "auto", "personnel", "travaux"]
TYPE_LABEL = {
    "immobilier": "Crédit immobilier", "consommation": "Crédit consommation",
    "auto": "Crédit auto", "personnel": "Crédit personnel", "travaux": "Crédit travaux",
}

MONTHS_FR = {"01": "Jan", "02": "Fév", "03": "Mar", "04": "Avr", "05": "Mai", "06": "Juin",
             "07": "Juil", "08": "Août", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Déc"}

# Vue « conceptuelle » du pipeline voix→décision (8 étapes) pour la page Supervision.
AGENTS_VIZ = [
    {"id": "transcription", "nom": "Transcription vocale", "tech": "Gemini Live · STT", "role": "Convertit la parole en texte", "dureeMs": 480, "statut": "ok"},
    {"id": "nlu", "nom": "Compréhension (NLU)", "tech": "Gemini · classification", "role": "Détecte l'intention de la demande", "dureeMs": 220, "statut": "ok"},
    {"id": "extraction", "nom": "Extraction d'entités", "tech": "Gemini · function calling", "role": "Isole montant, durée et objet", "dureeMs": 180, "statut": "ok"},
    {"id": "kyc", "nom": "Vérification KYC", "tech": "Service interne", "role": "Contrôle identité et conformité client", "dureeMs": 310, "statut": "ok"},
    {"id": "rag", "nom": "Recherche RAG", "tech": "Vector store · embeddings", "role": "Récupère les règles et politiques applicables", "dureeMs": 540, "statut": "ok"},
    {"id": "risque", "nom": "Scoring de risque", "tech": "Modèle de décision", "role": "Calcule le score d'octroi", "dureeMs": 260, "statut": "ok"},
    {"id": "decision", "nom": "Décision", "tech": "Règles · seuil", "role": "Agrège le score et applique le seuil", "dureeMs": 130, "statut": "ok"},
    {"id": "explication", "nom": "Explication (XAI)", "tech": "Gemini · génération", "role": "Rédige le justificatif lisible", "dureeMs": 350, "statut": "ok"},
]
RUN_VIZ = {
    "decisionId": "DEC-0008", "totalMs": 2470,
    "events": [
        {"t": 0, "from": "client", "to": "transcription", "label": "Flux audio", "detail": "« Je voudrais un crédit immobilier de 600 000 DH… »"},
        {"t": 480, "from": "transcription", "to": "nlu", "label": "Texte transcrit", "detail": "Confiance STT 0,97"},
        {"t": 700, "from": "nlu", "to": "extraction", "label": "Intention : Crédit", "detail": "Confiance 0,98"},
        {"t": 880, "from": "extraction", "to": "kyc", "label": "Entités", "detail": "montant=600 000 · durée=240 · objet=immobilier"},
        {"t": 1190, "from": "kyc", "to": "rag", "label": "Client vérifié", "detail": "Identité confirmée · segment Premium"},
        {"t": 1730, "from": "rag", "to": "risque", "label": "Règles trouvées", "detail": "endettement 40 % · LTV 80 % · fichage BAM"},
        {"t": 1990, "from": "risque", "to": "decision", "label": "Score 79/100", "detail": "endettement 28 % sous le seuil"},
        {"t": 2120, "from": "decision", "to": "explication", "label": "Approuvé", "detail": "79 ≥ seuil 60"},
        {"t": 2470, "from": "explication", "to": "client", "label": "Justificatif", "detail": "Explication en langage naturel rendue"},
    ],
}

# Profils phares imposés (conservés pour la démo + login @email.ma)
IMPOSES = [
    {"id": "CL-2024-0042", "genre": "F", "prenom": "Yasmina", "nom": "El Idrissi", "ville": "Casablanca",
     "profession": ("Ingénieure informatique", "Technologie", 18000, "CDI", "Bac+5 — Ingénierie"),
     "anciennete": 36, "fichage": False, "incidents": 0, "anciennete_banque": 7, "segment": "Premium",
     "credit": ("Crédit auto", 1100)},
    {"id": "CL-2024-0043", "genre": "M", "prenom": "Karim", "nom": "Benali", "ville": "Fès",
     "profession": ("Commerçant", "Commerce", 8500, "Indépendant", "Bac+2 — Gestion"),
     "anciennete": 14, "fichage": True, "incidents": 2, "anciennete_banque": 5, "segment": "Standard",
     "credit": ("Crédit auto", 1200)},
    {"id": "CL-2024-0044", "genre": "F", "prenom": "Sara", "nom": "Amrani", "ville": "Rabat",
     "profession": ("Médecin", "Santé", 25000, "CDI", "Doctorat en médecine"),
     "anciennete": 60, "fichage": False, "incidents": 0, "anciennete_banque": 11, "segment": "Patrimoine",
     "credit": ("Crédit immobilier", 1500)},
]

PLAFONDS_PAR_SEGMENT = {
    "Standard": (20000, 40000, 3000),
    "Privilège": (50000, 100000, 5000),
    "Premium": (50000, 100000, 5000),
    "Patrimoine": (100000, 200000, 10000),
}

# ────────────────────────── Helpers ──────────────────────────

def _digits(n):
    return "".join(str(random.randint(0, 9)) for _ in range(n))


def rib():
    return f"230 815 {_digits(16)} {random.randint(10, 99)}"


def iban_from_rib(r):
    return "MA64 " + " ".join(r.replace(" ", "")[i:i + 4] for i in range(0, 20, 4))


def cin():
    return "".join(random.choice("ABCDEFGHJKLMNPQRSTUVWXYZ") for _ in range(2)) + str(random.randint(100000, 999999))


def telephone():
    return f"+212 6 {random.randint(10, 79)} {random.randint(10, 99)} {random.randint(10, 99)} {random.randint(10, 99)}"


def email(prenom, nom, used):
    p = prenom[0].lower()
    n = nom.lower().replace(" ", "").replace("'", "")
    base = f"{p}.{n}"
    e = f"{base}@email.ma"
    i = 2
    while e in used:
        e = f"{base}{i}@email.ma"
        i += 1
    used.add(e)
    return e


def dstr(dt):
    return dt.strftime("%Y-%m-%d")


def carte(segment, titulaire):
    reseau = random.choice(["Visa Classic", "Visa Gold", "Mastercard", "Visa Premier"])
    plafond = {"Standard": 15000, "Privilège": 30000, "Premium": 30000, "Patrimoine": 60000}[segment]
    bin4 = "5301" if "Mastercard" in reseau else random.choice(["4539", "4716", "4012", "4024"])  # 5x = MC, 4x = Visa
    last4 = _digits(4)
    return {
        "type": random.choice(["Débit", "Crédit"]),
        "reseau": reseau,
        "titulaire": titulaire.upper(),
        "numero": f"{bin4} {_digits(4)} {_digits(4)} {last4}",
        "numeroMasque": f"{bin4} •••• •••• {last4}",
        "cvv": _digits(3),
        "plafondMensuel": plafond,
        "expiration": f"{random.randint(1, 12):02d}/{random.randint(27, 30)}",
        "statut": "active",
    }


# ────────────────────────── Avatars SVG ──────────────────────────

GRADIENTS = [
    ("#34d399", "#059669"), ("#22d3ee", "#0e7490"), ("#fbbf24", "#d97706"),
    ("#a78bfa", "#7c3aed"), ("#f472b6", "#db2777"), ("#60a5fa", "#2563eb"),
    ("#fb7185", "#e11d48"), ("#4ade80", "#16a34a"), ("#38bdf8", "#0284c7"), ("#facc15", "#ca8a04"),
]
SKINS = ["#f2c6a3", "#e7ab79", "#efb985", "#e6b08a", "#d99a6c"]
HAIRS = ["#3a2417", "#241a12", "#4a2c17", "#2b1d12", "#1f1410"]


def ecrire_avatar(client_id, prenom, nom, genre, idx):
    c1, c2 = GRADIENTS[idx % len(GRADIENTS)]
    skin = SKINS[idx % len(SKINS)]
    hair = HAIRS[idx % len(HAIRS)]
    gid = client_id.replace("-", "")
    if genre == "F":
        coiffe = (f'<path d="M56 96c0-32 19-54 44-54s44 22 44 54c0 19-4 42-11 59-2-24-6-43-13-47 4 19 5 42 2 55H78'
                  f'c-3-13-2-36 2-55-7 4-11 23-13 47-7-17-11-40-11-59z" fill="{hair}"/>'
                  f'<path d="M64 88c2-28 19-46 36-46s34 18 36 46c-9-13-19-18-36-18s-27 5-36 18z" fill="{hair}"/>')
    else:
        coiffe = (f'<path d="M100 118c-16 0-28-7-32-20 0 22 14 36 32 36s32-14 32-36c-4 13-16 20-32 20z" fill="{hair}"/>'
                  f'<path d="M66 86c0-26 16-44 34-44s34 18 34 44c-6-16-17-22-34-22S72 70 66 86z" fill="{hair}"/>')
    svg = (
        f'<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" '
        f'role="img" aria-label="Avatar {prenom} {nom}">'
        f'<defs><linearGradient id="bg{gid}" x1="0" y1="0" x2="0" y2="1">'
        f'<stop stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient></defs>'
        f'<rect width="200" height="200" fill="url(#bg{gid})"/>'
        f'<path d="M28 200c0-35 31-60 72-60s72 25 72 60z" fill="rgba(0,0,0,0.18)"/>'
        f'<rect x="90" y="116" width="20" height="28" rx="10" fill="{skin}"/>'
        f'<ellipse cx="100" cy="93" rx="34" ry="38" fill="{skin}"/>'
        f'{coiffe}'
        f'<path d="M80 85c3-2.5 9-2.5 12 0" stroke="{hair}" stroke-width="2.6" stroke-linecap="round"/>'
        f'<path d="M108 85c3-2.5 9-2.5 12 0" stroke="{hair}" stroke-width="2.6" stroke-linecap="round"/>'
        f'<circle cx="86" cy="94" r="3.5" fill="#2a1c12"/><circle cx="114" cy="94" r="3.5" fill="#2a1c12"/>'
        f'<path d="M89 108c5 4.5 17 4.5 22 0" stroke="#b56b4e" stroke-width="2.7" stroke-linecap="round" fill="none"/>'
        f'</svg>\n'
    )
    (AVATAR_DIR / f"{client_id}.svg").write_text(svg, encoding="utf-8")


# ────────────────────────── Génération des clients ──────────────────────────

def credit_en_cours(type_credit, mensualite_cible):
    """Construit un crédit en cours dont la mensualité ≈ cible (pour caler chargesMensuelles)."""
    duree = {"Crédit immobilier": 240, "Crédit auto": 60, "Crédit personnel": 48, "Crédit consommation": 48}.get(type_credit, 60)
    # montant initial ~ mensualite * duree (approx amortissement)
    montant_init = _jsround(mensualite_cible * duree * 0.85 / 1000) * 1000
    reste = _jsround(montant_init * random.uniform(0.25, 0.75))
    fin = AUJOURDHUI + timedelta(days=int(duree * 30 * random.uniform(0.3, 0.8)))
    return {"type": type_credit, "organisme": random.choice(["BankIA", "Wafasalaf", "Sofac"]),
            "capitalRestant": reste, "mensualite": round(mensualite_cible, 2), "echeance": dstr(fin)}


def generer_clients(n=10):
    clients, used_emails = [], set()
    for i in range(n):
        imp = IMPOSES[i] if i < len(IMPOSES) else None
        genre = imp["genre"] if imp else random.choice(["H", "F"])
        g = "F" if genre == "F" else "M"
        prenom = imp["prenom"] if imp else random.choice(PRENOMS_F if g == "F" else PRENOMS_H)
        nom = imp["nom"] if imp else random.choice(NOMS)
        ville = imp["ville"] if imp else random.choice(list(VILLES.keys()))
        cp, quartiers = VILLES[ville]
        quartier = random.choice(quartiers)

        if imp:
            profession, secteur, revenu, contrat, etudes = imp["profession"]
        else:
            profession, secteur, smin, smax, contrat, etudes = random.choice(PROFESSIONS)
            revenu = _jsround(random.uniform(smin, smax) / 100) * 100
        anc = imp["anciennete"] if imp else random.randint(8, 160)
        date_emb = AUJOURDHUI - timedelta(days=anc * 30)
        age = random.randint(27, 56)
        naissance = AUJOURDHUI - timedelta(days=age * 365 + random.randint(0, 364))
        anc_banque = imp["anciennete_banque"] if imp else random.randint(2, 11)
        client_depuis = AUJOURDHUI - timedelta(days=anc_banque * 365)
        autres_revenus = 0 if imp else random.choice([0, 0, 1500, 3000])

        fichage = imp["fichage"] if imp else (random.random() < 0.15)
        incidents = imp["incidents"] if imp else random.choices([0, 0, 0, 1, 2, 3], weights=[42, 18, 12, 14, 9, 5])[0]

        # Crédits en cours + charges
        credits, charges = [], 0
        if imp:
            tc, mc = imp["credit"]
            credits.append(credit_en_cours(tc, mc))
            charges = mc
        elif random.random() < 0.6:
            for _ in range(random.randint(1, 2)):
                tc = random.choice(["Crédit auto", "Crédit personnel", "Crédit immobilier", "Crédit consommation"])
                mc = round(random.uniform(700, 3500), 2)
                if charges + mc > revenu * 0.42:
                    break
                credits.append(credit_en_cours(tc, mc))
                charges += mc
        charges = round(charges, 2)
        taux_endettement = round(charges / revenu, 3) if revenu else 0

        # Score interne (indicatif) + segment
        score_int = 60 + (12 if contrat in ("CDI", "Titulaire") else -4) + min(15, anc // 12) \
            + min(10, anc_banque) - incidents * 8 - (30 if fichage else 0) - int(taux_endettement * 30)
        score_int = _clamp(score_int, 15, 98)
        if imp:
            segment = imp["segment"]
        else:
            segment = "Patrimoine" if score_int >= 82 else "Premium" if score_int >= 72 else "Privilège" if score_int >= 55 else "Standard"
        niveau = {"Patrimoine": "Faible", "Premium": "Faible", "Privilège": "Modéré", "Standard": "Élevé"}[segment]
        if fichage or incidents >= 2:
            niveau = "Élevé"
        score_bam = "A" if (not fichage and incidents == 0) else "B" if incidents <= 1 and not fichage else "D"

        # Comptes
        comptes = []
        rc = rib()
        comptes.append({"rib": rc, "iban": iban_from_rib(rc), "type": "courant", "intitule": "Compte courant principal",
                        "solde": round(random.uniform(8000, 90000), 2), "devise": "MAD", "dateOuverture": dstr(client_depuis)})
        if random.random() < 0.65 or imp:
            re = rib()
            comptes.append({"rib": re, "iban": iban_from_rib(re), "type": "epargne", "intitule": "Compte sur carnet",
                            "solde": round(random.uniform(20000, 350000), 2), "devise": "MAD",
                            "dateOuverture": dstr(client_depuis + timedelta(days=120)), "tauxInteret": 0.025})

        benefs = [{"nom": b[0], "rib": rib(), "banque": b[1]} for b in random.sample(BENEFICIAIRES_POOL, k=random.randint(2, 3))]
        plaf = PLAFONDS_PAR_SEGMENT[segment]

        client = {
            "id": imp["id"] if imp else f"CL-2024-{45 + (i - len(IMPOSES)) * 7:04d}",
            "photo": None,  # rempli après écriture de l'avatar
            "personnel": {
                "civilite": "Mme" if g == "F" else "M.", "prenom": prenom, "nom": nom, "genre": g,
                "cin": cin(), "dateNaissance": dstr(naissance), "lieuNaissance": ville, "age": age,
                "nationalite": "Marocaine", "telephone": telephone(),
                "email": email(prenom, nom, used_emails) if not imp else _email_impose(imp, used_emails),
                "ville": ville,
                "adresse": {"rue": f"{random.randint(1,200)} {random.choice(['Rue','Avenue','Bd'])} "
                                   f"{random.choice(['Ibn Batouta','Mohammed V','Hassan II','des FAR','Al Massira'])}",
                            "quartier": quartier, "ville": ville, "codePostal": cp, "pays": "Maroc"},
                "situationFamiliale": random.choice(["Célibataire", "Marié(e)", "Marié(e)", "Divorcé(e)"]),
                "nombreEnfants": random.choices([0, 1, 2, 3], weights=[40, 25, 25, 10])[0],
                "niveauEtudes": etudes,
                "pieceIdentite": {"type": "CIN", "numero": cin(), "validiteJusquau": dstr(AUJOURDHUI + timedelta(days=random.randint(900, 1900))), "verifiee": True},
            },
            "professionnel": {
                "profession": profession, "secteur": secteur, "employeur": random.choice(EMPLOYEURS.get(secteur, ["—"])),
                "typeContrat": contrat, "secteurActivite": secteur, "dateEmbauche": dstr(date_emb), "ancienneteMois": anc,
                "revenuMensuel": revenu, "revenuAnnuel": revenu * 12, "autresRevenus": autres_revenus,
                "modeVersementSalaire": "Virement",
            },
            "bancaire": {
                "agence": f"BankIA {quartier}", "conseiller": _conseiller(), "clientDepuis": dstr(client_depuis),
                "segment": segment, "scoreInterne": score_int, "compteActif": True, "chargesMensuelles": charges,
                "comptes": comptes, "cartes": [carte(segment, f"{prenom} {nom}") for _ in range(random.randint(1, 2))],
                "plafonds": {"virementParOperation": plaf[0], "virementQuotidien": plaf[1], "retraitQuotidien": plaf[2]},
                "beneficiaires": benefs, "creditsEnCours": credits,
            },
            "risque": {
                "incidentsPaiement": incidents, "fichageBam": fichage, "tauxEndettement": taux_endettement,
                "niveauRisque": niveau, "scoreBam": score_bam, "categorieRisque": niveau,
                "derniereRevue": dstr(AUJOURDHUI - timedelta(days=random.randint(10, 120))),
            },
        }
        # Fixer la pièce d'identité = CIN du client (cohérence)
        client["personnel"]["pieceIdentite"]["numero"] = client["personnel"]["cin"]
        clients.append(client)

        ecrire_avatar(client["id"], prenom, nom, g, i)
        client["photo"] = f"/avatars/{client['id']}.svg"
    return clients


def _email_impose(imp, used):
    e = f"{imp['prenom'][0].lower()}.{imp['nom'].lower().replace(' ', '').replace(chr(39), '')}@email.ma"
    used.add(e)
    return e


def _conseiller():
    return random.choice(["M. Tarik Bennani", "Mme Salma Idrissi", "M. Younes Alaoui", "Mme Nadia Cherkaoui", "M. Reda Fassi"])


# ────────────────────────── Transactions ──────────────────────────

def generer_transactions(clients):
    transactions = {}
    for c in clients:
        revenu = c["professionnel"]["revenuMensuel"]
        emp = c["professionnel"]["employeur"]
        ops, tid = [], 1
        for mois in range(2, -1, -1):
            base = AUJOURDHUI - timedelta(days=mois * 30)
            ops.append({"id": f"TX-{c['id'][-4:]}-{tid:03d}", "date": dstr(base.replace(day=min(28, base.day))),
                        "libelle": f"Virement reçu — Salaire {emp}", "montant": revenu, "categorie": "Salaire", "type": "credit"})
            tid += 1
            if random.random() < 0.8:
                ops.append({"id": f"TX-{c['id'][-4:]}-{tid:03d}", "date": dstr(base + timedelta(days=2)),
                            "libelle": "Virement émis — Loyer", "montant": -_jsround(revenu * random.uniform(0.2, 0.32) / 100) * 100,
                            "categorie": "Logement", "type": "debit"})
                tid += 1
            for _ in range(random.randint(4, 7)):
                lib, mn, mx, cat = random.choice(LIBELLES_DEBIT)
                ops.append({"id": f"TX-{c['id'][-4:]}-{tid:03d}", "date": dstr(base + timedelta(days=random.randint(3, 27))),
                            "libelle": lib, "montant": -round(random.uniform(mn, mx), 2), "categorie": cat, "type": "debit"})
                tid += 1
            for cr in c["bancaire"]["creditsEnCours"]:
                ops.append({"id": f"TX-{c['id'][-4:]}-{tid:03d}", "date": dstr(base + timedelta(days=5)),
                            "libelle": f"Prélèvement — {cr['type']}", "montant": -cr["mensualite"], "categorie": "Crédit", "type": "debit"})
                tid += 1
        ops.sort(key=lambda o: o["date"], reverse=True)
        transactions[c["id"]] = ops
    return transactions


# ────────────────────────── Décisions + XAI + pipeline-runs ──────────────────────────

AGENTS = [
    ("AG-CRM", "Agent CRM"), ("AG-FIN", "Agent Analyse Financière"), ("AG-RISK", "Agent Risque"),
    ("AG-DEC", "Agent Décision"), ("AG-EXEC", "Agent Exécution"), ("AG-XAI", "Agent Explicabilité"),
]
RAG_PAR_TYPE = {
    "immobilier": ["Politique crédit immobilier 2026", "Circulaire BAM 1/G/2020"],
    "consommation": ["Conditions générales crédit consommation", "Circulaire BAM 1/G/2020"],
    "auto": ["Barème crédit automobile", "Circulaire BAM 1/G/2020"],
    "personnel": ["Conditions générales crédit consommation"],
    "travaux": ["Politique crédit immobilier 2026"],
}


def generer_decisions(clients):
    decisions = {c["id"]: [] for c in clients}
    explainability, pipeline_runs = [], []
    num = 1
    for c in clients:
        revenu = c["professionnel"]["revenuMensuel"] + c["professionnel"]["autresRevenus"]
        charges = c["bancaire"]["chargesMensuelles"]
        anc = c["professionnel"]["ancienneteMois"]
        incidents = c["risque"]["incidentsPaiement"]
        fichage = c["risque"]["fichageBam"]
        contrat = c["professionnel"]["typeContrat"]
        nom = f"{c['personnel']['prenom']} {c['personnel']['nom']}"
        for _ in range(random.randint(8, 15)):
            jours = random.randint(1, 360)
            horo = AUJOURDHUI - timedelta(days=jours, hours=random.randint(0, 23), minutes=random.randint(0, 59))
            did = f"DEC-{num:04d}"
            est_credit = random.random() < 0.6
            if est_credit:
                objet = random.choice(TYPES_CREDIT)
                duree = random.choice([24, 36, 48, 60, 120, 180, 240])
                montant = _jsround(random.uniform(40000, 800000) / 1000) * 1000
                ev = score_credit(revenu, montant, duree, charges, anc, incidents, fichage)
                expl = _explication_credit(ev, objet, revenu, charges, duree, incidents, fichage)
                decisions[c["id"]].append({
                    "id": did, "clientId": c["id"], "clientNom": nom, "date": horo.strftime("%Y-%m-%d %H:%M"),
                    "intent": TYPE_LABEL[objet], "type": "credit", "sousType": TYPE_LABEL[objet], "objet": objet,
                    "montant": montant, "dureeMois": duree, "statut": ev["decision"], "score": ev["score"],
                    "mensualite": ev["mensualite"], "tauxInteret": TAUX_ANNUEL, "tauxEndettementApres": ev["tauxEndettement"],
                    "explication": expl,
                })
                explainability.append(_xai(did, c, ev, objet, revenu, charges, duree, anc, incidents, fichage, contrat))
            else:
                montant = round(random.uniform(500, 14000), 2)
                benef = random.choice([b["nom"] for b in c["bancaire"]["beneficiaires"]])
                solde = c["bancaire"]["comptes"][0]["solde"]
                ok = solde >= montant
                decisions[c["id"]].append({
                    "id": did, "clientId": c["id"], "clientNom": nom, "date": horo.strftime("%Y-%m-%d %H:%M"),
                    "intent": "Virement", "type": "virement", "sousType": "Virement", "montant": montant,
                    "statut": "execute" if ok else "refuse", "score": None, "beneficiaire": benef,
                    "soldeAvant": solde, "soldeApres": round(solde - montant, 2) if ok else solde,
                    "explication": (f"Solde suffisant, bénéficiaire vérifié. Virement de {montant:,.0f} MAD vers {benef}."
                                    if ok else f"Solde insuffisant. Virement de {montant:,.0f} MAD vers {benef}.").replace(",", " "),
                })
                ev = {"decision": "execute" if ok else "refuse"}
            pipeline_runs.append(_run(did, c, horo, ev))
            num += 1
        decisions[c["id"]].sort(key=lambda d: d["date"], reverse=True)
    return decisions, explainability, pipeline_runs


def _explication_credit(ev, objet, revenu, charges, duree, incidents, fichage):
    label = TYPE_LABEL[objet]
    if ev["decision"] == "approuve":
        return (f"Demande de {label} approuvée. Score {ev['score']}/100, taux d'endettement après crédit "
                f"{_jsround(ev['tauxEndettement']*100)} % sous le seuil de 40 %. Mensualité estimée : "
                f"{ev['mensualite']:,.0f} MAD.").replace(",", " ")
    if fichage:
        return f"Demande de {label} refusée. Régularisation auprès de Bank Al-Maghrib requise avant toute nouvelle demande."
    if ev["tauxEndettement"] > 0.40:
        mm = montant_max_eligible(revenu, charges, duree)
        return f"Demande de {label} refusée. Un montant réduit à environ {mm:,} MAD respecterait le seuil d'endettement de 40 %.".replace(",", " ")
    if incidents > 1:
        return f"Demande de {label} refusée. Une réduction des incidents de paiement améliorerait l'éligibilité."
    return f"Demande de {label} refusée. Score {ev['score']}/100 sous le seuil de {SEUIL_ACCEPTATION}."


def _xai(did, c, ev, objet, revenu, charges, duree, anc, incidents, fichage, contrat):
    taux = ev["tauxEndettement"]
    facteurs = [
        {"nom": "Taux d'endettement après crédit", "valeur": f"{_jsround(taux*100)}%", "seuil": "40%", "poids": 0.35,
         "impact": "négatif" if taux > 0.40 else "positif"},
        {"nom": "Fichage Bank Al-Maghrib", "valeur": "Oui" if fichage else "Non", "poids": 0.25,
         "impact": "négatif" if fichage else "positif"},
        {"nom": "Incidents de paiement (12 mois)", "valeur": incidents, "poids": 0.20,
         "impact": "négatif" if incidents > 0 else "positif"},
        {"nom": "Ancienneté professionnelle", "valeur": f"{anc} mois", "poids": 0.10,
         "impact": "positif" if anc >= 24 else "neutre"},
        {"nom": "Type de contrat", "valeur": contrat, "poids": 0.10,
         "impact": "positif" if contrat in ("CDI", "Titulaire") else "neutre"},
    ]
    cf = None
    if ev["decision"] == "refuse":
        if fichage:
            cf = "La régularisation auprès de Bank Al-Maghrib est requise avant toute nouvelle demande."
        elif taux > 0.40:
            cf = f"Un montant réduit à environ {montant_max_eligible(revenu, charges, duree):,} MAD respecterait le seuil de 40 %.".replace(",", " ")
        elif incidents > 1:
            cf = "Une réduction des incidents de paiement améliorerait l'éligibilité."
        else:
            cf = f"Un score d'au moins {SEUIL_ACCEPTATION} est requis."
    return {
        "decisionId": did, "clientId": c["id"], "scoreFinal": ev["score"], "statut": ev["decision"],
        "scoreBase": 50, "seuil": SEUIL_ACCEPTATION, "facteurs": facteurs, "contributions": ev["contributions"],
        "contrefactuel": cf,
        "reglesActivees": [
            {"regle": "Taux d'endettement <= 40%", "respectee": taux <= 0.40},
            {"regle": "Absence de fichage BAM", "respectee": not fichage},
            {"regle": "Incidents de paiement <= 1", "respectee": incidents <= 1},
        ],
        "sourcesRag": [{"document": d, "pertinence": round(random.uniform(0.78, 0.97), 2)} for d in RAG_PAR_TYPE[objet]],
    }


def _run(did, c, horo, ev):
    statut = ev["decision"]
    sorties = {
        "AG-CRM": f"Profil chargé : {c['bancaire']['segment']}, score {c['bancaire']['scoreInterne']}",
        "AG-FIN": f"Revenu {c['professionnel']['revenuMensuel']} MAD, charges crédits évaluées",
        "AG-RISK": f"Catégorie de risque : {c['risque']['niveauRisque']}",
        "AG-DEC": f"Décision : {statut.upper()}",
        "AG-EXEC": "Opération enregistrée" if statut in ("approuve", "execute") else "Opération non exécutée",
        "AG-XAI": "Explication générée",
    }
    etapes, t = [], horo
    for aid, anom in AGENTS:
        d = random.randint(40, 380)
        t = t + timedelta(milliseconds=d)
        etapes.append({"agentId": aid, "agent": anom, "statut": "succès", "dureeMs": d, "sortie": sorties[aid]})
    return {"runId": f"RUN-{did[-4:]}", "decisionId": did, "clientId": c["id"],
            "horodatage": horo.strftime("%Y-%m-%d %H:%M:%S"), "dureeTotaleMs": sum(e["dureeMs"] for e in etapes),
            "statutGlobal": "terminé", "etapes": etapes}


# ────────────────────────── Analytics / agents / documents ──────────────────────────

def generer_analytics(clients, decisions, pipeline_runs):
    flat = [d for lst in decisions.values() for d in lst]
    credits = [d for d in flat if d["type"] == "credit"]
    virements = [d for d in flat if d["type"] == "virement"]
    approuves = [d for d in flat if d["statut"] in ("approuve", "execute")]
    montant_accorde = sum(d["montant"] for d in credits if d["statut"] == "approuve")
    duree_moy = _jsround(sum(r["dureeTotaleMs"] for r in pipeline_runs) / len(pipeline_runs)) if pipeline_runs else 0

    evolution = []
    for m in range(11, -1, -1):
        cle = (AUJOURDHUI - timedelta(days=m * 30)).strftime("%Y-%m")
        dm = [d for d in flat if d["date"].startswith(cle)]
        evolution.append({"mois": cle, "total": len(dm),
                          "approuves": len([d for d in dm if d["statut"] in ("approuve", "execute")]),
                          "refuses": len([d for d in dm if d["statut"] == "refuse"])})

    buckets = {"0-40": 0, "40-60": 0, "60-80": 0, "80-100": 0}
    for d in credits:
        s = d["score"] or 0
        k = "0-40" if s < 40 else "40-60" if s < 60 else "60-80" if s < 80 else "80-100"
        buckets[k] += 1

    par_client = []
    by_id = {c["id"]: c for c in clients}
    for cid, lst in decisions.items():
        cred = [d for d in lst if d["type"] == "credit"]
        scores = [d["score"] for d in cred if d["score"] is not None]
        par_client.append({
            "clientId": cid, "clientNom": f"{by_id[cid]['personnel']['prenom']} {by_id[cid]['personnel']['nom']}",
            "segment": by_id[cid]["bancaire"]["segment"], "totalDecisions": len(lst),
            "credits": len(cred), "virements": len([d for d in lst if d["type"] == "virement"]),
            "tauxApprobation": round(len([d for d in lst if d["statut"] in ("approuve", "execute")]) / len(lst), 3) if lst else 0,
            "montantAccorde": round(sum(d["montant"] for d in cred if d["statut"] == "approuve"), 2),
            "scoreMoyen": _jsround(sum(scores) / len(scores)) if scores else None,
        })

    return {
        "genereLe": AUJOURDHUI.strftime("%Y-%m-%d"), "totalDecisions": len(flat),
        "totalCredits": len(credits), "totalVirements": len(virements),
        "tauxApprobation": round(len(approuves) / len(flat), 3) if flat else 0,
        "montantTotalAccorde": round(montant_accorde, 2), "tempsDecisionMoyenMs": duree_moy,
        "repartitionParType": {"credit": len(credits), "virement": len(virements)},
        "repartitionParStatut": {
            "approuve": len([d for d in flat if d["statut"] == "approuve"]),
            "execute": len([d for d in flat if d["statut"] == "execute"]),
            "refuse": len([d for d in flat if d["statut"] == "refuse"]),
        },
        "evolutionMensuelle": evolution, "distributionScoresCredit": buckets, "analyseParClient": par_client,
    }


def generer_agents(pipeline_runs):
    stats = {aid: [] for aid, _ in AGENTS}
    for r in pipeline_runs:
        for e in r["etapes"]:
            stats[e["agentId"]].append(e["dureeMs"])
    descriptions = {
        "AG-CRM": "Récupère le profil, l'historique et les comptes du client.",
        "AG-FIN": "Analyse les revenus, charges et calcule la capacité de remboursement.",
        "AG-RISK": "Évalue le niveau de risque (endettement, incidents, fichage BAM).",
        "AG-DEC": "Prend la décision finale selon le score et les règles dures.",
        "AG-EXEC": "Exécute l'opération (validation crédit, signature et virement).",
        "AG-XAI": "Explique la décision en langage clair et propose des alternatives.",
    }
    techs = {"AG-CRM": "Service CRM", "AG-FIN": "Calcul d'annuités", "AG-RISK": "Fichier central BAM",
             "AG-DEC": "Règles + seuil", "AG-EXEC": "Core banking", "AG-XAI": "Gemini · génération"}
    agents = []
    for i, (aid, anom) in enumerate(AGENTS, 1):
        lat = stats[aid] or [0]
        agents.append({"id": aid, "ordre": i, "nom": anom, "role": descriptions[aid], "technologie": techs[aid],
                       "statut": "actif", "nombreExecutions": len(lat),
                       "latenceMoyenneMs": _jsround(sum(lat) / len(lat)), "latenceMaxMs": max(lat)})
    return agents


def generer_documents():
    base = [
        ("Politique de crédit immobilier 2026", "Politique", "Crédit",
         "Conditions d'octroi : apport minimum 20 %, durée max 25 ans, taux d'endettement plafonné à 40 %, LTV ≤ 80 %."),
        ("Circulaire Bank Al-Maghrib 1/G/2020", "Réglementation", "Conformité",
         "Cadre prudentiel des établissements de crédit : consultation du fichier central des incidents, lutte anti-blanchiment."),
        ("Conditions générales du crédit à la consommation", "Politique", "Crédit",
         "Montants de 10 000 à 300 000 MAD, durée de 12 à 84 mois, taux selon le profil de risque."),
        ("Barème des crédits automobiles", "Politique", "Crédit",
         "Financement jusqu'à 80 % de la valeur du véhicule, durée maximale 60 mois."),
        ("Plafonds et conditions des virements", "Procédure", "Virement",
         "Plafonds journaliers selon segment, vérification du bénéficiaire, signature OTP au-delà des seuils."),
        ("Procédure de lutte anti-fraude", "Sécurité", "Virement",
         "Détection des anomalies, double validation au-delà de 50 000 MAD, alertes temps réel."),
    ]
    docs = []
    for i, (titre, type_, cat, extrait) in enumerate(base, 1):
        docs.append({"id": f"DOC-{i:03d}", "titre": titre, "type": type_, "categorie": cat,
                     "nombreFragments": random.randint(18, 84),
                     "dateIndexation": dstr(AUJOURDHUI - timedelta(days=random.randint(10, 60))),
                     "statut": "Indexé", "extrait": extrait})
    return docs


# ────────── Vues dérivées pour les pages (XAI / Analytique / RAG) → mockData.js ──────────

def _flagship_xai():
    ev = score_credit(18000, 600000, 240, 1100, 36, 0, False)
    taux = ev["tauxEndettement"]
    cs = ev["contributions"]
    end_i, rev_i, anc_i, bam_i = cs[1]["impact"], cs[2]["impact"], cs[3]["impact"], cs[-1]["impact"]

    def feat(label, val, imp):
        return {"label": label, "valeur": val, "impact": imp, "direction": "positif" if imp >= 0 else "negatif"}

    def cf(cond, **kw):
        e = score_credit(**kw)
        return {"condition": cond, "scoreSimule": e["score"], "resultat": e["decision"]}

    return {
        "decisionId": "DEC-0008", "intent": "Crédit immobilier", "montant": 600000, "statut": ev["decision"],
        "score": ev["score"], "seuil": SEUIL_ACCEPTATION, "scoreBase": 50, "confiance": 0.93,
        "resume": f"Décision favorable portée par un taux d'endettement maîtrisé ({_jsround(taux*100)} %) "
                  f"et un revenu stable, conforme au plafond réglementaire de 40 %.",
        "features": [
            feat("Taux d'endettement", f"{_jsround(taux*100)} %", end_i),
            feat("Revenu mensuel", "18 000 DH", rev_i),
            feat("Ancienneté CDI", "36 mois", anc_i),
            feat("Historique BAM sain", "0 incident", bam_i),
        ],
        "counterfactuals": [
            cf("Si le taux d'endettement dépassait 40 % (charges +6 000 DH)", revenu=18000, montant=600000, duree_mois=240, autres_charges=7100, anciennete=36, incidents=0, fichage=False),
            cf("Si la cliente était fichée Bank Al-Maghrib", revenu=18000, montant=600000, duree_mois=240, autres_charges=1100, anciennete=36, incidents=0, fichage=True),
            cf("Avec un apport de 30 % (montant 420 000 DH)", revenu=18000, montant=420000, duree_mois=240, autres_charges=1100, anciennete=36, incidents=0, fichage=False),
            cf("Si l'ancienneté était inférieure à 12 mois", revenu=18000, montant=600000, duree_mois=240, autres_charges=1100, anciennete=6, incidents=0, fichage=False),
        ],
        "sources": [
            {"docId": "DOC-001", "titre": "Politique de crédit immobilier 2026", "extrait": "Le taux d'endettement maximal autorisé est de 40 % des revenus nets mensuels.", "pertinence": 0.96},
            {"docId": "DOC-001", "titre": "Politique de crédit immobilier 2026", "extrait": "La quotité de financement (LTV) ne peut excéder 80 % pour une résidence principale.", "pertinence": 0.83},
            {"docId": "DOC-002", "titre": "Circulaire Bank Al-Maghrib 1/G/2020", "extrait": "Consultation obligatoire du fichier central des incidents de remboursement.", "pertinence": 0.88},
        ],
    }


def _analytics_view(clients, decisions, analytics):
    flat = [d for lst in decisions.values() for d in lst]
    credits = [d for d in flat if d["type"] == "credit"]
    cscores = [d["score"] for d in credits if d.get("score") is not None]
    by_id = {c["id"]: c for c in clients}

    parMois = []
    for e in analytics["evolutionMensuelle"][-6:]:
        parMois.append({"mois": MONTHS_FR.get(e["mois"].split("-")[1], e["mois"]),
                        "approuve": e["approuves"], "refuse": e["refuses"]})

    immo = [d for d in credits if d.get("objet") == "immobilier"]
    autres = [d for d in credits if d.get("objet") and d["objet"] != "immobilier"]
    virs = [d for d in flat if d["type"] == "virement"]
    parType = [
        {"type": "Crédit immobilier", "count": len(immo), "montant": int(sum(d["montant"] for d in immo))},
        {"type": "Crédit conso/auto", "count": len(autres), "montant": int(sum(d["montant"] for d in autres))},
        {"type": "Virement", "count": len(virs), "montant": int(sum(d["montant"] for d in virs))},
    ]

    buckets = ["0–20", "20–40", "40–60", "60–80", "80–100"]
    counts = {b: 0 for b in buckets}
    for s in cscores:
        counts[buckets[min(4, int(s // 20))]] += 1
    scoreDistribution = [{"bucket": b, "count": counts[b]} for b in buckets]

    motifs = {}
    for d in credits:
        if d["statut"] != "refuse":
            continue
        c = by_id.get(d["clientId"], {})
        r, pro = c.get("risque", {}), c.get("professionnel", {})
        if r.get("fichageBam"):
            m = "Fichage Bank Al-Maghrib"
        elif (d.get("tauxEndettementApres") or 0) > 0.40:
            m = "Taux d'endettement > 40 %"
        elif r.get("incidentsPaiement", 0) > 1:
            m = "Incidents de paiement"
        elif pro.get("ancienneteMois", 99) < 24:
            m = "Ancienneté insuffisante"
        else:
            m = "Score insuffisant"
        motifs[m] = motifs.get(m, 0) + 1
    motifsRefus = sorted([{"motif": k, "count": v} for k, v in motifs.items()], key=lambda x: -x["count"])[:5]

    return {
        "kpis": {
            "totalDecisions": analytics["totalDecisions"], "tauxApprobation": analytics["tauxApprobation"],
            "montantOctroye": analytics["montantTotalAccorde"],
            "delaiMoyenSec": round(analytics["tempsDecisionMoyenMs"] / 1000, 1),
            "scoreMoyen": _jsround(sum(cscores) / len(cscores)) if cscores else 0,
        },
        "parMois": parMois, "parType": parType,
        "scoreDistribution": scoreDistribution, "motifsRefus": motifsRefus,
    }


def ecrire_mockdata(clients, transactions, decisions, analytics, documents):
    """Émet frontend/src/services/mockData.js avec des vues dérivées des VRAIES données."""
    fid = clients[0]["id"]
    exports = [
        ("mockClient", clients[0]),
        ("mockTransactions", transactions[fid][:8]),
        ("mockDecisions", decisions[fid]),
        ("mockDocuments", [{"id": d["id"], "titre": d["titre"], "type": d["type"],
                            "chunks": d["nombreFragments"], "dateIndex": d["dateIndexation"]} for d in documents]),
        ("mockXai", _flagship_xai()),
        ("mockAnalytics", _analytics_view(clients, decisions, analytics)),
        ("mockAgents", AGENTS_VIZ),
        ("mockPipelineRun", RUN_VIZ),
    ]
    out = ["// AUTO-GÉNÉRÉ par scripts/generate_data.py — ne pas éditer à la main.",
           "// Vues dérivées des vraies données pour les pages XAI / Analytique / Base RAG / Supervision.", ""]
    for name, obj in exports:
        out.append(f"export const {name} = {json.dumps(obj, ensure_ascii=False, indent=2)};")
        out.append("")
    path = ROOT / "frontend" / "src" / "services" / "mockData.js"
    path.write_text("\n".join(out), encoding="utf-8")
    return path.stat().st_size


# ────────────────────────── Écriture ──────────────────────────

def ecrire(nom, data):
    p = DATA_DIR / nom
    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return p.stat().st_size


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)

    clients = generer_clients(10)
    transactions = generer_transactions(clients)
    decisions, explainability, pipeline_runs = generer_decisions(clients)
    analytics = generer_analytics(clients, decisions, pipeline_runs)
    agents = generer_agents(pipeline_runs)
    documents = generer_documents()

    fichiers = {
        "clients.json": clients, "transactions.json": transactions, "decisions.json": decisions,
        "explainability.json": explainability, "pipeline-runs.json": pipeline_runs,
        "analytics.json": analytics, "agents.json": agents, "documents.json": documents,
    }
    print("Génération des données BankIA :")
    for nom, data in fichiers.items():
        taille = ecrire(nom, data)
        print(f"  ✓ {nom:24s} {taille:>7} octets")
    taille_mock = ecrire_mockdata(clients, transactions, decisions, analytics, documents)
    print(f"  ✓ {'mockData.js (frontend)':24s} {taille_mock:>7} octets")

    total_dec = sum(len(v) for v in decisions.values())
    print(f"\n{len(clients)} clients · {total_dec} décisions · {len(pipeline_runs)} runs · "
          f"{len(explainability)} explications XAI · avatars dans frontend/public/avatars/"
          f"\nPages XAI / Analytique / Base RAG branchées sur les vraies données via mockData.js.")


if __name__ == "__main__":
    main()
