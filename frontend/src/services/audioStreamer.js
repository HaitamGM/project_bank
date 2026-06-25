/**
 * AudioStreamer — joue le PCM16 24 kHz (base64) renvoyé par Gemini, avec
 * planification anticipée pour éviter les coupures entre les morceaux.
 *
 * Usage :
 *   const streamer = new AudioStreamer()
 *   streamer.onended = () => console.log('fin de la réponse')
 *   streamer.addPCM16(base64Data)
 *   streamer.stop()
 */
export class AudioStreamer {
  constructor() {
    this.context = null
    this.gainNode = null
    this.queue = [] // tableau de Float32Array en attente de planification
    this.isPlaying = false
    this.scheduledEndTime = 0 // temps AudioContext où le dernier buffer planifié se termine
    this.checkInterval = null
    this.onended = null // callback quand tout l'audio en file est terminé
  }

  /**
   * Garantit que l'AudioContext existe et tourne.
   * DOIT être appelé depuis un geste utilisateur la première fois (politique autoplay).
   */
  ensureContext() {
    if (!this.context) {
      this.context = new AudioContext({ sampleRate: 24000 })
      this.gainNode = this.context.createGain()
      this.gainNode.connect(this.context.destination)
    }
    if (this.context.state === 'suspended') {
      this.context.resume()
    }
  }

  /**
   * Décode du PCM16 base64 et le met en file pour lecture.
   */
  addPCM16(base64Data) {
    this.ensureContext()

    // base64 -> octets bruts -> Int16Array -> Float32Array
    const raw = atob(base64Data)
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) {
      bytes[i] = raw.charCodeAt(i)
    }
    const int16 = new Int16Array(bytes.buffer)
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 0x8000
    }

    this.queue.push(float32)
    this._scheduleNext()

    if (!this.checkInterval) {
      this.checkInterval = setInterval(() => this._checkEnded(), 100)
    }
  }

  /**
   * Planifie les buffers en file avec anticipation pour une lecture sans coupure.
   */
  _scheduleNext() {
    if (!this.context || this.queue.length === 0) return

    while (this.queue.length > 0) {
      const samples = this.queue.shift()
      const buffer = this.context.createBuffer(1, samples.length, 24000)
      buffer.getChannelData(0).set(samples)

      const source = this.context.createBufferSource()
      source.buffer = buffer
      source.connect(this.gainNode)

      // Coussin anti-jitter : si on est en retard (sous-alimentation réseau),
      // on redémarre avec ~120 ms d'avance pour éviter les micro-coupures.
      const startAt = Math.max(this.context.currentTime + 0.12, this.scheduledEndTime)
      source.start(startAt)
      this.scheduledEndTime = startAt + buffer.duration
      this.isPlaying = true
    }
  }

  _checkEnded() {
    if (!this.context) return
    if (this.isPlaying && this.context.currentTime >= this.scheduledEndTime && this.queue.length === 0) {
      this.isPlaying = false
      this._clearCheck()
      if (this.onended) this.onended()
    }
  }

  _clearCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  /**
   * Vide la file et coupe la lecture en cours SANS détruire le contexte.
   * Utilisé pour le barge-in / interruption — le contexte reste vivant pour le tour suivant.
   */
  clearQueue() {
    this.queue = []
    this.isPlaying = false
    this.scheduledEndTime = 0
    this._clearCheck()
    // Recrée le gain node pour couper instantanément les sources déjà planifiées.
    if (this.gainNode && this.context) {
      this.gainNode.disconnect()
      this.gainNode = this.context.createGain()
      this.gainNode.connect(this.context.destination)
    }
  }

  /**
   * Stoppe tout, vide la file et ferme le contexte.
   */
  stop() {
    this.queue = []
    this.isPlaying = false
    this.scheduledEndTime = 0
    this._clearCheck()
    if (this.context) {
      this.context.close().catch(() => {})
      this.context = null
      this.gainNode = null
    }
  }
}
