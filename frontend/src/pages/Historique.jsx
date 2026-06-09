import { useDecisions } from '../hooks/useClient'
import { Check, X } from 'lucide-react'

const statusConfig = {
  approuve: { label: 'Approuvé', cls: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400', icon: Check },
  execute:  { label: 'Exécuté',  cls: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400', icon: Check },
  refuse:   { label: 'Refusé',   cls: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400', icon: X },
}

function Historique() {
  const clientId = localStorage.getItem('clientId') || 'CL-2024-0042'
  const { data: decisions, isLoading } = useDecisions(clientId)

  if (isLoading) return <div className="p-8 text-slate-400">Chargement…</div>

  const fmt = (n) => n.toLocaleString('fr-MA') + ' MAD'

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Historique des décisions</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Toutes les opérations traitées par l'assistant IA</p>
      </div>

      <div className="space-y-3">
        {decisions.map((d) => {
          const s = statusConfig[d.statut]
          const Icon = s.icon
          return (
            <div key={d.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${s.cls}`}>
                    <Icon size={13} /> {s.label}
                  </span>
                  <span className="font-semibold">{d.intent}</span>
                </div>
                <span className="font-bold text-sm">{fmt(d.montant)}</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{d.explication}</p>
              <p className="text-xs text-slate-400">{d.date} · Réf {d.id}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Historique