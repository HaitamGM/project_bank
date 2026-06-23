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
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.hello', { name: client.personnel?.prenom || '' })}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t('dashboard.overview')}</p>
      </div>

      {/* Carte solde total avec œil */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl p-6 sm:p-7 text-white mb-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-emerald-100 text-sm font-medium mb-2">{t('dashboard.totalBalance')}</p>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums break-words">
              {visible ? money(soldeTotal) : <span className="tracking-[0.2em]">{MASK} MAD</span>}
            </p>
          </div>
          <button
            onClick={onEye}
            aria-label={visible ? t('dashboard.hideBalance') : t('dashboard.showBalance')}
            title={visible ? t('dashboard.hideBalance') : t('dashboard.showBalance')}
            className="shrink-0 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition"
          >
            {visible ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Sous-statistiques (masquées avec le solde) */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/15">
          <HeroStat icon={TrendingUp} label={t('dashboard.monthlyIncome')} value={visible ? money(revenu) : MASK} />
          <HeroStat icon={Layers} label={t('dashboard.accountsCount')} value={comptes.length} />
          <HeroStat icon={Wallet} label={t('dashboard.segment')} value={segment || '—'} />
        </div>
      </div>

      {/* Comptes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {comptes.map((c) => (
          <div key={c.rib} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-slate-500 dark:text-slate-400 text-sm capitalize">{c.intitule || c.type}</p>
              {!visible && <span className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5">{t('dashboard.hidden')}</span>}
            </div>
            <p className="text-xl font-bold mt-1 tabular-nums">{show(c.solde)}</p>
            <p className="text-slate-400 dark:text-slate-600 text-xs mt-2 font-mono truncate">{c.rib}</p>
          </div>
        ))}
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <button onClick={() => navigate('/assistant')} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl p-5 font-semibold transition shadow-sm">
          <Mic size={20} /> {t('dashboard.talkToAssistant')}
        </button>
        <button onClick={() => navigate('/operations')} className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl p-5 font-semibold transition shadow-sm">
          <ArrowLeftRight size={20} /> {t('dashboard.creditOrTransfer')}
        </button>
      </div>

      {/* Dernières opérations */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="font-semibold mb-4">{t('dashboard.recentOps')}</h2>
        {transactions?.length ? (
          <div className="space-y-4">
            {transactions.slice(0, 6).map((tx) => (
              <div key={tx.id} className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tx.montant > 0 ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                    {tx.montant > 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{tx.libelle}</p>
                    <p className="text-xs text-slate-400">{tx.date}</p>
                  </div>
                </div>
                <p className={`font-semibold text-sm tabular-nums shrink-0 ${tx.montant > 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {tx.montant > 0 ? '+' : ''}{money(tx.montant)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">{t('dashboard.noTransactions')}</p>
        )}
      </div>

      {modalOpen && <RevealModal onClose={() => setModalOpen(false)} onSuccess={onUnlocked} t={t} />}
    </div>
  )
}

function HeroStat({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-emerald-100 text-[11px] font-medium mb-1"><Icon size={12} /> {label}</p>
      <p className="text-sm font-bold truncate tabular-nums">{value}</p>
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
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
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
              className="w-full ps-11 pe-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500/20 outline-none transition"
            />
          </div>
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
            {t('reveal.reveal')}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Dashboard
