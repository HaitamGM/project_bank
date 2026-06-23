import { useState, useRef, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Mic, MicOff, Loader2, Volume2, AlertCircle, CreditCard, ArrowLeftRight, Square,
  Cpu, Check, X, KeyRound, Wallet, Sparkles, Send,
} from 'lucide-react'
import { AudioRecorder } from '../services/audioRecorder'
import { AudioStreamer } from '../services/audioStreamer'
import { GeminiLiveClient } from '../services/geminiLiveClient'
import { authService } from '../services/authService'
import { clientService } from '../services/clientService'
import { PipelineView, Metric, useStepReveal } from '../components/Pipeline'
import { AgentOrchestration } from '../components/AgentOrchestration'
import { fmt } from '../lib/format'

// phase : 'idle' | 'connecting' | 'listening' | 'speaking'
const STATUS = {
  idle: 'Cliquez sur le micro pour parler, ou écrivez votre demande',
  connecting: 'Connexion à l’assistant…',
  listening: 'En écoute… parlez ou écrivez',
  speaking: 'L’assistant vous répond…',
}

function Assistant() {
  const [phase, setPhase] = useState('idle')
  const [messages, setMessages] = useState([])
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState('')
  // Micro réellement actif ? (false = session en mode texte seul)
  const [micOn, setMicOn] = useState(false)
  // Opération déclenchée par l'assistant (pipeline crédit/virement + signature OTP)
  const [op, setOp] = useState(null)

  const queryClient = useQueryClient()

  // Instances audio / WebSocket (hors cycle de rendu React)
  const clientRef = useRef(null)
  const recorderRef = useRef(null)
  const streamerRef = useRef(null)

  // Sauvegarde de la conversation : copie courante des messages + garde anti-doublon + canal.
  const messagesRef = useRef([])
  const savedRef = useRef(false)
  const usedMicRef = useRef(false)

  // Accumulation des transcriptions incrémentales par tour de parole
  const openUserId = useRef(null)
  const openAgentId = useRef(null)
  const msgCounter = useRef(0)

  const phaseRef = useRef('idle')
  const setPhaseSafe = (p) => {
    phaseRef.current = p
    setPhase(p)
  }

  const scrollRef = useRef(null)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    messagesRef.current = messages
  }, [messages])

  // Enregistre le transcript dans l'historique (une seule fois par session, ≥ 2 messages).
  const saveConversation = useCallback(() => {
    const msgs = messagesRef.current
    if (savedRef.current || !msgs || msgs.length < 2) return
    savedRef.current = true
    clientService
      .saveConversation({
        channel: usedMicRef.current ? 'vocal' : 'texte',
        messages: msgs.map((m) => ({ role: m.role, text: m.text })),
      })
      .then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }))
      .catch(() => { savedRef.current = false }) // échec → on pourra réessayer
  }, [queryClient])

  // Ajoute un fragment de transcription à la bulle ouverte du rôle, ou en crée une.
  const appendTranscript = useCallback((role, chunk) => {
    if (!chunk) return
    const openRef = role === 'user' ? openUserId : openAgentId
    setMessages((prev) => {
      if (openRef.current != null) {
        return prev.map((m) => (m.id === openRef.current ? { ...m, text: m.text + chunk } : m))
      }
      const id = ++msgCounter.current
      openRef.current = id
      return [...prev, { id, role, text: chunk }]
    })
  }, [])

  // Pousse un message utilisateur COMPLET (saisie clavier) — rien à accumuler.
  const pushUserText = useCallback((text) => {
    openUserId.current = null
    const id = ++msgCounter.current
    setMessages((prev) => [...prev, { id, role: 'user', text }])
  }, [])

  const stopEverything = useCallback(() => {
    recorderRef.current?.stop()
    streamerRef.current?.stop()
    clientRef.current?.disconnect()
    recorderRef.current = null
    streamerRef.current = null
    clientRef.current = null
    openUserId.current = null
    openAgentId.current = null
  }, [])

  // Nettoyage + sauvegarde du transcript si on quitte la page pendant une session active.
  useEffect(() => () => { saveConversation(); stopEverything() }, [stopEverything, saveConversation])

  const stopSession = useCallback(() => {
    saveConversation()
    stopEverything()
    setMicOn(false)
    setPhaseSafe('idle')
  }, [stopEverything, saveConversation])

  // Démarre une session. withMic=false → mode texte seul (aucun micro demandé).
  // initialText → message envoyé dès que la session est prête (démarrage au clavier).
  const startSession = useCallback(async ({ withMic = true, initialText = null } = {}) => {
    setError(null)
    setMessages([])
    setOp(null)
    setMicOn(false)
    savedRef.current = false
    usedMicRef.current = false
    messagesRef.current = []
    openUserId.current = null
    openAgentId.current = null
    setPhaseSafe('connecting')

    try {
      const streamer = new AudioStreamer()
      streamer.ensureContext() // crée l'AudioContext dans le geste utilisateur (politique autoplay)
      streamerRef.current = streamer

      const client = new GeminiLiveClient()
      clientRef.current = client

      client.onready = () => setPhaseSafe('listening')

      client.onaudio = (base64) => {
        if (phaseRef.current !== 'speaking') setPhaseSafe('speaking')
        streamer.addPCM16(base64)
      }

      client.ontranscript = (role, text) => appendTranscript(role, text)

      // Pipeline déclenchée par la voix : on met à jour le panneau d'opération en direct.
      client.ontoolevent = (msg) => {
        if (msg.tool === 'credit') {
          setOp({ kind: 'credit', result: msg.result })
        } else if (msg.tool === 'transfer') {
          setOp({
            kind: 'transfer',
            result: msg.result,
            devOtp: msg.devOtp || msg.result?.devOtp || null,
            executed: false,
            otpError: false,
          })
        } else if (msg.tool === 'transfer_executed') {
          setOp((prev) => ({
            ...(prev || { kind: 'transfer' }),
            kind: 'transfer',
            executed: true,
            otpError: false,
            exec: { reference: msg.reference, montant: msg.montant, beneficiaire: msg.beneficiaire },
          }))
        } else if (msg.tool === 'transfer_otp') {
          setOp((prev) => (prev ? { ...prev, otpError: true } : prev))
        } else if (msg.tool === 'comptes') {
          setOp({ kind: 'comptes', comptes: msg.comptes, soldeTotal: msg.soldeTotal })
        }
      }

      client.onturncomplete = () => {
        // Fin du tour de parole : on clôt les bulles ouvertes.
        openUserId.current = null
        openAgentId.current = null
        // En half-duplex, on ne rouvre le micro qu'une fois l'audio FINI de jouer
        // (géré par streamer.onended). Filet : si rien ne joue, on repasse à l'écoute.
        if (phaseRef.current === 'speaking' && !streamer.isPlaying && streamer.queue.length === 0) {
          setPhaseSafe('listening')
        }
      }

      client.oninterrupted = () => {
        // L'utilisateur coupe l'assistant (barge-in) : on vide l'audio en attente.
        streamer.clearQueue()
        openAgentId.current = null
        openUserId.current = null
        setPhaseSafe('listening')
      }

      client.onclose = (code, reason) => {
        stopEverything()
        setMicOn(false)
        setPhaseSafe('idle')
        if (reason) setError(`Session fermée : ${reason}`)
      }

      client.onerror = (err) => {
        stopEverything()
        setMicOn(false)
        setPhaseSafe('idle')
        setError(err?.message || 'Erreur de connexion à l’assistant')
      }

      streamer.onended = () => {
        // Filet de sécurité si turn_complete n'arrive pas.
        if (phaseRef.current === 'speaking') setPhaseSafe('listening')
      }

      await client.connect(authService.getToken())

      // Micro optionnel (best-effort) — l'utilisateur peut ne pas pouvoir/vouloir parler.
      // En cas de refus ou d'absence de micro, la session continue en mode texte.
      if (withMic) {
        try {
          const recorder = new AudioRecorder((base64) => {
            // Half-duplex : on n'envoie PAS le micro pendant que l'assistant parle,
            // sinon Gemini s'entend lui-même (écho des haut-parleurs) et se coupe en boucle.
            if (clientRef.current && clientRef.current.ready && phaseRef.current !== 'speaking') {
              clientRef.current.sendAudio(base64)
            }
          })
          await recorder.start()
          recorderRef.current = recorder
          setMicOn(true)
          usedMicRef.current = true
        } catch (micErr) {
          console.warn('[Assistant] Micro indisponible, mode texte :', micErr)
          setMicOn(false)
        }
      }

      // Démarrage au clavier : on envoie le premier message dès que c'est prêt.
      if (initialText) {
        pushUserText(initialText)
        client.sendText(initialText)
      }
    } catch (err) {
      console.error('[Assistant] Erreur de démarrage :', err)
      stopEverything()
      setMicOn(false)
      setPhaseSafe('idle')
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setError('Accès au micro refusé. Vous pouvez écrire à l’assistant ci-dessous.')
      } else {
        setError(err?.message || 'Impossible de démarrer la session.')
      }
    }
  }, [appendTranscript, pushUserText, stopEverything])

  // Envoi d'un message texte (clavier). Démarre la session en mode texte si besoin.
  const sendText = useCallback(async (text) => {
    const t = (text || '').trim()
    if (!t || phaseRef.current === 'connecting') return
    setError(null)
    if (!clientRef.current || !clientRef.current.ready) {
      // Aucune session active → on en démarre une (sans micro) ; ce texte est le 1ᵉʳ message.
      await startSession({ withMic: false, initialText: t })
      return
    }
    pushUserText(t)
    // Réveille le contexte audio dans le geste utilisateur (politique autoplay) pour
    // garantir que la réponse vocale soit audible, puis vide la file (barge-in).
    streamerRef.current?.ensureContext()
    streamerRef.current?.clearQueue()
    clientRef.current.sendText(t)
  }, [startSession, pushUserText])

  const submitDraft = (e) => {
    e.preventDefault()
    const t = draft
    setDraft('')
    sendText(t)
  }

  const isActive = phase !== 'idle'
  const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800'
  const MicIcon = phase === 'connecting' ? Loader2 : phase === 'speaking' ? Volume2 : isActive && !micOn ? MicOff : Mic
  const statusText = isActive && !micOn && phase === 'listening'
    ? 'Mode texte — écrivez votre demande ci-dessous'
    : STATUS[phase]

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      {/* Hero + contrôle micro */}
      <div className="relative overflow-hidden rounded-3xl mb-5 p-8 sm:p-10 bg-gradient-to-br from-primary-600 via-primary-600 to-teal-700 text-white shadow-sm">
        <div className="pointer-events-none absolute -top-16 -end-16 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -start-10 w-64 h-64 rounded-full bg-teal-300/10 blur-3xl" />
        <div className="relative flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/15 px-3 py-1 rounded-full"><Sparkles size={13} /> Propulsé par Gemini Live</span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-3">Assistant vocal BankIA</h1>
          <p className="text-primary-100 mt-1 max-w-md">Demandez un crédit ou un virement à voix haute — les agents s'occupent du reste.</p>

          <div className="relative my-7 flex items-center justify-center">
            <VoiceOrb phase={phase} isActive={isActive} onClick={isActive ? stopSession : () => startSession({ withMic: true })} MicIcon={MicIcon} />
          </div>

          <Equalizer active={phase === 'listening' || phase === 'speaking'} />
          <p className="font-semibold mt-3 text-lg min-h-7">{statusText}</p>
          {isActive && (
            <button onClick={stopSession} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-full transition">
              <Square size={14} /> Terminer la session
            </button>
          )}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Pipeline déclenchée par la voix (crédit / virement / comptes) */}
      <OperationPanel op={op} />

      {/* Suggestions (état initial uniquement) */}
      {phase === 'idle' && messages.length === 0 && !error && !op && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <button
            type="button"
            onClick={() => sendText('Je voudrais un crédit immobilier de 600 000 DH sur 20 ans.')}
            className={`${card} p-5 text-left hover:border-primary-400 dark:hover:border-primary-500/50 hover:shadow-sm transition`}
          >
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-3">
              <CreditCard size={20} />
            </div>
            <p className="font-semibold mb-1">Demander un crédit</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              « Je voudrais un crédit immobilier de 600 000 DH sur 20 ans. »
            </p>
          </button>
          <button
            type="button"
            onClick={() => sendText('Vire 2 000 dirhams à Karim depuis mon compte courant.')}
            className={`${card} p-5 text-left hover:border-primary-400 dark:hover:border-primary-500/50 hover:shadow-sm transition`}
          >
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-3">
              <ArrowLeftRight size={20} />
            </div>
            <p className="font-semibold mb-1">Faire un virement</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              « Vire 2 000 dirhams à Karim depuis mon compte courant. »
            </p>
          </button>
        </div>
      )}

      {/* Transcription live de la conversation */}
      {messages.length > 0 && (
        <div className={`${card} p-5`}>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-4">Conversation</p>
          <div ref={scrollRef} className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary-600 text-white rounded-br-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-sm'
                  }`}
                >
                  {m.role === 'agent' && (
                    <p className="text-[10px] uppercase tracking-wide font-semibold text-primary-600 dark:text-primary-400 mb-0.5">
                      BankIA
                    </p>
                  )}
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saisie clavier — alternative à la voix : la réponse reste vocale ET écrite en temps réel */}
      <form onSubmit={submitDraft} className={`${card} p-2 mt-4 flex items-center gap-2 sticky bottom-4 shadow-sm`}>
        {isActive && !micOn && (
          <span className="pl-2 text-slate-400" title="Mode texte (micro indisponible)"><MicOff size={18} /></span>
        )}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={isActive ? 'Écrivez votre message…' : 'Écrivez votre demande pour démarrer…'}
          disabled={phase === 'connecting'}
          aria-label="Message à l’assistant"
          className="flex-1 bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-slate-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!draft.trim() || phase === 'connecting'}
          aria-label="Envoyer le message"
          className="w-10 h-10 shrink-0 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:hover:bg-primary-600 text-white flex items-center justify-center transition"
        >
          {phase === 'connecting' ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  )
}

// Orbe micro avec anneaux pulsants selon l'état (écoute / réponse).
function VoiceOrb({ phase, isActive, onClick, MicIcon }) {
  const ringColor = phase === 'listening' ? 'bg-rose-200/50' : 'bg-white/30'
  return (
    <>
      {isActive && phase !== 'connecting' && [0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={`absolute w-24 h-24 rounded-full ${ringColor}`}
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 2.3, opacity: 0 }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
        />
      ))}
      <button
        onClick={onClick}
        disabled={phase === 'connecting'}
        aria-label={isActive ? 'Terminer la session' : 'Parler à l’assistant'}
        className="relative w-24 h-24 rounded-full bg-white text-primary-600 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition disabled:opacity-70"
      >
        <MicIcon size={34} className={phase === 'connecting' ? 'animate-spin' : ''} />
      </button>
    </>
  )
}

// Petit égaliseur animé pendant l'écoute / la réponse.
function Equalizer({ active }) {
  if (!active) return <div className="h-6" />
  return (
    <div className="flex items-end gap-1 h-6">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <motion.span
          key={i}
          className="w-1 rounded-full bg-white/80"
          animate={{ height: [6, 22, 10, 24, 8] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.08, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// Panneau d'opération piloté par la voix : montre les agents travailler en direct,
// la décision, et — pour un virement autorisé — le code OTP à lire à voix haute.
function OperationPanel({ op }) {
  // Tempo de révélation partagé entre l'orchestration (vue d'ensemble) et le détail par agent.
  const steps = op && (op.kind === 'credit' || op.kind === 'transfer') ? op.result?.steps : null
  const reveal = useStepReveal(steps)
  if (!op) return null
  const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800'

  if (op.kind === 'comptes') {
    return (
      <div className={`${card} p-5 mb-4`}>
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Wallet size={18} className="text-primary-500" /> Vos comptes</h3>
        <div className="space-y-2">
          {(op.comptes || []).map((c, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3">
              <span className="text-sm text-slate-600 dark:text-slate-300">{c.intitule || c.type}</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{fmt(c.solde)} {c.devise || 'DH'}</span>
            </div>
          ))}
        </div>
        <p className="text-right text-sm text-slate-500 mt-3">Solde total : <span className="font-bold text-primary-600 dark:text-primary-400">{fmt(op.soldeTotal)} DH</span></p>
      </div>
    )
  }

  if (op.kind === 'credit') {
    const r = op.result
    const approved = r.decision === 'approuve'
    return (
      <div className={`${card} p-5 mb-4`}>
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Cpu size={18} className="text-primary-500" /> Pipeline crédit — déclenchée par l’assistant</h3>
        <AgentOrchestration steps={r.steps} revealed={reveal.revealed} done={reveal.done} />
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-wide font-medium text-slate-400 mb-2">Détail des vérifications</p>
          <PipelineView steps={r.steps} reveal={reveal} />
        </div>
        <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${approved ? 'bg-primary-100 dark:bg-primary-500/15 text-primary-700 dark:text-primary-400' : 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400'}`}>
              {approved ? <Check size={15} /> : <X size={15} />}{approved ? 'Crédit approuvé' : 'Crédit refusé'}
            </span>
            <span className="text-sm text-slate-500">Score {r.score}/100</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Metric label="Mensualité" value={`${fmt(r.mensualite)} DH`} />
            <Metric label="Endettement" value={`${Math.round(r.tauxEndettement * 100)} %`} danger={r.tauxEndettement > 0.4} />
            <Metric label="Coût total" value={`${fmt(r.coutTotal)} DH`} />
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {r.explication}
          </div>
        </div>
      </div>
    )
  }

  if (op.kind === 'transfer') {
    const r = op.result
    const approved = r?.decision === 'approuve'
    return (
      <div className={`${card} p-5 mb-4`}>
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Cpu size={18} className="text-primary-500" /> Pipeline virement — déclenchée par l’assistant</h3>
        <AgentOrchestration steps={r?.steps} revealed={reveal.revealed} done={reveal.done} />
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-wide font-medium text-slate-400 mb-2">Détail des vérifications</p>
          <PipelineView steps={r?.steps} reveal={reveal} />
        </div>
        <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
          {op.executed ? (
            <div className="text-center py-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary-100 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-3"><Check size={24} /></div>
              <p className="font-semibold text-primary-600 dark:text-primary-400">Virement exécuté</p>
              <p className="text-sm text-slate-500 mt-1">{fmt(op.exec?.montant)} DH → {op.exec?.beneficiaire}</p>
              <p className="text-xs text-slate-400 mt-1 font-mono">Réf. {op.exec?.reference}</p>
            </div>
          ) : approved ? (
            <div>
              <div className="flex items-center gap-2 mb-3 text-primary-600 dark:text-primary-400 text-sm font-medium">
                <KeyRound size={16} /> Virement autorisé — signature par OTP requise
              </div>
              <p className="text-sm text-slate-500 mb-3">
                {fmt(r.montant)} DH vers <span className="font-medium">{r.beneficiaire}</span>
                {r.beneficiaireConnu ? '' : ' (nouveau bénéficiaire)'}.
              </p>
              {op.devOtp && (
                <div className="rounded-xl border border-primary-200 dark:border-primary-500/30 bg-primary-50 dark:bg-primary-500/10 p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Lisez ce code à voix haute (ou tapez-le) pour signer</p>
                  <p className="text-3xl font-mono font-bold tracking-[0.3em] text-primary-600 dark:text-primary-400">{op.devOtp}</p>
                </div>
              )}
              {op.otpError && <p className="text-sm text-rose-600 dark:text-rose-400 mt-2">Code incorrect — redites le code affiché.</p>}
            </div>
          ) : (
            <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
              <X size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Virement refusé</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{r?.motifRefus || 'Contrôles non satisfaits.'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}

export default Assistant
