import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Gauge,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Scale,
  Search,
  Brain,
  Sparkles,
  FileText,
  ArrowRight,
  Check,
  X,
  AlertTriangle,
  Layers,
  Quote,
  BadgeCheck,
} from 'lucide-react'
import { mockXai } from '../services/mockData'
import { SEUIL_ACCEPTATION } from '../services/scoring'

const fmtMontant = (n) => n.toLocaleString('fr-MA') + ' DH'
const fmtPct = (v) => Math.round(v * 100) + ' %'

// Conteneur pour orchestrer l'apparition en cascade des sections.
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

const card =
  'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm'

/* ────────────────────────────────────────────────────────────
   1. Jauge de score circulaire (anneau SVG animé)
   ──────────────────────────────────────────────────────────── */
function ScoreGauge({ score, seuil, statut }) {
  const size = 220
  const stroke = 16
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pctScore = score / 100
  const pctSeuil = seuil / 100
  const approuve = statut === 'approuve'

  // Repère du seuil sur l'anneau (le cercle SVG démarre à 3h, on tourne de -90°).
  const angleSeuil = pctSeuil * 360 - 90
  const rad = (angleSeuil * Math.PI) / 180
  const cx = size / 2 + r * Math.cos(rad)
  const cy = size / 2 + r * Math.sin(rad)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Piste */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-100 dark:stroke-slate-800"
        />
        {/* Progression animée 0 → score */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={approuve ? 'stroke-emerald-500' : 'stroke-rose-500'}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pctScore) }}
          transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>

      {/* Repère du seuil */}
      <div
        className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-slate-900 dark:bg-slate-100 ring-2 ring-white dark:ring-slate-900"
        style={{ left: cx, top: cy }}
        title={`Seuil d'acceptation : ${seuil}`}
      />

      {/* Verdict au centre */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-5xl font-bold tracking-tight tabular-nums"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
          / 100 · seuil {seuil}
        </span>
        <span
          className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
            approuve
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
          }`}
        >
          {approuve ? <Check size={13} /> : <X size={13} />}
          {approuve ? 'Approuvé' : 'Refusé'}
        </span>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   2. Graphe Waterfall (cascade) — pièce maîtresse
   ──────────────────────────────────────────────────────────── */
function Waterfall({ scoreBase, features, score, seuil }) {
  // Échelle verticale : on borne l'axe à 0–100.
  const H = 320 // hauteur de la zone de tracé
  const max = 100
  const toY = (v) => H - (v / max) * H // valeur → coordonnée y (haut = grand)
  const barW = 46

  // Construction des segments : base, puis cumul des impacts, puis total.
  const steps = []
  let running = scoreBase
  steps.push({ type: 'base', label: 'Score de base', from: 0, to: scoreBase, impact: scoreBase })
  features.forEach((f) => {
    const from = running
    running += f.impact
    steps.push({ type: 'feature', label: f.label, valeur: f.valeur, from, to: running, impact: f.impact })
  })
  steps.push({ type: 'total', label: 'Score final', from: 0, to: score, impact: score })

  const ticks = [0, 20, 40, 60, 80, 100]
  const colWidth = `${100 / steps.length}%`

  return (
    <div className="relative">
      {/* Axe gradué + grille */}
      <div className="relative" style={{ height: H }}>
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute left-0 right-0 flex items-center"
            style={{ top: toY(t) }}
          >
            <span className="w-7 -mt-2 text-[10px] tabular-nums text-slate-400 dark:text-slate-500 text-right pr-1">
              {t}
            </span>
            <div className="flex-1 border-t border-dashed border-slate-100 dark:border-slate-800" />
          </div>
        ))}

        {/* Ligne de seuil */}
        <div
          className="absolute left-7 right-0 flex items-center pointer-events-none"
          style={{ top: toY(seuil) }}
        >
          <div className="flex-1 border-t-2 border-amber-400/70 dark:border-amber-400/60" />
          <span className="ml-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap bg-white/80 dark:bg-slate-900/80 px-1 rounded">
            seuil {seuil}
          </span>
        </div>

        {/* Barres */}
        <div className="absolute inset-0 left-7 flex items-end">
          {steps.map((s, i) => {
            const top = toY(Math.max(s.from, s.to))
            const height = Math.abs(toY(s.from) - toY(s.to))
            const positive = s.impact >= 0
            const isAnchor = s.type === 'base' || s.type === 'total'
            const colorClass = isAnchor
              ? s.type === 'total'
                ? 'bg-emerald-600 dark:bg-emerald-500'
                : 'bg-slate-300 dark:bg-slate-700'
              : positive
              ? 'bg-emerald-500'
              : 'bg-rose-500'

            return (
              <div
                key={i}
                className="relative h-full flex flex-col justify-end items-center"
                style={{ width: colWidth }}
              >
                {/* Valeur +/- au-dessus de la barre */}
                <motion.span
                  className={`absolute text-[11px] font-bold tabular-nums ${
                    isAnchor
                      ? 'text-slate-700 dark:text-slate-200'
                      : positive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                  style={{ top: top - 18 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.12 }}
                >
                  {isAnchor ? s.to : `${positive ? '+' : ''}${s.impact}`}
                </motion.span>

                {/* Barre flottante */}
                <motion.div
                  className={`rounded-md ${colorClass} ${isAnchor ? '' : 'opacity-90'}`}
                  style={{ width: barW, position: 'absolute', top }}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: Math.max(height, isAnchor ? 4 : 3), opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                />

                {/* Connecteur en pointillé vers la barre suivante */}
                {i < steps.length - 1 && (
                  <div
                    className="absolute border-t border-dashed border-slate-300 dark:border-slate-600"
                    style={{ top: toY(s.to), left: '50%', width: '100%' }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Étiquettes sous l'axe */}
      <div className="flex mt-3 pl-7">
        {steps.map((s, i) => (
          <div
            key={i}
            className="px-1 text-center text-[10px] leading-tight text-slate-500 dark:text-slate-400"
            style={{ width: colWidth }}
          >
            {s.label}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   3. Contributions divergentes (barres horizontales)
   ──────────────────────────────────────────────────────────── */
function Contributions({ features }) {
  const sorted = useMemo(
    () => [...features].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
    [features]
  )
  const maxAbs = Math.max(...features.map((f) => Math.abs(f.impact)))

  return (
    <div className="space-y-2.5">
      {sorted.map((f, i) => {
        const positive = f.direction === 'positif'
        const width = (Math.abs(f.impact) / maxAbs) * 50 // % de la demi-largeur

        return (
          <motion.div
            key={f.label}
            className="grid grid-cols-[1fr_auto] items-center gap-3"
            initial={{ opacity: 0, x: positive ? 12 : -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <div>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                  {f.label}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums flex-shrink-0">
                  {f.valeur}
                </span>
              </div>
              {/* Axe divergent : centre = 0 */}
              <div className="relative h-5 flex items-center">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                {/* Moitié gauche (négatif) */}
                <div className="w-1/2 h-2.5 flex justify-end pr-0">
                  {!positive && (
                    <motion.div
                      className="h-full rounded-l-md bg-rose-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${width * 2}%` }}
                      transition={{ duration: 0.6, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                </div>
                {/* Moitié droite (positif) */}
                <div className="w-1/2 h-2.5 flex justify-start pl-0">
                  {positive && (
                    <motion.div
                      className="h-full rounded-r-md bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${width * 2}%` }}
                      transition={{ duration: 0.6, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                </div>
              </div>
            </div>
            <span
              className={`w-12 text-right text-sm font-bold tabular-nums flex items-center justify-end gap-0.5 ${
                positive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {positive ? '+' : ''}
              {f.impact}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────── */
export default function XAI() {
  const x = mockXai
  const seuil = x.seuil ?? SEUIL_ACCEPTATION
  const approuve = x.statut === 'approuve'

  // Décision actuelle, pour détecter les contrefactuels qui font basculer le verdict.
  const verdictActuel = approuve ? 'approuve' : 'refuse'

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* 1 — En-tête */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
          <Brain size={18} />
          <span className="text-xs font-semibold uppercase tracking-wider">Explicabilité</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Centre d'explicabilité (XAI)</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Radiographie des décisions de l'IA
        </p>
      </motion.div>

      {/* Bandeau récap de la décision */}
      <motion.div
        className={`${card} p-5 mb-6 flex flex-wrap items-center gap-x-8 gap-y-4`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Scale size={20} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Décision {x.decisionId}
            </p>
            <p className="font-semibold">{x.intent}</p>
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Montant
          </p>
          <p className="font-semibold tabular-nums">{fmtMontant(x.montant)}</p>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Confiance du modèle
          </p>
          <p className="font-semibold tabular-nums">{fmtPct(x.confiance)}</p>
        </div>

        <div className="ml-auto">
          <span
            className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-full ${
              approuve
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
            }`}
          >
            {approuve ? <BadgeCheck size={16} /> : <X size={16} />}
            {approuve ? 'Approuvé' : 'Refusé'}
          </span>
        </div>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        {/* 2 — Jauge + confiance + résumé */}
        <motion.section variants={fadeUp} className={`${card} p-6`}>
          <h2 className="flex items-center gap-2 font-semibold mb-5">
            <Gauge size={18} className="text-emerald-600 dark:text-emerald-400" />
            Score d'octroi
          </h2>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <ScoreGauge score={x.score} seuil={seuil} statut={x.statut} />
            </div>
            <div className="flex-1 w-full">
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Confiance</p>
                  <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fmtPct(x.confiance)}
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${x.confiance * 100}%` }}
                      transition={{ duration: 1, delay: 0.6 }}
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Marge / seuil</p>
                  <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    +{x.score - seuil}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    {x.score} ≥ {seuil} requis
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 flex gap-3">
                <Sparkles
                  size={16}
                  className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5"
                />
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {x.resume}
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* 3 — Waterfall */}
        <motion.section variants={fadeUp} className={`${card} p-6`}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="flex items-center gap-2 font-semibold">
              <Layers size={18} className="text-emerald-600 dark:text-emerald-400" />
              Décomposition du score
            </h2>
            <div className="hidden sm:flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="w-3 h-3 rounded bg-emerald-500" /> Contribue
              </span>
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="w-3 h-3 rounded bg-rose-500" /> Pénalise
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Du score de base ({x.scoreBase}) au score final ({x.score}), chaque facteur empile sa
            contribution.
          </p>
          <Waterfall
            scoreBase={x.scoreBase}
            features={x.features}
            score={x.score}
            seuil={seuil}
          />
        </motion.section>

        {/* 4 — Contributions divergentes */}
        <motion.section variants={fadeUp} className={`${card} p-6`}>
          <h2 className="flex items-center gap-2 font-semibold mb-1">
            <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
            Poids des facteurs
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Facteurs triés par importance — à droite ceux qui aident, à gauche ceux qui pénalisent.
          </p>
          <Contributions features={x.features} />
        </motion.section>

        {/* 5 — Contrefactuels */}
        <motion.section variants={fadeUp} className={`${card} p-6`}>
          <h2 className="flex items-center gap-2 font-semibold mb-1">
            <Search size={18} className="text-emerald-600 dark:text-emerald-400" />
            Analyse contrefactuelle — « Et si… ? »
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Scénarios alternatifs et leur effet sur la décision. En surbrillance, ceux qui la font
            basculer.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {x.counterfactuals.map((cf, i) => {
              const bascule = cf.resultat !== verdictActuel
              const cfApprouve = cf.resultat === 'approuve'
              return (
                <motion.div
                  key={cf.condition}
                  className={`rounded-xl border p-4 ${
                    bascule
                      ? cfApprouve
                        ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/5'
                        : 'border-rose-300 dark:border-rose-500/40 bg-rose-50/50 dark:bg-rose-500/5'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">
                      {cf.condition}
                    </p>
                    <span
                      className={`flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        cfApprouve
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400'
                      }`}
                    >
                      {cfApprouve ? <Check size={11} /> : <X size={11} />}
                      {cfApprouve ? 'Approuvé' : 'Refusé'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                      <span className="tabular-nums">{x.score}</span>
                      <ArrowRight size={13} />
                      <span
                        className={`text-base font-bold tabular-nums ${
                          cfApprouve
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {cf.scoreSimule}
                      </span>
                    </div>
                    {bascule && (
                      <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        <AlertTriangle size={12} /> Décision basculée
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.section>

        {/* 6 — Sources RAG */}
        <motion.section variants={fadeUp} className={`${card} p-6`}>
          <h2 className="flex items-center gap-2 font-semibold mb-1">
            <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
            Sources consultées (RAG)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Les preuves documentaires sur lesquelles l'IA fonde sa décision.
          </p>
          <div className="space-y-3">
            {x.sources.map((s, i) => (
              <motion.div
                key={`${s.docId}-${i}`}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-4"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="text-sm font-semibold truncate">{s.titre}</span>
                      <span className="flex-shrink-0 text-xs font-mono text-slate-400 dark:text-slate-500">
                        {s.docId}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed flex gap-1.5">
                      <Quote
                        size={14}
                        className="text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5"
                      />
                      <span className="italic">{s.extrait}</span>
                    </p>
                    {/* Barre de pertinence */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 w-16 flex-shrink-0">
                        Pertinence
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <motion.div
                          className="h-full bg-emerald-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${s.pertinence * 100}%` }}
                          transition={{ duration: 0.9, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 w-10 text-right">
                        {fmtPct(s.pertinence)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </motion.div>
    </div>
  )
}
