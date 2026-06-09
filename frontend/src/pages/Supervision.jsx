import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  RotateCcw,
  Mic,
  Brain,
  Search,
  ShieldCheck,
  FileText,
  Gauge,
  Scale,
  Sparkles,
  Check,
  ArrowRight,
  Cpu,
  Network,
  Clock,
  Terminal,
  User,
} from 'lucide-react'
import { mockAgents, mockPipelineRun } from '../services/mockData'

// Vitesse de rejeu : légèrement accélérée pour le rendu démo.
const TICK_MS = 30
const SPEED = 1.4
const card =
  'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800'

// Icône lucide associée à chaque agent (ordre du pipeline).
const AGENT_ICONS = {
  transcription: Mic,
  nlu: Brain,
  extraction: Search,
  kyc: ShieldCheck,
  rag: FileText,
  risque: Gauge,
  decision: Scale,
  explication: Sparkles,
}

// Formate des millisecondes en secondes lisibles (fr).
const fmtS = (ms) => (ms / 1000).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' s'
const fmtMs = (ms) => Math.round(ms).toLocaleString('fr-MA') + ' ms'

// Libellé lisible pour un identifiant ('client' ou id d'agent).
const labelOf = (id) => {
  if (id === 'client') return 'Client'
  const a = mockAgents.find((x) => x.id === id)
  return a ? a.nom : id
}

