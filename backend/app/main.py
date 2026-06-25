"""Application BankIA — FastAPI.

Expose : authentification (JWT + OTP 2FA), endpoints clients protégés, pipeline de
vérification crédit/virement, et le relais WebSocket Gemini Live (authentifié par jeton).
"""
import asyncio
import base64
import json
import secrets
import time

from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types

from . import config, data_store, security, voice_tools
from .auth import router as auth_router
from .pipeline_routes import router as pipeline_router
from .schemas import ConversationCreate

app = FastAPI(title="BankIA API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-XSS-Protection"] = "0"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.on_event("startup")
def _startup():
    data_store.ensure_users_seeded()


app.include_router(auth_router)
app.include_router(pipeline_router)


# ───────────────────────── Endpoints clients (protégés) ─────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "BankIA API", "version": "2.0"}


@app.get("/api/clients/me")
def get_my_profile(client_id: str = Depends(security.get_current_client_id)):
    client = data_store.get_client_by_id(client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client introuvable.")
    return client


@app.get("/api/clients/me/transactions")
def get_my_transactions(client_id: str = Depends(security.get_current_client_id)):
    return data_store.get_transactions(client_id)


@app.get("/api/clients/me/decisions")
def get_my_decisions(client_id: str = Depends(security.get_current_client_id)):
    return data_store.get_decisions(client_id)


@app.get("/api/clients/me/explainability")
def get_my_explainability(client_id: str = Depends(security.get_current_client_id)):
    """Explications XAI (facteurs, contributions, règles, contrefactuel, sources RAG) du client."""
    return data_store.get_explainability(client_id)


@app.get("/api/clients/me/pipeline-runs")
def get_my_pipeline_runs(client_id: str = Depends(security.get_current_client_id)):
    """Traces d'exécution du pipeline multi-agents pour les décisions du client."""
    return data_store.get_pipeline_runs(client_id)


@app.get("/api/clients/me/analytics")
def get_my_analytics(client_id: str = Depends(security.get_current_client_id)):
    """Analytique globale de la banque + la ligne du client connecté mise en avant."""
    data = data_store.get_analytics()
    data["clientCourant"] = client_id
    return data


@app.get("/api/agents")
def get_agents(client_id: str = Depends(security.get_current_client_id)):
    """Catalogue des agents du pipeline (rôle, technologie, latence moyenne)."""
    return data_store.get_agents()


@app.get("/api/documents")
def get_documents(client_id: str = Depends(security.get_current_client_id)):
    """Base documentaire RAG (politiques, circulaires, procédures)."""
    return data_store.get_documents()


@app.get("/api/clients/me/conversations")
def get_my_conversations(client_id: str = Depends(security.get_current_client_id)):
    """Historique des conversations du client avec l'assistant."""
    return data_store.get_conversations(client_id)


@app.post("/api/clients/me/conversations", status_code=status.HTTP_201_CREATED)
def save_my_conversation(body: ConversationCreate, client_id: str = Depends(security.get_current_client_id)):
    """Enregistre une conversation (transcript) terminée dans l'historique du client."""
    msgs = [{"role": m.role, "text": m.text} for m in body.messages]
    titre = next((m["text"] for m in msgs if m["role"] == "user"), "Conversation")
    convo = {
        "id": "CONV-" + secrets.token_hex(3).upper(),
        "date": time.strftime("%Y-%m-%d %H:%M"),
        "canal": body.channel,
        "titre": titre[:70] + ("…" if len(titre) > 70 else ""),
        "nbMessages": len(msgs),
        "messages": msgs,
    }
    data_store.add_conversation(client_id, convo)
    data_store.audit("conversation_saved", client_id=client_id, canal=body.channel, nbMessages=len(msgs))
    return convo


# ───────────────────────── Prompt système de l'assistant vocal ─────────────────────────

def build_system_prompt(client):
    base = """Tu es l'assistant vocal de BankIA, une banque marocaine intelligente. Le client te parle via un micro sur le site web.

LANGUE — RÈGLE ABSOLUE :
- Tu parles UNIQUEMENT en arabe marocain (darija), à l'oral, de manière naturelle et chaleureuse, comme un vrai conseiller bancaire marocain.
- Même si le client te parle en français, en anglais ou en arabe classique, tu réponds TOUJOURS en darija marocaine courante — JAMAIS en français, JAMAIS en arabe littéraire (fous-ha).
- EXCEPTION : garde tels quels les termes techniques bancaires, les nombres et les montants (ex : « crédit immobilier », « virement », « taux d'endettement », « 600 000 dirhams », « 20 ans »). Ne les traduis pas.
- Reste concis : 2-3 phrases, sauf si le client demande des détails.

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
    return base + voice_tools.prompt_section()


# ───────────────────────── WebSocket Gemini Live (authentifié) ─────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()

    if not config.GEMINI_API_KEY:
        await ws.send_json({"type": "error", "message": "Cle API manquante (GOOGLE_API_KEY dans backend/.env)"})
        await ws.close()
        return

    # Authentification obligatoire via le jeton JWT passé dans le message init.
    client_data = None
    try:
        first = await asyncio.wait_for(ws.receive_text(), timeout=5.0)
        init = json.loads(first)
        token = init.get("token")
        claims = security.decode_token(token) if token else None
        if not claims or claims.get("type") != "access":
            await ws.send_json({"type": "error", "message": "Authentification requise"})
            await ws.close()
            return
        client_id = claims["sub"]
        client_data = data_store.get_client_by_id(client_id)
    except (asyncio.TimeoutError, json.JSONDecodeError, KeyError):
        await ws.send_json({"type": "error", "message": "Initialisation invalide"})
        await ws.close()
        return

    # État de session pour les outils (mémorise le challenge OTP d'un virement en cours).
    pending = {"transfer": None}

    model = config.GEMINI_LIVE_MODEL
    genai_client = genai.Client(api_key=config.GEMINI_API_KEY)
    cfg = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=build_system_prompt(client_data),
        tools=voice_tools.TOOL_DECLARATIONS,
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
    )

    try:
        async with genai_client.aio.live.connect(model=model, config=cfg) as session:
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
                        elif msg["type"] == "text":
                            # Saisie clavier : alternative à la voix pour qui ne peut pas parler.
                            # La réponse reste en AUDIO (+ transcription écrite en temps réel).
                            text = (msg.get("text") or "").strip()
                            if text:
                                await session.send_client_content(
                                    turns=types.Content(role="user", parts=[types.Part(text=text)]),
                                    turn_complete=True,
                                )
                except (WebSocketDisconnect, RuntimeError, asyncio.CancelledError):
                    pass

            async def gemini_to_browser():
                try:
                    while True:
                        async for message in session.receive():
                            # Appels d'outils (function calling) : exécution de la vraie pipeline.
                            if message.tool_call and message.tool_call.function_calls:
                                responses = []
                                for fc in message.tool_call.function_calls:
                                    model_resp, ui_event = await voice_tools.handle(
                                        fc, client_data, client_id, pending
                                    )
                                    responses.append(types.FunctionResponse(
                                        id=fc.id, name=fc.name, response=model_resp,
                                    ))
                                    if ui_event:
                                        await ws.send_json({"type": "tool_event", **ui_event})
                                await session.send_tool_response(function_responses=responses)
                                continue

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
                    try:
                        await ws.send_json({"type": "error", "message": f"Erreur de génération : {e}"})
                    except Exception:
                        pass

            bt = asyncio.create_task(browser_to_gemini())
            gt = asyncio.create_task(gemini_to_browser())
            done, pending_tasks = await asyncio.wait([bt, gt], return_when=asyncio.FIRST_COMPLETED)
            for t in pending_tasks:
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
