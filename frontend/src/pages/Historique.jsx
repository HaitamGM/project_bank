import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Clock, CreditCard, Send, History as HistoryIcon, Mic } from 'lucide-react'
import { useDecisions } from '../hooks/useClient'
import { fmt } from '../lib/format'

const STATUS = {
  approuve: { label: 'Approuvé', cls: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', icon: Check },
  execute: { label: 'Exécuté', cls: 'bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400', icon: Check },
  refuse: { label: 'Refusé', cls: 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400', icon: X },
}
const FILTERS = [
  { key: 'tous', label: 'Tout' },
  { key: 'credit', label: 'Crédits' },
  { key: 'virement', label: 'Virements' },
]

export default function Historique() {
  const clientId = localStorage.getItem('clientId') || 'CL-2024-0042'
  const { data: decisions, isLoading } = useDecisions(clientId)
  const [filter, setFilter] = useState('tous')

  const filtered = useMemo(() => {
    if (!decisions) return []
    return filter === 'tous' ? decisions : decisions.filter((d) => d.type === filter)
  }, [decisions, filter])

  const stats = useMemo(() => {
    const list = decisions || []
    return {
      total: list.length,
      approuves: list.filter((d) => d.statut === 'approuve' || d.statut === 'execute').length,
      refuses: list.filter((d) => d.statut === 'refuse').length,
    }
  }, [decisions])

  if (isLoading || !decisions) return <div className="p-8 text-slate-400">Chargement…</div>

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1"><HistoryIcon size={18} /><span className="text-xs font-semibold uppercase tracking-wider">Audit</span></div>
        <h1 className="text-2xl font-bold tracking-tight">Historique des opérations</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Toutes vos demandes de crédit et virements traitées par l'IA</p>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat label="Opérations" value={stats.total} cls="text-slate-900 dark:text-slate-100" />
        <Stat label="Approuvées / exécutées" value={stats.approuves} cls="text-emerald-600 dark:text-emerald-400" />
        <Stat label="Refusées" value={stats.refuses} cls="text-rose-600 dark:text-rose-400" />
      </div>

      {/* Filtres */}
      <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 mb-5">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${filter === f.key ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>{f.label}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((d, i) => {
          const s = STATUS[d.statut] || { label: d.statut || '—', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300', icon: Clock }
          const Icon = s.icon
          const isCredit = d.type === 'credit'
          return (
            <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'}`}>
                    {isCredit ? <CreditCard size={17} /> : <Send size={17} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{d.intent}{d.beneficiaire ? ` → ${d.beneficiaire}` : ''}</p>
                    <span className={`inline-flex items-center gap-1.5 mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${s.cls}`}><Icon size={11} /> {s.label}</span>
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <p className="font-bold text-sm tabular-nums">{fmt(d.montant)} MAD</p>
                  {d.score != null && <p className="text-xs text-slate-400 tabular-nums">Score {d.score}/100</p>}
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">{d.explication}</p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{d.date}</span><span>·</span><span className="font-mono">Réf {d.id}</span>
                {d.canal === 'vocal' && <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><Mic size={11} /> vocal</span>}
              </div>
            </motion.div>
          )
        })}
        {filtered.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Aucune opération dans cette catégorie.</p>}
      </div>
    </div>
  )
}

function Stat({ label, value, cls }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
      <p className={`text-2xl font-bold tabular-nums ${cls}`}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}
