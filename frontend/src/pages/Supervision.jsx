import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, RotateCcw, User, Wallet, Gauge, Scale, Cpu, Sparkles, Check, X,
  ArrowRight, Network, Clock, Terminal, ChevronDown,
} from 'lucide-react'
import { usePipelineRuns, useDecisions, useAgents } from '../hooks/useClient'

const TICK_MS = 40
const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800'

const AGENT_ICONS = { 'AG-CRM': User, 'AG-FIN': Wallet, 'AG-RISK': Gauge, 'AG-DEC': Scale, 'AG-EXEC': Cpu, 'AG-XAI': Sparkles }
const fmtS = (ms) => (ms / 1000).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' s'
const fmtMs = (ms) => Math.round(ms).toLocaleString('fr-MA') + ' ms'

export default function Supervision() {
  const clientId = localStorage.getItem('clientId') || 'CL-2024-0042'
  const { data: runs } = usePipelineRuns(clientId)
  const { data: decisions } = useDecisions(clientId)
  const { data: agents } = useAgents()

  const [selId, setSelId] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [prevRunId, setPrevRunId] = useState(null)
  const intervalRef = useRef(null)
  const logRef = useRef(null)

  // Joint chaque run à sa décision (verdict réel).
  const items = useMemo(() => {
    if (!runs || !decisions) return []
    const byId = Object.fromEntries(decisions.map((d) => [d.id, d]))
    return runs
      .map((r) => ({ ...r, decision: byId[r.decisionId] }))
      .sort((a, b) => (a.horodatage < b.horodatage ? 1 : -1))
  }, [runs, decisions])

  const agentsById = useMemo(() => Object.fromEntries((agents || []).map((a) => [a.id, a])), [agents])
  const run = items.find((r) => r.runId === selId) || items[0]

  // Bornes temporelles cumulées de chaque étape.
  const bounds = useMemo(() => {
    if (!run) return []
    let t = 0
    return run.etapes.map((e) => { const start = t; t += e.dureeMs; return { ...e, start, end: t } })
  }, [run])
  const total = run ? run.dureeTotaleMs : 0

  const stopClock = () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null } }
  const replay = () => {
    stopClock(); setElapsed(0); setRunning(true)
    const perTick = Math.max(20, total / (3200 / TICK_MS)) // rejeu en ~3,2 s
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + perTick
        if (next >= total) { stopClock(); setRunning(false); return total }
        return next
      })
    }, TICK_MS)
  }
  const reset = () => { stopClock(); setRunning(false); setElapsed(0) }
  // Arrête l'horloge au démontage ET à chaque changement d'exécution (nettoyage de l'intervalle).
  useEffect(() => stopClock, [run?.runId])
  // Réinitialise les compteurs quand on change d'exécution (ajustement pendant le rendu,
  // motif React recommandé — pas de setState dans un effet, pas d'accès au ref en rendu).
  if (run && run.runId !== prevRunId) {
    setPrevRunId(run.runId)
    setRunning(false)
    setElapsed(0)
  }

  const stateOf = (b) => {
    if (!running && elapsed === 0) return 'pending'
    if (elapsed >= b.end) return 'done'
    if (elapsed >= b.start) return 'active'
    return 'pending'
  }
  const visible = bounds.filter((b) => elapsed >= b.start)
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [visible.length])

  const finished = !running && elapsed >= total && total > 0
  const idle = !running && elapsed === 0
  const progress = total ? Math.min(100, (elapsed / total) * 100) : 0

  if (!runs || !decisions) return <div className="p-8 text-slate-400">Chargement…</div>
  if (!run) return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Supervision multi-agents</h1>
      <p className="text-slate-500 dark:text-slate-400">Aucune exécution de pipeline pour ce client.</p>
    </div>
  )

  const dec = run.decision
  const approuve = dec && (dec.statut === 'approuve' || dec.statut === 'execute')

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 mb-1"><Network size={18} /><span className="text-xs font-semibold uppercase tracking-wider">Coulisses techniques</span></div>
          <h1 className="text-2xl font-bold tracking-tight">Supervision multi-agents</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Rejeu d'une exécution réelle du pipeline pour vos décisions</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={replay} className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95">
            <Play size={16} /> {finished ? 'Rejouer' : "Rejouer l'exécution"}
          </button>
          <button onClick={reset} disabled={idle} className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 disabled:opacity-40">
            <RotateCcw size={16} /> Réinitialiser
          </button>
        </div>
      </motion.div>

      {/* Sélecteur d'exécution */}
      <div className="mb-6 relative max-w-xl">
        <select value={run.runId} onChange={(e) => setSelId(e.target.value)}
          className="w-full appearance-none ps-4 pe-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:border-primary-500 outline-none">
          {items.map((r) => (
            <option key={r.runId} value={r.runId}>
              {r.horodatage} · {r.decision ? r.decision.intent : r.decisionId} {r.decision ? `· ${r.decision.statut}` : ''} ({fmtMs(r.dureeTotaleMs)})
            </option>
          ))}
        </select>
        <ChevronDown size={18} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Cpu, label: 'Agents orchestrés', value: run.etapes.length, sub: 'pipeline séquentiel' },
          { icon: Clock, label: 'Durée totale', value: fmtS(total), sub: 'bout en bout' },
          { icon: Terminal, label: 'Décision', value: run.decisionId, sub: dec ? dec.intent : '—' },
          { icon: Gauge, label: 'Temps écoulé', value: running || finished ? fmtMs(elapsed) : '—', sub: running ? 'rejeu en cours' : finished ? 'terminé' : 'en attente' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 * i }} className={`${card} p-4 shadow-sm`}>
            <div className="flex items-center gap-2 text-slate-400 mb-2"><s.icon size={15} /><span className="text-[11px] font-medium uppercase tracking-wide">{s.label}</span></div>
            <p className="text-xl font-bold tracking-tight tabular-nums truncate">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Progression */}
      <div className="mb-7">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span className="font-medium">Progression du pipeline</span>
          <span className="tabular-nums">{fmtMs(elapsed)} / {fmtMs(total)}</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400" animate={{ width: `${progress}%` }} transition={{ ease: 'linear', duration: TICK_MS / 1000 }} />
        </div>
      </div>

      {/* Pipeline visuel */}
      <div className={`${card} p-6 mb-6 shadow-sm`}>
        <div className="flex items-center gap-3 mb-5">
          <ClientNode active={running && elapsed < (bounds[0]?.end ?? 0)} />
          <ArrowRight size={18} className="text-slate-300 dark:text-slate-600" />
          <span className="text-xs text-slate-400">demande entrante</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {bounds.map((b) => <AgentNode key={b.agentId} etape={b} meta={agentsById[b.agentId]} state={stateOf(b)} />)}
        </div>
        <div className="flex items-center gap-3 mt-5">
          <ClientNode active={finished} output />
          <ArrowRight size={18} className="text-slate-300 dark:text-slate-600 rotate-180" />
          <span className="text-xs text-slate-400">décision rendue au client</span>
        </div>
      </div>

      {/* Journal + verdict */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${card} lg:col-span-2 overflow-hidden shadow-sm`}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
            <div className="flex items-center gap-2"><Terminal size={15} className="text-primary-600 dark:text-primary-400" /><span className="text-sm font-semibold">Journal d'exécution</span></div>
            <span className="text-xs text-slate-400 font-mono">{run.runId}</span>
          </div>
          <div ref={logRef} className="font-mono text-[13px] p-4 h-72 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/30">
            {visible.length === 0 && <p className="text-slate-400">{'>'} En attente — cliquez sur « Rejouer l'exécution ».</p>}
            <AnimatePresence initial={false}>
              {visible.map((b, i) => (
                <motion.div key={`${b.agentId}-${i}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="mb-2 leading-snug">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-slate-400 tabular-nums">[{String(Math.round(b.end)).padStart(4, '0')} ms]</span>
                    <span className="text-primary-600 dark:text-primary-400 font-medium">{b.agent}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{b.statut}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 ps-1 mt-0.5">{b.sortie}</p>
                </motion.div>
              ))}
            </AnimatePresence>
            {running && <span className="inline-block w-2 h-4 bg-primary-500 align-middle animate-pulse" />}
          </div>
        </div>

        <div className={`${card} p-5 flex flex-col shadow-sm`}>
          <div className="flex items-center gap-2 text-slate-400 mb-3"><Scale size={15} /><span className="text-[11px] font-medium uppercase tracking-wide">Verdict final</span></div>
          <AnimatePresence mode="wait">
            {finished ? (
              <motion.div key="v" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col">
                <div className={`inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full text-sm font-semibold mb-3 ${approuve ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'}`}>
                  {approuve ? <Check size={15} /> : <X size={15} />} {dec ? (dec.statut === 'execute' ? 'Exécuté' : dec.statut === 'approuve' ? 'Approuvé' : 'Refusé') : '—'}
                </div>
                {dec?.score != null && <p className="text-3xl font-bold tracking-tight">{dec.score}<span className="text-base text-slate-400 font-medium">/100</span></p>}
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{dec?.explication}</p>
                <div className="mt-auto pt-4 grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3"><p className="text-xs text-slate-400">Latence totale</p><p className="font-bold mt-0.5 tabular-nums">{fmtS(total)}</p></div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3"><p className="text-xs text-slate-400">Agents OK</p><p className="font-bold mt-0.5 tabular-nums">{run.etapes.length}/{run.etapes.length}</p></div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="w" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-center py-6">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">{running ? <Sparkles size={22} className="animate-pulse" /> : <Scale size={22} />}</div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{running ? 'Délibération en cours…' : 'Aucune décision rendue'}</p>
                <p className="text-xs text-slate-400 mt-1">{running ? 'Le verdict apparaîtra à la fin.' : 'Lancez un rejeu pour voir le verdict.'}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function AgentNode({ etape, meta, state }) {
  const Icon = AGENT_ICONS[etape.agentId] || Cpu
  const styles = {
    pending: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
    active: 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]',
    done: 'border-primary-200 dark:border-primary-500/30 bg-white dark:bg-slate-900',
  }[state]
  const iconWrap = {
    pending: 'bg-slate-100 dark:bg-slate-800 text-slate-400',
    active: 'bg-primary-500 text-white',
    done: 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400',
  }[state]
  return (
    <motion.div animate={{ scale: state === 'active' ? 1.04 : 1 }} transition={{ type: 'spring', stiffness: 280, damping: 18 }} className={`relative rounded-xl border p-3.5 transition-colors ${styles}`}>
      <div className="flex items-start justify-between gap-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${iconWrap}`}><Icon size={18} /></div>
        {state === 'done' && <span className="w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></span>}
        {state === 'active' && <span className="text-[10px] font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded-full">actif</span>}
      </div>
      <p className="font-semibold text-sm mt-2.5 truncate">{etape.agent}</p>
      {meta && <p className="text-[11px] text-primary-600 dark:text-primary-400 font-medium truncate mt-0.5">{meta.technologie}</p>}
      {meta && <p className="text-[11px] text-slate-400 leading-snug mt-1 line-clamp-2">{meta.role}</p>}
      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800"><Clock size={11} /><span className="tabular-nums">{etape.dureeMs} ms</span></div>
    </motion.div>
  )
}

function ClientNode({ active, output }) {
  return (
    <motion.div animate={{ scale: active ? 1.05 : 1 }} transition={{ type: 'spring', stiffness: 280, damping: 18 }} className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition-colors ${active ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}><User size={16} /></div>
      <div><p className="text-sm font-semibold leading-tight">Client</p><p className="text-[11px] text-slate-400">{output ? 'réponse' : 'demande'}</p></div>
    </motion.div>
  )
}
