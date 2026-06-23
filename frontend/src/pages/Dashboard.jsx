import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Eye, EyeOff,
  Lock, Loader2, X, Wallet, TrendingUp, Layers,
} from 'lucide-react'
import { useClient, useTransactions } from '../hooks/useClient'
import { authService, errorMessage } from '../services/authService'
import { useI18n } from '../i18n/context'

const MASK = '••••••'

function Dashboard() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const clientId = localStorage.getItem('clientId') || 'CL-2024-0042'
  const { data: client, isLoading } = useClient(clientId)
  const { data: transactions } = useTransactions(clientId)

  // Œil sur le solde : masqué par défaut, déverrouillé par le mot de passe (une fois par session).
  const [visible, setVisible] = useState(() => sessionStorage.getItem('balanceUnlocked') === '1')
  const [modalOpen, setModalOpen] = useState(false)

  if (isLoading || !client) return <div className="p-8 text-slate-400">{t('common.loading')}</div>

  const comptes = client.bancaire?.comptes || []
  const soldeTotal = comptes.reduce((s, c) => s + (c.solde || 0), 0)
  const revenu = client.professionnel?.revenuMensuel
  const segment = client.bancaire?.segment

  const money = (n) => (n ?? 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 }) + ' MAD'
  const show = (n) => (visible ? money(n) : MASK)

  const onEye = () => {
    if (visible) { setVisible(false); return }
    if (sessionStorage.getItem('balanceUnlocked') === '1') { setVisible(true); return }
    setModalOpen(true)
  }

  const onUnlocked = () => {
    sessionStorage.setItem('balanceUnlocked', '1')
    setVisible(true)
    setModalOpen(false)
  }

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto min-h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold tracking-tight text-slate-900 dark:text-white">
          {t('dashboard.hello', { name: client.personnel?.prenom || '' })}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">{t('dashboard.overview')}</p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[minmax(120px,auto)] gap-4 md:gap-5">

        {/* Big Balance Card */}
        <div className="md:col-span-8 md:row-span-2 relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 p-6 md:p-8 shadow-sm flex flex-col justify-between group">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
          <div className="absolute -top-32 -end-32 w-96 h-96 bg-primary-400/20 blur-3xl rounded-full pointer-events-none transition-all duration-700 group-hover:bg-primary-300/20 group-hover:scale-110"></div>

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-primary-100 text-sm font-medium tracking-wide uppercase mb-3">{t('dashboard.totalBalance')}</p>
              <p className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-white drop-shadow-sm truncate tabular-nums">
                {visible ? money(soldeTotal) : <span className="tracking-[0.2em] opacity-80">{MASK} MAD</span>}
              </p>
            </div>
            <button
              onClick={onEye}
              aria-label={visible ? t('dashboard.hideBalance') : t('dashboard.showBalance')}
              title={visible ? t('dashboard.hideBalance') : t('dashboard.showBalance')}
              className="shrink-0 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all ring-1 ring-white/10"
            >
              {visible ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Under-stats in Big Card */}
          <div className="relative z-10 grid grid-cols-3 gap-4 mt-12 pt-6 border-t border-primary-400/20">
            <HeroStat icon={TrendingUp} label={t('dashboard.monthlyIncome')} value={visible ? money(revenu) : MASK} />
            <HeroStat icon={Layers} label={t('dashboard.accountsCount')} value={comptes.length} />
            <HeroStat icon={Wallet} label={t('dashboard.segment')} value={segment || '—'} />
          </div>
        </div>

        {/* Quick Actions / Assistant - Top Right Square */}
        <button onClick={() => navigate('/assistant')} className="md:col-span-4 md:row-span-1 rounded-[2rem] bg-accent-500 hover:bg-accent-600 transition-colors p-6 flex flex-col items-start justify-between shadow-sm relative overflow-hidden group">
           <div className="absolute -bottom-8 -end-8 w-32 h-32 bg-accent-400/40 blur-2xl rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-150"></div>
           <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm mb-4 ring-1 ring-white/20 shadow-inner">
             <Mic size={24} />
           </div>
           <div className="text-start relative z-10">
             <p className="text-white font-serif font-bold text-xl mb-1">{t('dashboard.talkToAssistant')}</p>
             <p className="text-accent-100 text-xs font-medium uppercase tracking-wide">IA Vocale</p>
           </div>
        </button>

        {/* Transfer/Operations - Bottom Right Square */}
        <button onClick={() => navigate('/operations')} className="md:col-span-4 md:row-span-1 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 hover:border-primary-200 hover:shadow-md transition-all p-6 flex flex-col items-start justify-between relative group">
           <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary-600 dark:text-primary-400 mb-4 ring-1 ring-slate-200 dark:ring-slate-700 transition-colors group-hover:bg-primary-50 group-hover:ring-primary-200">
             <ArrowLeftRight size={24} />
           </div>
           <div className="text-start">
             <p className="text-slate-900 dark:text-white font-serif font-bold text-xl mb-1">{t('dashboard.creditOrTransfer')}</p>
             <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Opérations</p>
           </div>
        </button>

        {/* Accounts List (Spans wide) */}
        <div className="md:col-span-7 md:row-span-2 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-6 flex flex-col shadow-sm">
           <div className="flex items-center justify-between mb-5">
             <h2 className="font-serif font-bold text-lg text-slate-900 dark:text-white">Mes Comptes</h2>
             {!visible && <span className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5 uppercase tracking-wider font-semibold bg-slate-50 dark:bg-slate-800/50">{t('dashboard.hidden')}</span>}
           </div>
           <div className="flex flex-col gap-3 flex-1 justify-center">
            {comptes.map((c) => (
              <div key={c.rib} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-slate-900 dark:text-white font-semibold text-sm capitalize truncate">{c.intitule || c.type}</p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs font-mono mt-1 truncate">{c.rib}</p>
                </div>
                <div className="text-end shrink-0 pl-4">
                  <p className="font-bold text-slate-900 dark:text-white tabular-nums">{show(c.solde)}</p>
                </div>
              </div>
            ))}
           </div>
        </div>

        {/* Recent Transactions List (Spans wide) */}
        <div className="md:col-span-5 md:row-span-2 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-sm overflow-hidden flex flex-col">
          <h2 className="font-serif font-bold text-lg text-slate-900 dark:text-white mb-5">{t('dashboard.recentOps')}</h2>
          <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4">
            {transactions?.length ? (
              transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex justify-between items-center gap-3 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${tx.montant > 0 ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 group-hover:bg-primary-100' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 group-hover:bg-slate-100'}`}>
                      {tx.montant > 0 ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate leading-tight">{tx.libelle}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{tx.date}</p>
                    </div>
                  </div>
                  <p className={`font-bold text-sm tabular-nums shrink-0 ${tx.montant > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {tx.montant > 0 ? '+' : ''}{money(tx.montant)}
                  </p>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">{t('dashboard.noTransactions')}</div>
            )}
          </div>
        </div>

      </div>

      {modalOpen && <RevealModal onClose={() => setModalOpen(false)} onSuccess={onUnlocked} t={t} />}
    </div>
  )
}

function HeroStat({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 border-l-2 border-primary-400/30 pl-3">
      <p className="flex items-center gap-1.5 text-primary-200/80 text-[10px] font-bold uppercase tracking-wider mb-1.5"><Icon size={12} /> {label}</p>
      <p className="text-sm font-medium text-white truncate tabular-nums">{value}</p>
    </div>
  )
}

// Modale de ré-authentification : le mot de passe de connexion déverrouille les soldes.
function RevealModal({ onClose, onSuccess, t }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await authService.verifyPassword(password)
      onSuccess()
    } catch (err) {
      setError(errorMessage(err, t('reveal.wrong')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-2xl bg-primary-100 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <Lock size={20} />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"><X size={18} /></button>
        </div>
        <h3 className="text-lg font-bold tracking-tight">{t('reveal.title')}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">{t('reveal.subtitle')}</p>

        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <Lock size={18} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('reveal.codeLabel')}
              className="w-full ps-11 pe-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-500/20 outline-none transition"
            />
          </div>
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
            {t('reveal.reveal')}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Dashboard
