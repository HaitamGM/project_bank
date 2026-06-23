import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RotateCcw,
  Check,
  X,
  Wallet,
  Scale,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Gauge,
  UserCircle,
} from 'lucide-react'
import { scoreCredit, SIMULATEUR_DEFAUT, SEUIL_ACCEPTATION } from '../services/scoring'
import { useClient } from '../hooks/useClient'

const fmtMad = (n) => Math.round(n).toLocaleString('fr-MA') + ' MAD'

const SLIDERS = [
  { key: 'revenuMensuel', label: 'Revenu mensuel', icon: Wallet, min: 5000, max: 60000, step: 500, unit: ' DH' },
  { key: 'montant', label: 'Montant du crédit', icon: Scale, min: 50000, max: 2000000, step: 10000, unit: ' DH' },
  { key: 'dureeMois', label: 'Durée', icon: Calendar, min: 12, max: 300, step: 6, unit: ' mois' },
  { key: 'autresCharges', label: 'Autres charges mensuelles', icon: TrendingDown, min: 0, max: 15000, step: 100, unit: ' DH' },
  { key: 'ancienneteMois', label: 'Ancienneté professionnelle', icon: ShieldCheck, min: 0, max: 240, step: 1, unit: ' mois' },
  { key: 'incidentsPaiement', label: 'Incidents de paiement', icon: AlertTriangle, min: 0, max: 5, step: 1, unit: '' },
]

const SCENARIOS = [
  {
    label: 'Profil solide',
    icon: TrendingUp,
    accent: 'emerald',
    preset: { revenuMensuel: 32000, montant: 600000, dureeMois: 240, autresCharges: 800, ancienneteMois: 96, incidentsPaiement: 0, fichageBam: false },
  },
  {
    label: 'Surendettement → refus',
    icon: TrendingDown,
    accent: 'rose',
    preset: { revenuMensuel: 9000, montant: 900000, dureeMois: 180, autresCharges: 3500, ancienneteMois: 18, incidentsPaiement: 1, fichageBam: false },
  },
  {
    label: 'Fiché BAM',
    icon: AlertTriangle,
    accent: 'rose',
    preset: { revenuMensuel: 18000, montant: 600000, dureeMois: 240, autresCharges: 1100, ancienneteMois: 36, incidentsPaiement: 2, fichageBam: true },
  },
]

const fmtUnit = (val, unit) => (unit === ' DH' ? val.toLocaleString('fr-MA') + unit : val.toLocaleString('fr-MA') + unit)

function ScoreGauge({ score, decision, seuil }) {
  const size = 220
  const stroke = 16
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const approuve = decision === 'approuve'
  const ringColor = approuve ? '#10b981' : '#f43f5e'
  // fraction du seuil sur l'arc (échelle de score 0–100)
  const seuilFrac = seuil / 100

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-100 dark:stroke-slate-800"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={ringColor}
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c - (score / 100) * c, stroke: ringColor }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
        />
        {/* marqueur du seuil */}
        <line
          x1={size / 2}
          y1={stroke / 2}
          x2={size / 2}
          y2={stroke + 6}
          transform={`rotate(${seuilFrac * 360} ${size / 2} ${size / 2})`}
          className="stroke-slate-400 dark:stroke-slate-500"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={score}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className={`text-5xl font-bold tracking-tight tabular-nums ${approuve ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
          >
            {score}
          </motion.span>
        </AnimatePresence>
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">/ 100</span>
        <span className="mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          Seuil {seuil}
        </span>
      </div>
    </div>
  )
}

function Slider({ cfg, value, onChange }) {
  const Icon = cfg.icon
  const pct = ((value - cfg.min) / (cfg.max - cfg.min)) * 100
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <Icon size={15} className="text-slate-400 dark:text-slate-500" />
          {cfg.label}
        </label>
        <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
          {fmtUnit(value, cfg.unit)}
        </span>
      </div>
      <input
        type="range"
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        value={value}
        onChange={(e) => onChange(cfg.key, Number(e.target.value))}
        className="w-full h-2 appearance-none cursor-pointer rounded-full bg-slate-200 dark:bg-slate-800 accent-emerald-500
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white dark:[&::-webkit-slider-thumb]:border-slate-900
          [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:transition
          [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-emerald-500 [&::-moz-range-thumb]:border-0"
        style={{
          background: `linear-gradient(to right, rgb(16 185 129) ${pct}%, transparent ${pct}%)`,
        }}
      />
    </div>
  )
}

function Metric({ label, value, icon: Icon, danger }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
        <Icon size={13} />
        {label}
      </div>
      <p className={`text-lg font-bold tabular-nums ${danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
        {value}
      </p>
    </div>
  )
}

