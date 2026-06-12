"""Schémas de validation des requêtes/réponses (Pydantic)."""
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class OtpRequest(BaseModel):
    challengeId: str = Field(min_length=8, max_length=64)
    otp: str = Field(min_length=4, max_length=8)


class PasswordCheckRequest(BaseModel):
    password: str = Field(min_length=1, max_length=200)


class CreditRequest(BaseModel):
    montant: float = Field(gt=0, le=20_000_000)
    dureeMois: int = Field(ge=6, le=360)
    objet: str = Field(default="immobilier", max_length=60)
    autresCharges: float = Field(default=0, ge=0, le=1_000_000)


class TransferRequest(BaseModel):
    montant: float = Field(gt=0, le=10_000_000)
    beneficiaire: str = Field(min_length=2, max_length=80)
    compteSource: str | None = Field(default=None, max_length=64)
    ribBeneficiaire: str | None = Field(default=None, max_length=64)


class TransferConfirmRequest(BaseModel):
    challengeId: str = Field(min_length=8, max_length=64)
    otp: str = Field(min_length=4, max_length=8)


class BeneficiaryRequest(BaseModel):
    nom: str = Field(min_length=2, max_length=80)
    banque: str = Field(default="", max_length=60)
    rib: str = Field(default="", max_length=34)  # RIB/IBAN, optionnel


class ConversationMessage(BaseModel):
    role: str = Field(max_length=12)          # 'user' | 'agent'
    text: str = Field(min_length=1, max_length=4000)


class ConversationCreate(BaseModel):
    channel: str = Field(default="texte", max_length=12)  # 'vocal' | 'texte'
    messages: list[ConversationMessage] = Field(min_length=1, max_length=300)
