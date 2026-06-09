import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Login() {
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()
    localStorage.setItem('token', 'demo-token')
    localStorage.setItem('clientId', code || 'CL-2024-0042')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950">
      <div className="hidden lg:flex lg:w-1/2 bg-emerald-600 flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white text-emerald-600 flex items-center justify-center font-bold text-xl">B</div>
          <span className="text-xl font-bold tracking-tight">BankIA</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4 tracking-tight">La banque qui vous écoute, vraiment.</h1>
          <p className="text-emerald-200 text-lg leading-relaxed">Crédits et virements gérés par intelligence artificielle, en temps réel et par la voix.</p>
        </div>
        <p className="text-emerald-300 text-sm">PFE 2025–2026 · Démonstration</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Bienvenue</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Connectez-vous à votre espace client</p>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Code client</label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="CL-2024-0042"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500/20 outline-none transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Mot de passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500/20 outline-none transition" />
            </div>
            <button type="submit" className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition shadow-sm">Se connecter</button>
          </form>
          <p className="text-center text-slate-400 text-sm mt-8">Démo PFE — données simulées</p>
        </div>
      </div>
    </div>
  )
}

export default Login