function Waterfall({ contributions }) {
  const maxAbs = Math.max(...contributions.map((c) => Math.abs(c.impact)), 1)
  return (
    <div className="space-y-2">
      {contributions.map((c, i) => {
        const positive = c.impact >= 0
        const isBase = c.kind === 'base'
        const widthPct = (Math.abs(c.impact) / maxAbs) * 50
        return (
          <div key={c.label} className="flex items-center gap-3 text-xs">
            <span className="w-40 shrink-0 truncate text-slate-500 dark:text-slate-400" title={c.label}>
              {c.label}
            </span>
            <div className="relative flex-1 h-5">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
              <motion.div
                className={`absolute top-0 bottom-0 rounded ${
                  isBase
                    ? 'bg-slate-300 dark:bg-slate-600'
                    : positive
                    ? 'bg-emerald-500/80'
                    : 'bg-rose-500/80'
                }`}
                style={positive ? { left: '50%' } : { right: '50%' }}
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20, delay: i * 0.03 }}
              />
            </div>
            <span
              className={`w-9 shrink-0 text-right font-semibold tabular-nums ${
                isBase
                  ? 'text-slate-400 dark:text-slate-500'
                  : positive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {positive ? '+' : ''}
              {c.impact}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function Simulateur() {
  const clientId = localStorage.getItem('clientId') || 'CL-2024-0042'
  const { data: client } = useClient(clientId)

  // Pré-remplissage à partir du profil RÉEL du client connecté.
  const clientPreset = useMemo(() => {
    if (!client) return null
    return {
      revenuMensuel: client.professionnel?.revenuMensuel ?? SIMULATEUR_DEFAUT.revenuMensuel,
      montant: 600000,
      dureeMois: 240,
      autresCharges: client.bancaire?.chargesMensuelles ?? 0,
      ancienneteMois: client.professionnel?.ancienneteMois ?? 36,
      incidentsPaiement: client.risque?.incidentsPaiement ?? 0,
      fichageBam: !!client.risque?.fichageBam,
    }
  }, [client])

  const [params, setParams] = useState(SIMULATEUR_DEFAUT)
  const result = useMemo(() => scoreCredit(params), [params])

  // Applique le profil du client une fois ses données chargées (sans écraser les modifications ultérieures).
  const seeded = useRef(false)
  useEffect(() => {
    if (clientPreset && !seeded.current) {
      seeded.current = true
      setParams(clientPreset)
    }
  }, [clientPreset])

  const setParam = (key, value) => setParams((p) => ({ ...p, [key]: value }))
  const reset = () => setParams(clientPreset || SIMULATEUR_DEFAUT)
  const prenom = client?.personnel?.prenom

  const approuve = result.decision === 'approuve'
  const endettementPct = Math.round(result.tauxEndettement * 100)
  const endettementDanger = result.tauxEndettement > 0.4

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8 flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Gauge className="text-emerald-500" size={26} />
            Simulateur interactif
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {prenom ? `Pré-rempli avec le profil réel de ${prenom} — ajustez et voyez la décision changer.` : 'Ajustez les paramètres, voyez la décision changer.'}
          </p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
        >
          <RotateCcw size={15} /> Réinitialiser
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANNEAU GAUCHE — CONTRÔLES */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm"
        >
          <h2 className="font-semibold mb-1">Paramètres du dossier</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Crédit immobilier · taux {(result.tauxAnnuel * 100).toFixed(2)} %</p>

          <div className="space-y-5">
            {SLIDERS.map((cfg) => (
              <Slider key={cfg.key} cfg={cfg} value={params[cfg.key]} onChange={setParam} />
            ))}

            {/* Toggle fichage BAM */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <AlertTriangle size={15} className="text-slate-400 dark:text-slate-500" />
                Fiché Bank Al-Maghrib
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={params.fichageBam}
                onClick={() => setParam('fichageBam', !params.fichageBam)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  params.fichageBam ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <motion.span
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
                  style={{ left: params.fichageBam ? 22 : 2 }}
                />
              </button>
            </div>
          </div>

          {/* Scénarios rapides */}
          <div className="mt-7 pt-5 border-t border-slate-100 dark:border-slate-800">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 mb-3">
              <Sparkles size={13} /> Scénarios rapides
            </p>
            <div className="flex flex-wrap gap-2">
              {clientPreset && (
                <button
                  onClick={() => setParams(clientPreset)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-sky-200 dark:border-sky-500/30 text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition"
                >
                  <UserCircle size={13} /> Mon profil{prenom ? ` (${prenom})` : ''}
                </button>
              )}
              {SCENARIOS.map((s) => {
                const Icon = s.icon
                const emerald = s.accent === 'emerald'
                return (
                  <button
                    key={s.label}
                    onClick={() => setParams(s.preset)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${
                      emerald
                        ? 'border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                        : 'border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20'
                    }`}
                  >
                    <Icon size={13} /> {s.label}
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* PANNEAU DROIT — RÉSULTAT LIVE */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col"
        >
          {/* Jauge + verdict */}
          <div className="flex flex-col items-center">
            <ScoreGauge score={result.score} decision={result.decision} seuil={result.seuil} />

            <div className="mt-4 h-9">
              <AnimatePresence mode="wait">
                <motion.div
                  key={result.decision}
                  initial={{ opacity: 0, scale: 0.85, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold ${
                    approuve
                      ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                      : 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {approuve ? <Check size={16} /> : <X size={16} />}
                  {approuve ? 'Approuvé' : 'Refusé'}
                </motion.div>
              </AnimatePresence>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {approuve
                ? `Score au-dessus du seuil de ${SEUIL_ACCEPTATION}`
                : `Score sous le seuil de ${SEUIL_ACCEPTATION}`}
            </p>
          </div>

          {/* Métriques */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <Metric label="Mensualité" value={fmtMad(result.mensualite)} icon={Wallet} />
            <Metric label="Endettement" value={`${endettementPct} %`} icon={Scale} danger={endettementDanger} />
            <Metric label="Coût total" value={fmtMad(result.coutTotal)} icon={TrendingUp} />
          </div>

          {/* Cascade des contributions */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-3">
              Décomposition du score
            </p>
            <Waterfall contributions={result.contributions} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
