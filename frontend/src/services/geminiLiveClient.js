/**
 * GeminiLiveClient — se connecte au relais WebSocket FastAPI (backend BankIA),
 * qui fait le pont audio entre le navigateur et l'API Gemini Live.
 *
 * Protocole (navigateur ↔ serveur) :
 *   Envoi :    {"type": "init", "clientId": "CL-2024-0042"}   (premier message)
 *              {"type": "audio", "data": "<base64 pcm16 16kHz>"}
 *              {"type": "text", "text": "..."}   (saisie clavier — alternative à la voix)
 *   Réception: {"type": "audio", "data": "<base64 pcm16 24kHz>"}
 *              {"type": "status", "message": "Connected to Gemini"}
 *              {"type": "input_transcript", "text": "..."}   (ce que dit l'utilisateur)
 *              {"type": "output_transcript", "text": "..."}  (ce que dit l'assistant)
 *              {"type": "turn_complete"}
 *              {"type": "interrupted"}
 *              {"type": "tool_event", "tool": "credit"|"transfer"|..., ...}  (pipeline déclenchée par la voix)
 *              {"type": "error", "message": "..."}
 */
export class GeminiLiveClient {
  constructor() {
    this.ws = null
    this.ready = false

    // Callbacks publics
    this.onready = null
    this.onaudio = null
    this.ontranscript = null // (role: 'user' | 'agent', text: string)
    this.onturncomplete = null
    this.oninterrupted = null
    this.ontoolevent = null // (event: { tool, ...payload }) — pipeline déclenchée par la voix
    this.onclose = null
    this.onerror = null
  }

  connect(token) {
    return new Promise((resolve, reject) => {
      // En dev, Vite proxifie /ws vers le backend (port 8000). On peut aussi
      // forcer une URL absolue via VITE_WS_URL.
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const url = import.meta.env.VITE_WS_URL || `${proto}//${window.location.host}/ws`

      console.log('[GeminiLiveClient] Connexion à', url)
      this.ws = new WebSocket(url)

      this.ws.addEventListener('open', () => {
        console.log('[GeminiLiveClient] WebSocket ouvert, envoi init + attente session Gemini...')
        // Premier message : le backend authentifie le client via ce jeton JWT.
        this.ws.send(JSON.stringify({ type: 'init', token: token || null }))
      })

      this.ws.addEventListener('message', (event) => {
        let msg
        try {
          msg = JSON.parse(event.data)
        } catch {
          console.warn('[GeminiLiveClient] Message non-JSON :', event.data)
          return
        }

        switch (msg.type) {
          case 'status':
            console.log('[GeminiLiveClient] Statut :', msg.message)
            if (msg.message === 'Connected to Gemini') {
              this.ready = true
              resolve()
              if (this.onready) this.onready()
            }
            break

          case 'audio':
            if (this.onaudio) this.onaudio(msg.data)
            break

          case 'input_transcript':
            if (this.ontranscript) this.ontranscript('user', msg.text)
            break

          case 'output_transcript':
            if (this.ontranscript) this.ontranscript('agent', msg.text)
            break

          case 'turn_complete':
            if (this.onturncomplete) this.onturncomplete()
            break

          case 'interrupted':
            console.log('[GeminiLiveClient] Interruption (barge-in)')
            if (this.oninterrupted) this.oninterrupted()
            break

          case 'tool_event':
            if (this.ontoolevent) this.ontoolevent(msg)
            break

          case 'error':
            console.error('[GeminiLiveClient] Erreur serveur :', msg.message)
            if (this.onerror) this.onerror(new Error(msg.message))
            break

          default:
            console.log('[GeminiLiveClient] Type de message inconnu :', msg.type)
        }
      })

      this.ws.addEventListener('close', (event) => {
        console.log(`[GeminiLiveClient] WebSocket fermé : code=${event.code} reason="${event.reason}"`)
        const wasReady = this.ready
        this.ready = false
        if (!wasReady && !event.wasClean) {
          reject(new Error(`WebSocket fermé (code : ${event.code})`))
        }
        if (this.onclose) this.onclose(event.code, event.reason)
      })

      this.ws.addEventListener('error', (err) => {
        console.error('[GeminiLiveClient] Erreur WebSocket :', err)
        this.ready = false
        reject(new Error('Erreur de connexion WebSocket'))
        if (this.onerror) this.onerror(err)
      })
    })
  }

  sendAudio(base64Data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({ type: 'audio', data: base64Data }))
  }

  /** Envoie un message texte (saisie clavier). L'assistant répond en vocal + transcription écrite. */
  sendText(text) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const t = (text || '').trim()
    if (!t) return
    this.ws.send(JSON.stringify({ type: 'text', text: t }))
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.ready = false
  }
}
