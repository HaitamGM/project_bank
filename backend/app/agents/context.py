"""Contextes partagés entre agents : ils transportent les entrées, les valeurs
calculées au fil des agents, et la trace (steps)."""
from dataclasses import dataclass, field


@dataclass
class CreditContext:
    client: dict
    montant: float
    duree_mois: int
    objet: str = "immobilier"
    autres_charges_demande: float = 0
    use_ai: bool = True

    steps: list = field(default_factory=list)

    # Renseignés par l'orchestrateur (intake) puis par les agents :
    revenu: float = 0
    charges_actuelles: float = 0
    incidents: int = 0
    bam: bool = False
    mensualite: float = 0
    result: dict = None          # sortie de score_credit (score, contributions, …)
    taux_endettement: float = 0
    kyc_ok: bool = True
    capacite_ok: bool = True
    approved: bool = False
    explication: str = ""


@dataclass
class TransferContext:
    client: dict
    montant: float
    beneficiaire: str
    compte_source_rib: str = None
    use_ai: bool = True

    steps: list = field(default_factory=list)

    source: dict = None
    solde: float = 0
    known: bool = False
    ratio: float = 0
    plafond_op: float = 50000
    plafond_jour: float = 100000
    total_jour: float = 0
    kyc_ok: bool = True
    solde_ok: bool = True
    op_ok: bool = True
    jour_ok: bool = True
    approved: bool = False
    motif: str = None
