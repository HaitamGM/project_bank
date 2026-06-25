import { motion } from 'framer-motion'
import {
  ShieldCheck, Scale, Gauge, AlertTriangle, Sparkles, Wallet,
  Landmark, Check, X, Loader2, Cpu, Clock, Zap,
} from 'lucide-react'

// Mêmes icônes/couleurs que la vue détaillée (Pipeline.jsx) pour la cohérence.
const STEP_ICON = {
  kyc: ShieldCheck, capacite: Scale, fraude: AlertTriangle, scoring: Gauge,
  decision: Landmark, explication: Sparkles, provision: Wallet, limites: Scale,
}
const STATUS = {
  ok: { node: 'bg-emerald-500', glow: 'shadow-emerald-500/40', text: 'text-emerald-600 dark:text-emerald-400', from: 'from-emerald-500' },
  warn: { node: 'bg-amber-500', glow: 'shadow-amber-500/40', text: 'text-amber-600 dark:text-amber-400', from: 'from-amber-500' },
  fail: { node: 'bg-rose-500', glow: 'shadow-rose-500/40', text: 'text-rose-600 dark:text-rose-400', from: 'from-rose-500' },
}

const StatusGlyph = ({ status }) =>
  status === 'fail' ? <X size={13} /> : status === 'warn' ? <AlertTriangle size={12} /> : <Check size={13} />

/**
 * AgentOrchestration — présentation horizontale, moderne et animée de l'orchestration
 * des agents. Les nœuds se révèlent un à un, les connecteurs se remplissent et un
 * « paquet de données » circule sur le lien actif. Le tempo (`revealed`/`done`) est
 * fourni par le parent (hook `useStepReveal`) afin d'être synchronisé avec la vue détaillée.
 *
 * Performance : uniquement des animations transform/opacity/width (GPU-friendly),
 * aucune mesure de layout, aucun re-render hors changement de `revealed`.
 */
export function AgentOrchestration({ steps, revealed = 0, done = false }) {
  if (!steps?.length) return null
  const total = steps.length
  const totalMs = steps.reduce((acc, s) => acc + (s.durationMs || 0), 0)
  const activeStep = revealed < total ? steps[revealed] : null

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-900/60 p-4 sm:p-5">
      {/* En-tête : titre + état global */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex w-8 h-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Cpu size={16} />
            {!done && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">Orchestration des agents</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {done
                ? `${total} agents · ${totalMs} ms`
                : activeStep
                  ? <>En cours — <span className="text-emerald-600 dark:text-emerald-400 font-medium">{activeStep.agent}</span></>
                  : 'Initialisation…'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400">
            <Clock size={11} /> {totalMs} ms
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            done ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                 : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300'
          }`}>
            <Zap size={11} /> {Math.min(revealed, total)}/{total}
          </span>
        </div>
      </div>

      {/* Flux horizontal : nœuds (agents) + connecteurs animés */}
      <div className="flex items-start gap-0 overflow-x-auto pb-2 -mx-1 px-1">
        {steps.map((s, i) => {
          const shown = i < revealed
          const running = i === revealed
          const Icon = STEP_ICON[s.id] || Cpu
          const st = STATUS[s.status] || STATUS.ok
          // Connecteur i → i+1 : plein quand le nœud i est révélé ; en circulation
          // (paquet animé) tant que le nœud i+1 n'est pas encore révélé.
          const linkActive = i < revealed
          const linkFlowing = revealed === i + 1

          return (
            <div key={s.id} className="flex items-start shrink-0">
              {/* Nœud agent */}
              <div className="flex flex-col items-center w-[92px] sm:w-[104px] text-center">
                <motion.div
                  initial={false}
                  animate={{ scale: running ? 1.06 : 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                  className={`relative w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-colors duration-300 ${
                    shown ? `${st.node} ${st.glow}`
                          : running ? 'bg-emerald-500 shadow-emerald-500/40'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 shadow-none'
                  }`}
                >
                  {running ? <Loader2 size={20} className="animate-spin" /> : <Icon size={20} />}
                  {running && (
                    <span className="absolute inset-0 rounded-2xl ring-2 ring-emerald-400/60 animate-pulse" />
                  )}
                  {/* Badge de statut */}
                  {shown && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center ${st.text}`}
                    >
                      <StatusGlyph status={s.status} />
                    </motion.span>
                  )}
                </motion.div>

                {/* Numéro d'ordre */}
                <span className="mt-2 text-[9px] font-mono text-slate-400">{String(i + 1).padStart(2, '0')}</span>
                <motion.p
                  initial={false}
                  animate={{ opacity: shown || running ? 1 : 0.45 }}
                  className="text-[11px] font-semibold leading-tight mt-0.5 px-0.5"
                >
                  {s.agent}
                </motion.p>
                <p className="text-[9px] text-slate-400 leading-tight mt-0.5 line-clamp-2">{s.tech}</p>
                <span className={`mt-1 text-[9px] tabular-nums ${shown ? st.text : 'text-slate-300 dark:text-slate-600'}`}>
                  {s.durationMs} ms
                </span>
              </div>

              {/* Connecteur vers l'agent suivant */}
              {i < total - 1 && (
                <div className="relative mt-6 h-1 w-7 sm:w-9 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0">
                  <motion.div
                    initial={false}
                    animate={{ width: linkActive ? '100%' : '0%' }}
                    transition={{ duration: 0.45, ease: 'easeInOut' }}
                    className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${st.from} to-emerald-400`}
                  />
                  {linkFlowing && (
                    <motion.span
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_2px_rgba(16,185,129,0.7)]"
                      initial={{ left: '-10%' }}
                      animate={{ left: '110%' }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Barre de progression globale */}
      <div className="mt-3 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <motion.div
          initial={false}
          animate={{ width: `${(Math.min(revealed, total) / total) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
        />
      </div>
    </div>
  )
}
