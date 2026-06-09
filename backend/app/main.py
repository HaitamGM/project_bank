import asyncio
import base64
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
DATA_DIR = BASE_DIR.parent / "data"

DEFAULT_MODEL = "gemini-3.1-flash-live-preview"

app = FastAPI(title="BankIA API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_json(filename):
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


def get_client_by_id(client_id):
    try:
        clients = load_json("clients.json")
        return next((c for c in clients if c["id"] == client_id), None)
    except FileNotFoundError:
        return None


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "BankIA API"}


@app.get("/api/clients/{client_id}")
def get_client(client_id: str):
    client = get_client_by_id(client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client introuvable")
    return client


@app.get("/api/clients/{client_id}/transactions")
def get_transactions(client_id: str):
    try:
        transactions = load_json("transactions.json")
    except FileNotFoundError:
        return []
    return transactions.get(client_id, [])


def build_system_prompt(client):
    base = """Tu es l'assistant vocal de BankIA, une banque marocaine intelligente. Le client te parle via un micro sur le site web.

LANGUE : Réponds en français clair et naturel (tu comprends aussi le darija). Ton chaleureux, professionnel, concis (2-3 phrases sauf si on demande des détails).

TON RÔLE :
- Aider le client pour deux operations : demandes de CRÉDIT et VIREMENTS.
- Crédit : demande montant, durée et but si absents. Évalue selon le profil (revenu, endettement) et explique TOUJOURS ta décision.
- Virement : demande montant et bénéficiaire, vérifie le solde, confirme l'opération.
- Hors cadre bancaire : recadre poliment. N'invente jamais d'informations.
"""
    if client:
        p = client.get("personnel", {})
        prof = client.get("professionnel", {})
        banc = client.get("bancaire", {})
        risque = client.get("risque", {})
        comptes = banc.get("comptes", [])
        solde_total = sum(c.get("solde", 0) for c in comptes)
        base += f"""

PROFIL DU CLIENT CONNECTÉ :
- Nom : {p.get('prenom','')} {p.get('nom','')}
- Profession : {prof.get('profession','')} chez {prof.get('employeur','')} ({prof.get('typeContrat','')})
- Revenu mensuel net : {prof.get('revenuMensuel','?')} MAD
- Solde total : {solde_total:.2f} MAD
- Segment : {banc.get('segment','')}
- Taux d'endettement actuel : {risque.get('tauxEndettement',0)*100:.0f}%
- Incidents de paiement (12 mois) : {risque.get('incidentsPaiement',0)}
- Fiché Bank Al-Maghrib : {'Oui' if risque.get('fichageBam') else 'Non'}

RÈGLE CRÉDIT INDICATIVE : le taux d'endettement total (avec la nouvelle mensualité ≈ montant / durée_en_mois) ne doit pas dépasser 40% du revenu. Si fiché BAM ou plusieurs incidents, sois prudent et explique.
"""
    return base


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()

    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        await ws.send_json({"type": "error", "message": "Cle API manquante (GOOGLE_API_KEY dans backend/.env)"})
        await ws.close()
        return

    client_data = None
    try:
        first = await asyncio.wait_for(ws.receive_text(), timeout=5.0)
        init = json.loads(first)
        if init.get("type") == "init":
            client_data = get_client_by_id(init.get("clientId"))
    except (asyncio.TimeoutError, json.JSONDecodeError, KeyError):
        pass

    model = os.environ.get("GEMINI_LIVE_MODEL", DEFAULT_MODEL)
    genai_client = genai.Client(api_key=api_key)
    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=build_system_prompt(client_data),
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
    )

    try:
        async with genai_client.aio.live.connect(model=model, config=config) as session:
            await ws.send_json({"type": "status", "message": "Connected to Gemini"})

            async def browser_to_gemini():
                try:
                    while True:
                        data = await ws.receive_text()
                        msg = json.loads(data)
                        if msg["type"] == "audio":
                            audio_bytes = base64.b64decode(msg["data"])
                            await session.send_realtime_input(
                                audio=types.Blob(data=audio_bytes, mime_type="audio/pcm;rate=16000")
                            )
                except (WebSocketDisconnect, RuntimeError, asyncio.CancelledError):
                    pass

            async def gemini_to_browser():
                try:
                    while True:
                        async for message in session.receive():
                            sc = message.server_content
                            if not sc:
                                continue
                            if sc.model_turn:
                                for part in sc.model_turn.parts:
                                    if part.inline_data and part.inline_data.data:
                                        audio_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                                        await ws.send_json({"type": "audio", "data": audio_b64})
                            if sc.input_transcription and sc.input_transcription.text:
                                await ws.send_json({"type": "input_transcript", "text": sc.input_transcription.text})
                            if sc.output_transcription and sc.output_transcription.text:
                                await ws.send_json({"type": "output_transcript", "text": sc.output_transcription.text})
                            if sc.turn_complete:
                                await ws.send_json({"type": "turn_complete"})
                            if sc.interrupted:
                                await ws.send_json({"type": "interrupted"})
                except (WebSocketDisconnect, RuntimeError, asyncio.CancelledError):
                    pass
                except Exception as e:
                    print(f"Error gemini_to_browser: {e}")

            bt = asyncio.create_task(browser_to_gemini())
            gt = asyncio.create_task(gemini_to_browser())
            done, pending = await asyncio.wait([bt, gt], return_when=asyncio.FIRST_COMPLETED)
            for t in pending:
                t.cancel()
    except Exception as e:
        print(f"Session error: {e}")
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
