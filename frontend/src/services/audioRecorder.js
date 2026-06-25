/**
 * AudioRecorder — capte le micro et renvoie du PCM16 16 kHz encodé en base64.
 *
 * Usage :
 *   const recorder = new AudioRecorder((base64) => client.sendAudio(base64))
 *   await recorder.start()
 *   recorder.stop()
 */
export class AudioRecorder {
  constructor(onData) {
    this.onData = onData // callback : (base64String) => void
    this.stream = null
    this.context = null
    this.processor = null
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })

    this.context = new AudioContext({ sampleRate: 16000 })
    const source = this.context.createMediaStreamSource(this.stream)

    // ScriptProcessorNode — déprécié mais universellement supporté, parfait pour une démo.
    this.processor = this.context.createScriptProcessor(4096, 1, 1)
    this.processor.onaudioprocess = (e) => {
      const float32 = e.inputBuffer.getChannelData(0)
      const int16 = new Int16Array(float32.length)
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]))
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }
      const base64 = this._arrayBufferToBase64(int16.buffer)
      this.onData(base64)
    }

    source.connect(this.processor)
    // Connexion à la destination pour garder le processor actif (requis par la spec).
    this.processor.connect(this.context.destination)
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect()
      this.processor.onaudioprocess = null
      this.processor = null
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
    if (this.context) {
      this.context.close().catch(() => {})
      this.context = null
    }
  }

  /**
   * Convertit un ArrayBuffer en base64 par tranches pour éviter le débordement
   * de pile sur de gros buffers.
   */
  _arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer)
    const CHUNK = 0x8000 // tranches de 32 Ko
    let binary = ''
    for (let i = 0; i < bytes.length; i += CHUNK) {
      const slice = bytes.subarray(i, i + CHUNK)
      binary += String.fromCharCode.apply(null, slice)
    }
    return btoa(binary)
  }
}
