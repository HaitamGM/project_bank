import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { FileText, Percent, Wallet, Clock, Gauge, TrendingUp, Layers, PieChart as PieIcon } from 'lucide-react'
import { useAnalytics } from '../hooks/useClient'
import { ChartTooltip } from '../components/charts'
import { CHART, AXIS_PROPS } from '../lib/chartTheme'
import { fmt } from '../lib/format'

const MONTHS = { '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr', '05': 'Mai', '06': 'Juin', '07': 'Juil', '08': 'Août', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc' }
const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm'
const fmtPct = (x) => Math.round((x ?? 0) * 100) + ' %'
const fmtMillions = (n) => (n / 1_000_000).toLocaleString('fr-MA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' M'

function KpiCard({ icon: Icon, value, label, accent }) {
  return (
    <div className={`${card} p-5`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${accent}`}><Icon size={20} /></div>
      <p className="text-2xl font-bold tracking-tight tabular-nums leading-none">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{label}</p>
    </div>
  )
}

function Section({ icon: Icon, title, subtitle, className = '', children }) {
  return (
    <div className={`${card} p-6 ${className}`}>
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center"><Icon size={16} /></div>
        <div>
          <h2 className="font-semibold leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

export default function Analytics() {
  const { data, isLoading } = useAnalytics()

  const view = useMemo(() => {
    if (!data) return null
    const evolution = (data.evolutionMensuelle || []).map((e) => ({
      mois: MONTHS[(e.mois || '').split('-')[1]] || e.mois,
      approuvées: e.approuves, refusées: e.refuses, total: e.total,
    }))
    const rt = data.repartitionParType || {}
    const typeData = [
      { name: 'Crédits', value: rt.credit || 0, color: CHART.emerald },
      { name: 'Virements', value: rt.virement || 0, color: CHART.sky },
    ]
    const scores = Object.entries(data.distributionScoresCredit || {}).map(([bucket, count]) => ({ bucket, count }))
    const parClient = [...(data.analyseParClient || [])].sort((a, b) => b.montantAccorde - a.montantAccorde)
    return { evolution, typeData, scores, parClient }
  }, [data])

  if (isLoading || !view) return <div className="p-8 text-slate-400">Chargement…</div>

  const kpis = [
    { icon: FileText, value: fmt(data.totalDecisions), label: 'Décisions traitées', accent: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
    { icon: Percent, value: fmtPct(data.tauxApprobation), label: "Taux d'approbation", accent: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { icon: Wallet, value: fmtMillions(data.montantTotalAccorde) + ' MAD', label: 'Montant octroyé', accent: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { icon: Clock, value: (data.tempsDecisionMoyenMs / 1000).toLocaleString('fr-MA', { maximumFractionDigits: 1 }) + ' s', label: 'Délai moyen', accent: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400' },
    { icon: Layers, value: fmt(data.totalCredits), label: 'Crédits analysés', accent: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400' },
  ]

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tableau analytique</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Indicateurs des décisions de l'IA · {data.totalDecisions} décisions réelles</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.06 }}>
            <KpiCard {...k} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <Section icon={TrendingUp} title="Décisions par mois" subtitle="Approuvées vs refusées sur 12 mois" className="lg:col-span-3">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={view.evolution} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART.emerald} stopOpacity={0.35} /><stop offset="100%" stopColor={CHART.emerald} stopOpacity={0} /></linearGradient>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART.rose} stopOpacity={0.3} /><stop offset="100%" stopColor={CHART.rose} stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="mois" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} allowDecimals={false} width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="approuvées" stroke={CHART.emerald} strokeWidth={2.5} fill="url(#gA)" />
              <Area type="monotone" dataKey="refusées" stroke={CHART.rose} strokeWidth={2.5} fill="url(#gR)" />
            </AreaChart>
          </ResponsiveContainer>
        </Section>

        <Section icon={PieIcon} title="Répartition par type" subtitle="Crédits vs virements" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={view.typeData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3} stroke="none">
                {view.typeData.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <Section icon={Gauge} title="Distribution des scores crédit" subtitle="Nombre de crédits par tranche (seuil 60)" className="lg:col-span-3">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={view.scores} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="bucket" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} allowDecimals={false} width={28} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.1)' }} />
              <Bar dataKey="count" name="Crédits" radius={[6, 6, 0, 0]}>
                {view.scores.map((d) => (
                  <Cell key={d.bucket} fill={d.bucket === '60-80' || d.bucket === '80-100' ? CHART.emerald : CHART.emeraldSoft} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section icon={Layers} title="Statut des décisions" subtitle="Part approuvé / exécuté / refusé" className="lg:col-span-2">
          <StatutBars statut={data.repartitionParStatut || {}} total={data.totalDecisions} />
        </Section>
      </div>

      <Section icon={FileText} title="Analyse par client" subtitle="Toutes les décisions, par client (le vôtre surligné)">
        <ClientTable rows={view.parClient} current={data.clientCourant} />
      </Section>
    </div>
  )
}

function StatutBars({ statut, total }) {
  const items = [
    { key: 'approuve', label: 'Approuvé', color: CHART.emerald, value: statut.approuve || 0 },
    { key: 'execute', label: 'Exécuté', color: CHART.sky, value: statut.execute || 0 },
    { key: 'refuse', label: 'Refusé', color: CHART.rose, value: statut.refuse || 0 },
  ]
  return (
    <div className="space-y-4 pt-2">
      {items.map((it, i) => (
        <div key={it.key}>
          <div className="flex items-center justify-between mb-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">{it.label}</span>
            <span className="tabular-nums text-slate-500 dark:text-slate-400">{it.value} · {Math.round((it.value / (total || 1)) * 100)} %</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: it.color }}
              initial={{ width: 0 }} animate={{ width: `${(it.value / (total || 1)) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.1 + i * 0.1, ease: 'easeOut' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ClientTable({ rows, current }) {
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm min-w-160">
        <thead>
          <tr className="text-start text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
            <th className="text-start font-semibold py-2.5 px-2">Client</th>
            <th className="text-start font-semibold py-2.5 px-2">Segment</th>
            <th className="text-end font-semibold py-2.5 px-2">Décisions</th>
            <th className="text-end font-semibold py-2.5 px-2">Approbation</th>
            <th className="text-end font-semibold py-2.5 px-2">Score moyen</th>
            <th className="text-end font-semibold py-2.5 px-2">Montant octroyé</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const me = r.clientId === current
            return (
              <tr key={r.clientId} className={`border-b border-slate-100 dark:border-slate-800/60 ${me ? 'bg-emerald-50/60 dark:bg-emerald-500/10' : ''}`}>
                <td className="py-2.5 px-2 font-medium">
                  {r.clientNom}{me && <span className="ms-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40 rounded-full px-1.5 py-0.5">vous</span>}
                </td>
                <td className="py-2.5 px-2 text-slate-500 dark:text-slate-400">{r.segment}</td>
                <td className="py-2.5 px-2 text-end tabular-nums">{r.totalDecisions}</td>
                <td className="py-2.5 px-2 text-end tabular-nums">{Math.round(r.tauxApprobation * 100)} %</td>
                <td className="py-2.5 px-2 text-end tabular-nums">{r.scoreMoyen ?? '—'}</td>
                <td className="py-2.5 px-2 text-end tabular-nums font-medium">{fmt(r.montantAccorde)} MAD</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