function Supervision() {
  const { totalMs, events } = mockPipelineRun
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef(null)
  const logRef = useRef(null)

  // Nettoyage centralisé de l'horloge.
  const stopClock = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // Démarre (ou relance proprement) le rejeu depuis zéro.
  const replay = () => {
    stopClock()
    setElapsed(0)
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + TICK_MS * SPEED
        if (next >= totalMs) {
          stopClock()
          setRunning(false)
          return totalMs
        }
        return next
      })
    }, TICK_MS)
  }

  // Réinitialisation complète.
  const reset = () => {
    stopClock()
    setRunning(false)
    setElapsed(0)
  }

  // Anti-fuite : on coupe l'interval au démontage.
  useEffect(() => stopClock, [])

  // Auto-scroll du journal au fil des événements.
  const visibleEvents = events.filter((e) => e.t <= elapsed)
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [visibleEvents.length])

  // Détermine l'état de chaque agent à partir de l'horloge.
  // Bornes : début = arrivée du 1er message vers l'agent, fin = début + dureeMs.
  const agentBounds = mockAgents.map((agent) => {
    const arrival = events.find((e) => e.to === agent.id)
    const start = arrival ? arrival.t : 0
    return { id: agent.id, start, end: start + agent.dureeMs }
  })

  const agentState = (id) => {
    if (!running && elapsed === 0) return 'pending'
    const b = agentBounds.find((x) => x.id === id)
    if (!b) return 'pending'
    if (elapsed >= b.end) return 'done'
    if (elapsed >= b.start) return 'active'
    return 'pending'
  }

  const finished = !running && elapsed >= totalMs
  const idle = !running && elapsed === 0
  const progress = Math.min(100, (elapsed / totalMs) * 100)

  // Première rangée 4 agents, deuxième rangée 4 agents (serpentin).
  const row1 = mockAgents.slice(0, 4)
  const row2 = mockAgents.slice(4, 8)

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* ── En-tête ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8"
      >
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <Network size={18} />
            <span className="text-xs font-semibold uppercase tracking-wider">Coulisses techniques</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Supervision multi-agents</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Le pipeline des agents en temps réel</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={replay}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95"
          >
            <Play size={16} />
            {finished ? 'Rejouer' : "Rejouer l'exécution"}
          </button>
          <button
            onClick={reset}
            disabled={idle}
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw size={16} />
            Réinitialiser
          </button>
        </div>
      </motion.div>

      {/* ── Bandeau de stats ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Cpu, label: 'Agents orchestrés', value: mockAgents.length, sub: 'pipeline séquentiel' },
          { icon: Clock, label: 'Durée totale', value: fmtS(totalMs), sub: 'bout en bout' },
          { icon: Terminal, label: 'Décision', value: mockPipelineRun.decisionId, sub: 'crédit immobilier' },
          {
            icon: Gauge,
            label: 'Temps écoulé',
            value: running || finished ? fmtMs(elapsed) : '—',
            sub: running ? 'rejeu en cours' : finished ? 'terminé' : 'en attente',
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 * i }}
            className={`${card} p-4 shadow-sm`}
          >
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <s.icon size={15} />
              <span className="text-[11px] font-medium uppercase tracking-wide">{s.label}</span>
            </div>
            <p className="text-xl font-bold tracking-tight tabular-nums">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Barre de progression globale ────────────────────── */}
      <div className="mb-7">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span className="font-medium">Progression du pipeline</span>
          <span className="tabular-nums">
            {fmtMs(elapsed)} / {fmtMs(totalMs)}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'linear', duration: TICK_MS / 1000 }}
          />
        </div>
      </div>

      {/* ── Pipeline visuel ─────────────────────────────────── */}
      <div className={`${card} p-6 mb-6 shadow-sm`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold flex items-center gap-2">
            <Network size={17} className="text-emerald-600 dark:text-emerald-400" />
            Pipeline d'orchestration
          </h2>
          <span className="text-xs text-slate-400">transcription → … → explication</span>
        </div>

        {/* Entrée client */}
        <div className="flex items-center gap-3 mb-5">
          <ClientNode active={running && elapsed < 480} />
          <ArrowRight size={18} className="text-slate-300 dark:text-slate-600" />
          <span className="text-xs text-slate-400">flux audio entrant</span>
        </div>

        {/* Rangée 1 (gauche → droite) */}
        <PipelineRow agents={row1} agentState={agentState} reverse={false} />

        {/* Connecteur vertical en serpentin */}
        <div className="hidden md:flex justify-end pr-7 my-1">
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Rangée 2 (droite → gauche) */}
        <PipelineRow agents={row2} agentState={agentState} reverse={true} />

        {/* Sortie client */}
        <div className="flex items-center gap-3 mt-5">
          <ClientNode active={finished} output />
          <ArrowRight size={18} className="text-slate-300 dark:text-slate-600 rotate-180" />
          <span className="text-xs text-slate-400">justificatif rendu au client</span>
        </div>
      </div>

      {/* ── Journal + verdict ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Journal des messages */}
        <div className={`${card} lg:col-span-2 overflow-hidden shadow-sm`}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
            <div className="flex items-center gap-2">
              <Terminal size={15} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold">Journal des messages</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
            </div>
          </div>

          <div
            ref={logRef}
            className="font-mono text-[13px] p-4 h-72 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/30"
          >
            {visibleEvents.length === 0 && (
              <p className="text-slate-400 dark:text-slate-500">
                {'>'} En attente du lancement — cliquez sur « Rejouer l'exécution ».
              </p>
            )}
            <AnimatePresence initial={false}>
              {visibleEvents.map((e, i) => (
                <motion.div
                  key={`${e.t}-${i}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mb-2 leading-snug"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-slate-400 dark:text-slate-500 tabular-nums">
                      [{String(Math.round(e.t)).padStart(4, '0')} ms]
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {labelOf(e.from)}
                    </span>
                    <ArrowRight size={12} className="inline text-slate-400" />
                    <span className="text-sky-600 dark:text-sky-400 font-medium">{labelOf(e.to)}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">· {e.label}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 pl-1 mt-0.5">{e.detail}</p>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Curseur clignotant pendant le rejeu */}
            {running && (
              <span className="inline-block w-2 h-4 bg-emerald-500 align-middle animate-pulse" />
            )}
          </div>
        </div>

        {/* Verdict final */}
        <div className={`${card} p-5 flex flex-col shadow-sm`}>
          <div className="flex items-center gap-2 text-slate-400 mb-3">
            <Scale size={15} />
            <span className="text-[11px] font-medium uppercase tracking-wide">Verdict final</span>
          </div>

          <AnimatePresence mode="wait">
            {finished ? (
              <motion.div
                key="verdict"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="flex-1 flex flex-col"
              >
                <div className="inline-flex items-center gap-2 self-start bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full text-sm font-semibold mb-3">
                  <Check size={15} /> Approuvé
                </div>
                <p className="text-3xl font-bold tracking-tight">
                  78<span className="text-base text-slate-400 font-medium">/100</span>
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Score 78 ≥ seuil 60 — taux d'endettement 28 % sous le plafond.
                </p>
                <div className="mt-auto pt-4 grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                    <p className="text-xs text-slate-400">Latence totale</p>
                    <p className="font-bold mt-0.5 tabular-nums">{fmtS(totalMs)}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                    <p className="text-xs text-slate-400">Agents OK</p>
                    <p className="font-bold mt-0.5 tabular-nums">
                      {mockAgents.length}/{mockAgents.length}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center py-6"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                  {running ? <Sparkles size={22} className="animate-pulse" /> : <Scale size={22} />}
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {running ? 'Délibération en cours…' : 'Aucune décision rendue'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {running ? 'Le verdict apparaîtra à la fin du pipeline.' : 'Lancez un rejeu pour voir le verdict.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ── Rangée d'agents ─────────────────────────────────────────
function PipelineRow({ agents, agentState, reverse }) {
  const ordered = reverse ? [...agents].reverse() : agents
  return (
    <div className={`flex flex-col md:flex-row items-stretch gap-3 ${reverse ? 'md:flex-row-reverse' : ''}`}>
      {ordered.map((agent, idx) => (
        <div key={agent.id} className="flex items-center gap-3 flex-1">
          <AgentNode agent={agent} state={agentState(agent.id)} />
          {idx < ordered.length - 1 && (
            <ArrowRight
              size={18}
              className={`hidden md:block flex-shrink-0 text-slate-300 dark:text-slate-600 ${reverse ? 'rotate-180' : ''}`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Nœud d'agent ────────────────────────────────────────────
function AgentNode({ agent, state }) {
  const Icon = AGENT_ICONS[agent.id] || Cpu

  const styles = {
    pending:
      'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
    active:
      'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]',
    done: 'border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-slate-900',
  }[state]

  const iconWrap = {
    pending: 'bg-slate-100 dark:bg-slate-800 text-slate-400',
    active: 'bg-emerald-500 text-white',
    done: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  }[state]

  return (
    <motion.div
      animate={{ scale: state === 'active' ? 1.05 : 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 18 }}
      className={`relative flex-1 min-w-0 rounded-xl border p-3.5 transition-colors ${styles}`}
    >
      {/* Halo pulsant pour l'agent actif */}
      {state === 'active' && (
        <motion.span
          className="absolute inset-0 rounded-xl border-2 border-emerald-400/60 pointer-events-none"
          animate={{ opacity: [0.6, 0.15, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${iconWrap}`}>
          <Icon size={18} />
        </div>
        {state === 'done' && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0"
          >
            <Check size={12} strokeWidth={3} />
          </motion.span>
        )}
        {state === 'active' && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
            actif
          </span>
        )}
      </div>

      <p className="font-semibold text-sm mt-2.5 truncate">{agent.nom}</p>
      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate mt-0.5">
        {agent.tech}
      </p>
      <p className="text-[11px] text-slate-400 leading-snug mt-1 line-clamp-2">{agent.role}</p>
      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <Clock size={11} />
        <span className="tabular-nums">{agent.dureeMs} ms</span>
      </div>
    </motion.div>
  )
}

// ── Nœud client (entrée / sortie) ───────────────────────────
function ClientNode({ active, output }) {
  return (
    <motion.div
      animate={{ scale: active ? 1.05 : 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 18 }}
      className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition-colors ${
        active
          ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
          active
            ? 'bg-orange-500 text-white'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
        }`}
      >
        {output ? <FileText size={16} /> : <User size={16} />}
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight">Client</p>
        <p className="text-[11px] text-slate-400">{output ? 'réponse' : 'demande vocale'}</p>
      </div>
    </motion.div>
  )
}

export default Supervision
