import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, Mail, Lock, KeyRound, ArrowLeft, Loader2, Eye, EyeOff,
  Mic, Network, Sparkles,
} from 'lucide-react'
import { authService, errorMessage } from '../services/authService'
import { useI18n } from '../i18n/context'
import LanguageSwitcher from '../components/LanguageSwitcher'

const DEMO_ACCOUNTS = [
  { email: 'y.elidrissi@email.ma', name: 'Yasmina El Idrissi', segment: 'Premium', initials: 'YE' },
  { email: 's.amrani@email.ma', name: 'Sara Amrani', segment: 'Patrimoine', initials: 'SA' },
  { email: 'k.benali@email.ma', name: 'Karim Benali', segment: 'Standard · BAM', initials: 'KB' },
]
const DEMO_PASSWORD = 'BankIA@2026'
const FEATURES = [
  { icon: Mic, t: 'login.f1Title', d: 'login.f1Desc' },
  { icon: Network, t: 'login.f2Title', d: 'login.f2Desc' },
  { icon: ShieldCheck, t: 'login.f3Title', d: 'login.f3Desc' },
]

const Brand = ({ size = 'sm' }) => (
  <div className="flex items-center gap-2.5">
    <div className={`${size === 'lg' ? 'w-11 h-11 text-xl rounded-2xl' : 'w-8 h-8 text-base rounded-xl'} bg-emerald-600 lg:bg-white lg:text-emerald-600 text-white flex items-center justify-center font-bold`}>B</div>
    <span className={`${size === 'lg' ? 'text-xl' : 'text-lg'} font-bold tracking-tight`}>BankIA</span>
  </div>
)

function Login() {
  const navigate = useNavigate()
  const { t, dir } = useI18n()
  const [step, setStep] = useState('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [otp, setOtp] = useState('')
  const [challengeId, setChallengeId] = useState(null)
  const [devOtp, setDevOtp] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const submitCredentials = async (e) => {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      const data = await authService.login(email.trim(), password)
      setChallengeId(data.challengeId)
      setDevOtp(data.devOtp || null)
      setOtp(data.devOtp || '')
      setStep('otp')
    } catch (err) {
      setError(errorMessage(err, t('login.errLogin')))
    } finally { setLoading(false) }
  }

  const submitOtp = async (e) => {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      await authService.verifyOtp(challengeId, otp.trim())
      navigate('/dashboard')
    } catch (err) {
      setError(errorMessage(err, t('login.errOtp')))
    } finally { setLoading(false) }
  }

  const backToCredentials = () => {
    setStep('credentials'); setOtp(''); setChallengeId(null); setDevOtp(null); setError(null)
  }

  const field = 'w-full ps-11 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500/20 outline-none transition'

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950">
      {/* Panneau gauche — vitrine */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 flex-col justify-between p-12 text-white">
        <div className="pointer-events-none absolute -top-24 -end-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -start-16 w-96 h-96 rounded-full bg-teal-300/10 blur-3xl" />
        <div className="relative"><Brand size="lg" /></div>

        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight mb-4 tracking-tight">{t('login.heroTitle')}</h1>
          <p className="text-emerald-100 text-lg leading-relaxed max-w-md">{t('login.heroSubtitle')}</p>

          <div className="mt-10 space-y-5">
            {FEATURES.map((f) => (
              <div key={f.t} className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><f.icon size={19} /></div>
                <div>
                  <p className="font-semibold">{t(f.t)}</p>
                  <p className="text-sm text-emerald-100/90">{t(f.d)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between text-sm text-emerald-200">
          <span>{t('login.demoTag')}</span>
          <span className="flex items-center gap-1.5"><ShieldCheck size={15} /> {t('login.secure2fa')}</span>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex flex-col p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div className="lg:hidden"><Brand /></div>
          <div className="ms-auto"><LanguageSwitcher /></div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            {step === 'credentials' ? (
              <>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">{t('login.welcome')}</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8">{t('login.subtitle')}</p>

                <form onSubmit={submitCredentials} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('login.email')}</label>
                    <div className="relative">
                      <Mail size={18} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@email.ma" className={`${field} pe-4`} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('login.password')}</label>
                    <div className="relative">
                      <Lock size={18} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type={showPwd ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={`${field} pe-11`} />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        aria-label={showPwd ? t('login.hidePassword') : t('login.showPassword')}
                        title={showPwd ? t('login.hidePassword') : t('login.showPassword')}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition p-0.5"
                      >
                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                  <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                    {t('login.continue')}
                  </button>
                </form>

                <div className="mt-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
                  <p className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2.5">
                    <span className="flex items-center gap-1.5"><Sparkles size={13} className="text-emerald-500" /> {t('login.demoAccounts')}</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">{DEMO_PASSWORD}</span>
                  </p>
                  <div className="space-y-1">
                    {DEMO_ACCOUNTS.map((a) => (
                      <button
                        key={a.email}
                        onClick={() => { setEmail(a.email); setPassword(DEMO_PASSWORD) }}
                        className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition text-start group"
                      >
                        <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">{a.initials}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{a.name}</span>
                          <span className="block text-[11px] font-mono text-slate-400 truncate">{a.email}</span>
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 group-hover:text-emerald-500 transition shrink-0">{a.segment}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 ps-2">{t('login.demoHint')}</p>
                </div>

                <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                  <Lock size={12} /> {t('login.encrypted')}
                </p>
              </>
            ) : (
              <>
                <button onClick={backToCredentials} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 transition">
                  <ArrowLeft size={16} className={dir === 'rtl' ? 'rotate-180' : ''} /> {t('login.back')}
                </button>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                  <KeyRound size={22} />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">{t('login.otpTitle')}</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6">{t('login.otpSubtitle', { email })}</p>

                <form onSubmit={submitOtp} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('login.otpLabel')}</label>
                    <input
                      inputMode="numeric" maxLength={6} required value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center text-2xl tracking-[0.5em] font-mono focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500/20 outline-none transition"
                    />
                  </div>

                  {devOtp && <p className="text-xs text-center text-slate-400">{t('login.demoCode', { otp: devOtp })}</p>}
                  {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                  <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                    {t('login.signIn')}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
