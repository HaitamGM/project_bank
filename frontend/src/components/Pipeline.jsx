import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheck, Scale, Gauge, AlertTriangle, Sparkles, Wallet,
  Landmark, Check, X, Loader2, Cpu, Clock,
} from 'lucide-react'

const STEP_ICON = {
  kyc: ShieldCheck, capacite: Scale, fraude: AlertTriangle, scoring: Gauge,
  decision: Landmark, explication: Sparkles, provision: Wallet, limites: Scale,
}
const STATUS_STYLE = {
  ok: { dot: 'bg-primary-500', text: 'text-primary-600 dark:text-primary-400', ring: 'border-primary-500' },
  warn: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', ring: 'border-amber-500' },
  fail: { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', ring: 'border-rose-500' },
}

// Révèle les étapes une à une selon leur durée (effet "pipeline en cours").
// Exporté pour synchroniser plusieurs vues (orchestration + détail) sur le même tempo.
export function useStepReveal(steps) {
  const [revealed, setRevealed] = useState(0)
  const [prevSteps, setPrevSteps] = useState(steps)
  // Réinitialise pendant le rendu quand la pipeline change (motif React recommandé,
  // évite un setState synchrone dans un effet).
  if (steps !== prevSteps) {
    setPrevSteps(steps)
    setRevealed(0)
  }
  useEffect(() => {
    if (!steps?.length) return
    const timers = []
    let acc = 0
    steps.forEach((s, i) => {
      acc += Math.max(160, (s.durationMs || 200) * 0.6)
      timers.push(setTimeout(() => setRevealed(i + 1), acc))
    })
    return () => timers.forEach(clearTimeout)
  }, [steps])
  return { revealed, done: steps ? revealed >= steps.length : false }
}

export function PipelineView({ steps, reveal }) {
  // Si `reveal` est fourni par le parent, on l'utilise (tempo partagé avec
  // l'orchestration) ; sinon on calcule un tempo interne (usage autonome).
  // Quand `reveal` est fourni, on passe null au hook interne pour ne PAS lancer
  // de minuteries en double (perf : évite des re-renders inutiles).
  const internal = useStepReveal(reveal ? null : steps)
  const { revealed, done } = reveal || internal
  if (!steps?.length) return null
  return (
    <div className="space-y-2.5">
      {steps.map((s, i) => {
        const shown = i < revealed
        const running = i === revealed
        const Icon = STEP_ICON[s.id] || Cpu
        const st = STATUS_STYLE[s.status] || STATUS_STYLE.ok
        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: shown || running ? 1 : 0.35 }}
            className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
              shown ? `${st.ring} bg-white dark:bg-slate-900` : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${shown ? `${st.dot} text-white` : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
              {running ? <Loader2 size={17} className="animate-spin" /> : <Icon size={17} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm">{s.name}</p>
                <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={10} />{s.durationMs} ms</span>
              </div>
              <p className="text-[11px] text-primary-600 dark:text-primary-400 font-medium">{s.agent} · {s.tech}</p>
              {shown && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.summary}</p>}
            </div>
            {shown && (
              <span className={`shrink-0 mt-1 ${st.text}`}>
                {s.status === 'fail' ? <X size={16} /> : s.status === 'warn' ? <AlertTriangle size={15} /> : <Check size={16} />}
              </span>
            )}
          </motion.div>
        )
      })}
      {done && <p className="text-[11px] text-slate-400 text-center pt-1">Pipeline terminée · {steps.length} agents</p>}
    </div>
  )
}

export function Metric({ label, value, danger }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3">
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
      <p className={`text-base font-bold ${danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>{value}</p>
    </div>
  )
}
