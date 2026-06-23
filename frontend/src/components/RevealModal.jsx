import { useState } from 'react'
import { Lock, Loader2, X, Eye, EyeOff } from 'lucide-react'
import { authService, errorMessage } from '../services/authService'

// Modale de ré-authentification (step-up) : le mot de passe de connexion déverrouille
// l'affichage des données sensibles (soldes, numéro de carte…) pour la session.
export default function RevealModal({
  onClose,
  onSuccess,
  title = 'Confirmer votre identité',
  subtitle = 'Saisissez votre mot de passe pour afficher les informations sensibles.',
}) {
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await authService.verifyPassword(password)
      sessionStorage.setItem('balanceUnlocked', '1')
      onSuccess()
    } catch (err) {
      setError(errorMessage(err, 'Mot de passe incorrect.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <Lock size={22} />
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition">
            <X size={18} />
          </button>
        </div>
        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">{subtitle}</p>
        <form onSubmit={submit}>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full ps-4 pe-11 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-500/20 outline-none transition"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              title={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition p-0.5"
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && <p className="text-sm text-rose-600 dark:text-rose-400 mt-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            Afficher
          </button>
        </form>
      </div>
    </div>
  )
}
