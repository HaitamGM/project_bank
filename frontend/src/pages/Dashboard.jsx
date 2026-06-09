import { useNavigate } from 'react-router-dom'
import { Mic, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { useClient, useTransactions } from '../hooks/useClient'

function Dashboard() {
  const navigate = useNavigate()
  const clientId = localStorage.getItem('clientId') || 'CL-2024-0042'
  const { data: client, isLoading } = useClient(clientId)
  const { data: transactions } = useTransactions(clientId)

  if (isLoading) return <div className="p-8 text-slate-400">Chargement…</div>

  const comptes = client.bancaire.comptes
  const soldeTotal = comptes.reduce((s, c) => s + c.solde, 0)
  const fmt = (n) => n.toLocaleString('fr-MA', { minimumFractionDigits: 2 }) + ' MAD'

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Bonjour, {client.personnel.prenom}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Voici un aperçu de vos comptes</p>
      </div>

      <div className="bg-emerald-600 rounded-3xl p-7 text-white mb-6 shadow-sm">
        <p className="text-emerald-200 text-sm font-medium mb-2">Solde total</p>
        <p className="text-4xl font-bold tracking-tight">{fmt(soldeTotal)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {comptes.map((c) => (
          <div key={c.rib} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400 text-sm capitalize">{c.type}</p>
            <p className="text-xl font-bold mt-1">{fmt(c.solde)}</p>
            <p className="text-slate-400 dark:text-slate-600 text-xs mt-2 font-mono">{c.rib}</p>
          </div>
        ))}
      </div>

      <button onClick={() => navigate('/assistant')} className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl p-5 font-semibold mb-6 transition shadow-sm">
        <Mic size={20} /> Parler à l'assistant vocal
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="font-semibold mb-4">Dernières opérations</h2>
        <div className="space-y-4">
          {transactions?.map((t) => (
            <div key={t.id} className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${t.montant > 0 ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                  {t.montant > 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div>
                  <p className="text-sm font-medium">{t.libelle}</p>
                  <p className="text-xs text-slate-400">{t.date}</p>
                </div>
              </div>
              <p className={`font-semibold text-sm ${t.montant > 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {t.montant > 0 ? '+' : ''}{fmt(t.montant)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard