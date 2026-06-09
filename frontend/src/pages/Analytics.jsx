import { motion } from 'framer-motion'
import {
  FileText,
  Percent,
  Wallet,
  Clock,
  Gauge,
  TrendingUp,
  BarChart3,
  Layers,
  ListChecks,
} from 'lucide-react'
import { mockAnalytics } from '../services/mockData'

const { kpis, parMois, parType, scoreDistribution, motifsRefus } = mockAnalytics

// ── Helpers de formatage ──────────────────────────────────────
const fmtMontantCourt = (n) => {
  const millions = n / 1_000_000
  const txt = millions
    .toLocaleString('fr-MA', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    .replace('.', ',')
  return `${txt} M MAD`
}
const fmtMontant = (n) => n.toLocaleString('fr-MA') + ' MAD'
const fmtPct = (x) => Math.round(x * 100) + ' %'

// ── Carte standard ────────────────────────────────────────────
const card =
  'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm'

// ───────────────────────────────────────────────────────────────
// 1) Carte KPI
// ───────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, value, label, accent }) {
  return (
    <div className={`${card} p-5 flex flex-col gap-3`}>
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}
      >
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight tabular-nums leading-none">
          {value}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{label}</p>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// 2) Barres groupées — approuvé vs refusé par mois (SVG fait main)
// ───────────────────────────────────────────────────────────────
function BarGroup({ data }) {
  const W = 560
  const H = 260
  const padL = 36
  const padR = 12
  const padT = 16
  const padB = 28
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const max = Math.max(...data.map((d) => d.approuve + d.refuse))
  // Échelle arrondie au prochain palier de 50.
  const top = Math.ceil(max / 50) * 50
  const y = (v) => padT + plotH - (v / top) * plotH

  const step = plotW / data.length
  const barW = Math.min(26, step * 0.42)
  const gap = 6
  const groupW = barW * 2 + gap

  const gridLines = Array.from({ length: 5 }, (_, i) => Math.round((top / 4) * i))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Décisions par mois">
      {/* Grille + axe Y */}
      {gridLines.map((g) => (
        <g key={g}>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(g)}
            y2={y(g)}
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth="1"
          />
          <text
            x={padL - 8}
            y={y(g) + 3}
            textAnchor="end"
            className="fill-slate-400 dark:fill-slate-500 text-[9px] tabular-nums"
          >
            {g}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const gx = padL + i * step + (step - groupW) / 2
        const aH = (d.approuve / top) * plotH
        const rH = (d.refuse / top) * plotH
        return (
          <g key={d.mois}>
            {/* Approuvé (emerald) */}
            <motion.rect
              x={gx}
              width={barW}
              rx="4"
              className="fill-emerald-500 dark:fill-emerald-400"
              initial={{ height: 0, y: padT + plotH }}
              animate={{ height: aH, y: padT + plotH - aH }}
              transition={{ duration: 0.7, delay: 0.1 + i * 0.07, ease: 'easeOut' }}
            />
            {/* Refusé (rose) */}
            <motion.rect
              x={gx + barW + gap}
              width={barW}
              rx="4"
              className="fill-rose-500 dark:fill-rose-400"
              initial={{ height: 0, y: padT + plotH }}
              animate={{ height: rH, y: padT + plotH - rH }}
              transition={{ duration: 0.7, delay: 0.16 + i * 0.07, ease: 'easeOut' }}
            />
            {/* Mois */}
            <text
              x={gx + groupW / 2}
              y={H - 9}
              textAnchor="middle"
              className="fill-slate-500 dark:fill-slate-400 text-[10px] font-medium"
            >
              {d.mois}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// 3) Donut — répartition par type (arcs via stroke-dasharray)
// ───────────────────────────────────────────────────────────────
const donutColors = [
  { stroke: 'stroke-emerald-500 dark:stroke-emerald-400', dot: 'bg-emerald-500 dark:bg-emerald-400' },
  { stroke: 'stroke-teal-500 dark:stroke-teal-400', dot: 'bg-teal-500 dark:bg-teal-400' },
  { stroke: 'stroke-sky-500 dark:stroke-sky-400', dot: 'bg-sky-500 dark:bg-sky-400' },
]

function Donut({ data }) {
  const size = 180
  const stroke = 26
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const total = data.reduce((s, d) => s + d.count, 0)

  const arcs = data.reduce((acc, d, i) => {
    const frac = d.count / total
    const len = frac * c
    const offset = i === 0 ? 0 : acc[i - 1].offset + acc[i - 1].len
    acc.push({
      ...d,
      frac,
      len,
      offset,
      color: donutColors[i % donutColors.length],
    })
    return acc
  }, [])

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full -rotate-90"
          role="img"
          aria-label="Répartition par type de décision"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="stroke-slate-100 dark:stroke-slate-800"
          />
          {arcs.map((a) => (
            <motion.circle
              key={a.type}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              className={a.color.stroke}
              strokeDasharray={`${a.len} ${c}`}
              strokeDashoffset={-a.offset}
              initial={{ opacity: 0, strokeDasharray: `0 ${c}` }}
              animate={{ opacity: 1, strokeDasharray: `${a.len} ${c}` }}
              transition={{ duration: 0.9, delay: 0.2, ease: 'easeInOut' }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums leading-none">
            {total.toLocaleString('fr-MA')}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            décisions
          </span>
        </div>
      </div>

      <ul className="flex-1 w-full space-y-3">
        {arcs.map((a) => (
          <li key={a.type} className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full shrink-0 ${a.color.dot}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{a.type}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {fmtMontant(a.montant)}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {Math.round(a.frac * 100)} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// 4) Histogramme — distribution des scores (seuil à 60)
// ───────────────────────────────────────────────────────────────
function ScoreHistogram({ data }) {
  const W = 560
  const H = 240
  const padL = 12
  const padR = 12
  const padT = 18
  const padB = 30
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const max = Math.max(...data.map((d) => d.count))
  const top = Math.ceil(max / 100) * 100
  const step = plotW / data.length
  const barW = step * 0.6

  // Buckets : 0–20 … 80–100 → 5 segments de 20 points sur 0..100.
  // Le seuil 60 tombe entre le 3e (40–60) et le 4e (60–80) bucket.
  const seuilX = padL + 3 * step

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Distribution des scores">
      {/* Ligne de base */}
      <line
        x1={padL}
        x2={W - padR}
        y1={padT + plotH}
        y2={padT + plotH}
        className="stroke-slate-200 dark:stroke-slate-800"
        strokeWidth="1"
      />

      {/* Seuil d'acceptation à 60 */}
      <motion.line
        x1={seuilX}
        x2={seuilX}
        y1={padT - 4}
        y2={padT + plotH}
        className="stroke-emerald-500 dark:stroke-emerald-400"
        strokeWidth="1.5"
        strokeDasharray="5 4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      />
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <rect
          x={seuilX + 4}
          y={padT - 2}
          width="78"
          height="16"
          rx="8"
          className="fill-emerald-500/15 dark:fill-emerald-400/15"
        />
        <text
          x={seuilX + 12}
          y={padT + 9}
          className="fill-emerald-600 dark:fill-emerald-400 text-[9px] font-semibold"
        >
          Seuil = 60
        </text>
      </motion.g>

      {data.map((d, i) => {
        const highlight = d.bucket === '60–80'
        const x = padL + i * step + (step - barW) / 2
        const h = (d.count / top) * plotH
        return (
          <g key={d.bucket}>
            <motion.rect
              x={x}
              width={barW}
              rx="5"
              className={
                highlight
                  ? 'fill-emerald-500 dark:fill-emerald-400'
                  : 'fill-emerald-500/30 dark:fill-emerald-400/25'
              }
              initial={{ height: 0, y: padT + plotH }}
              animate={{ height: h, y: padT + plotH - h }}
              transition={{ duration: 0.7, delay: 0.15 + i * 0.08, ease: 'easeOut' }}
            />
            <motion.text
              x={x + barW / 2}
              y={padT + plotH - h - 6}
              textAnchor="middle"
              className={
                highlight
                  ? 'fill-emerald-600 dark:fill-emerald-400 text-[10px] font-bold tabular-nums'
                  : 'fill-slate-500 dark:fill-slate-400 text-[10px] font-medium tabular-nums'
              }
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.3 }}
            >
              {d.count}
            </motion.text>
            <text
              x={x + barW / 2}
              y={H - 10}
              textAnchor="middle"
              className="fill-slate-500 dark:fill-slate-400 text-[10px] font-medium"
            >
              {d.bucket}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────
// 5) Barres horizontales — top motifs de refus
// ───────────────────────────────────────────────────────────────
function RefusBars({ data }) {
  const max = Math.max(...data.map((d) => d.count))
  return (
    <div className="space-y-4">
      {data.map((d, i) => (
        <div key={d.motif}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {d.motif}
            </span>
            <span className="text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400">
              {d.count}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-rose-500 dark:bg-rose-400"
              initial={{ width: 0 }}
              animate={{ width: `${(d.count / max) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.15 + i * 0.1, ease: 'easeOut' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// Section animée réutilisable
// ───────────────────────────────────────────────────────────────
function Section({ icon: Icon, title, subtitle, delay = 0, className = '', children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={`${card} p-6 ${className}`}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
          <Icon size={16} />
        </div>
        <div>
          <h2 className="font-semibold leading-tight">{title}</h2>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </motion.div>
  )
}

// ───────────────────────────────────────────────────────────────
// Page
// ───────────────────────────────────────────────────────────────
function Analytics() {
  const kpiItems = [
    {
      icon: FileText,
      value: kpis.totalDecisions.toLocaleString('fr-MA'),
      label: 'Décisions traitées',
      accent: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    },
    {
      icon: Percent,
      value: fmtPct(kpis.tauxApprobation),
      label: "Taux d'approbation",
      accent: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      icon: Wallet,
      value: fmtMontantCourt(kpis.montantOctroye),
      label: 'Montant octroyé',
      accent: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      icon: Clock,
      value: kpis.delaiMoyenSec.toLocaleString('fr-MA') + ' s',
      label: 'Délai moyen',
      accent: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400',
    },
    {
      icon: Gauge,
      value: kpis.scoreMoyen + '/100',
      label: 'Score moyen',
      accent: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400',
    },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* 1) En-tête */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold tracking-tight">Tableau analytique</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Indicateurs et tendances des décisions
        </p>
      </motion.div>

      {/* 2) Cartes KPI (stagger) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {kpiItems.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: 'easeOut' }}
          >
            <KpiCard {...k} />
          </motion.div>
        ))}
      </div>

      {/* 3 + 4) Barres par mois + Donut par type */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <Section
          icon={TrendingUp}
          title="Décisions par mois"
          subtitle="Approuvées vs refusées sur 6 mois"
          delay={0.45}
          className="lg:col-span-3"
        >
          <BarGroup data={parMois} />
          <div className="flex items-center gap-5 mt-4 pl-1">
            <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-400" />
              Approuvées
            </span>
            <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="w-3 h-3 rounded-sm bg-rose-500 dark:bg-rose-400" />
              Refusées
            </span>
          </div>
        </Section>

        <Section
          icon={Layers}
          title="Répartition par type"
          subtitle="Part de chaque produit"
          delay={0.55}
          className="lg:col-span-2"
        >
          <Donut data={parType} />
        </Section>
      </div>

      {/* 5 + 6) Histogramme scores + Motifs de refus */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Section
          icon={BarChart3}
          title="Distribution des scores"
          subtitle="Nombre de décisions par tranche de score"
          delay={0.65}
          className="lg:col-span-3"
        >
          <ScoreHistogram data={scoreDistribution} />
        </Section>

        <Section
          icon={ListChecks}
          title="Top motifs de refus"
          subtitle="Causes les plus fréquentes"
          delay={0.75}
          className="lg:col-span-2"
        >
          <RefusBars data={motifsRefus} />
        </Section>
      </div>
    </div>
  )
}

export default Analytics
