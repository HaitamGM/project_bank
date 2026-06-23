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
    <div className={`${size === 'lg' ? 'w-11 h-11 text-xl rounded-2xl' : 'w-8 h-8 text-base rounded-xl'} bg-primary-600 lg:bg-white lg:text-primary-600 text-white flex items-center justify-center font-bold`}>B</div>
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

  const field = 'w-full ps-11 py-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 dark:focus:ring-primary-500/20 outline-none transition-all duration-300'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      {/* Decorative ambient background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-400/10 dark:bg-primary-500/5 rounded-full blur-3xl mix-blend-multiply pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-400/10 dark:bg-accent-500/5 rounded-full blur-3xl mix-blend-multiply pointer-events-none"></div>

      <div className="w-full max-w-[1000px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col lg:flex-row overflow-hidden relative z-10">

        {/* Left Panel — Branding & Showcase */}
        <div className="hidden lg:flex w-[45%] relative bg-gradient-to-br from-primary-900 to-primary-950 p-12 flex-col justify-between text-white border-r border-slate-200/10 dark:border-slate-800/50">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-accent-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center font-serif font-bold text-2xl ring-1 ring-white/20 shadow-inner">
               B
             </div>
             <span className="font-serif font-bold text-2xl tracking-tight">BankIA</span>
          </div>

          <div className="relative z-10 my-auto py-12">
            <h1 className="text-4xl font-serif font-bold leading-tight mb-5 tracking-tight text-white">{t('login.heroTitle')}</h1>
            <p className="text-primary-100 text-lg leading-relaxed max-w-md font-medium">{t('login.heroSubtitle')}</p>

            <div className="mt-12 space-y-6">
              {FEATURES.map((f) => (
                <div key={f.t} className="flex items-start gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-md flex items-center justify-center shrink-0 ring-1 ring-white/10 group-hover:bg-white/10 group-hover:scale-105 transition-all duration-300">
                    <f.icon size={20} className="text-accent-300 group-hover:text-accent-200 transition-colors" />
                  </div>
                  <div className="pt-1">
                    <p className="font-bold tracking-wide text-white mb-0.5">{t(f.t)}</p>
                    <p className="text-sm text-primary-200 leading-snug">{t(f.d)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-sm text-primary-200/80 font-medium">
            <span className="uppercase tracking-widest text-[10px]">{t('login.demoTag')}</span>
            <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm"><ShieldCheck size={14} className="text-primary-400" /> {t('login.secure2fa')}</span>
          </div>
        </div>

        {/* Right Panel — Form */}
        <div className="flex-1 flex flex-col p-8 sm:p-12 relative">
          <div className="flex items-center justify-between mb-12">
            <div className="lg:hidden flex items-center gap-2.5">
               <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-900 to-primary-700 text-white flex items-center justify-center font-serif font-bold text-xl shadow-sm ring-1 ring-primary-900/10">B</div>
               <span className="font-serif font-bold text-xl tracking-tight text-slate-900 dark:text-white">BankIA</span>
            </div>
            <div className="ms-auto"><LanguageSwitcher /></div>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
            {step === 'credentials' ? (
              <>
                <h2 className="text-3xl font-serif font-bold tracking-tight text-slate-900 dark:text-white mb-2.5">{t('login.welcome')}</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-10 font-medium">{t('login.subtitle')}</p>

                <form onSubmit={submitCredentials} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ms-1">{t('login.email')}</label>
                    <div className="relative group">
                      <Mail size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@email.ma" className={`${field} pe-4`} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ms-1">{t('login.password')}</label>
                    <div className="relative group">
                      <Lock size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                      <input type={showPwd ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={`${field} pe-11`} />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        aria-label={showPwd ? t('login.hidePassword') : t('login.showPassword')}
                        title={showPwd ? t('login.hidePassword') : t('login.showPassword')}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition p-1 rounded-md"
                      >
                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {error && <p className="text-sm text-rose-600 dark:text-rose-400 font-medium px-1">{error}</p>}

                  <button type="submit" disabled={loading} className="w-full mt-2 py-3.5 rounded-2xl bg-primary-600 text-white font-semibold hover:bg-primary-700 focus:ring-4 focus:ring-primary-500/20 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:bg-primary-600">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                    {t('login.continue')}
                  </button>
                </form>

                <div className="mt-10 mb-2 relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
                  <div className="relative flex justify-center"><span className="px-3 bg-white dark:bg-slate-900 text-xs font-bold uppercase tracking-widest text-slate-400">Demo Accounts</span></div>
                </div>

                <div className="space-y-2 mt-6">
                  {DEMO_ACCOUNTS.map((a) => (
                    <button
                      key={a.email}
                      onClick={() => { setEmail(a.email); setPassword(DEMO_PASSWORD) }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-2xl border border-transparent hover:border-primary-100 dark:hover:border-primary-900/50 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 transition-all text-start group"
                    >
                      <span className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 group-hover:text-primary-700 dark:group-hover:text-primary-300 flex items-center justify-center text-xs font-bold shrink-0 transition-colors">{a.initials}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors truncate">{a.name}</span>
                        <span className="block text-[11px] font-mono text-slate-400 truncate">{a.email}</span>
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-accent-500 transition-colors shrink-0 px-2 py-1 bg-slate-100 dark:bg-slate-800 group-hover:bg-accent-50 dark:group-hover:bg-accent-500/10 rounded-lg">{a.segment}</span>
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-center text-slate-400 mt-6 flex items-center justify-center gap-1.5">
                  <Lock size={12} className="opacity-70" /> {t('login.encrypted')}
                </p>
              </>
            ) : (
              <>
                <button onClick={backToCredentials} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 mb-8 transition-colors w-fit group">
                  <ArrowLeft size={16} className={`transition-transform group-hover:-translate-x-1 ${dir === 'rtl' ? 'rotate-180 group-hover:translate-x-1' : ''}`} /> {t('login.back')}
                </button>

                <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-6 shadow-sm">
                  <KeyRound size={24} />
                </div>
                <h2 className="text-3xl font-serif font-bold tracking-tight text-slate-900 dark:text-white mb-2.5">{t('login.otpTitle')}</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium leading-relaxed">{t('login.otpSubtitle', { email })}</p>

                <form onSubmit={submitOtp} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ms-1">{t('login.otpLabel')}</label>
                    <input
                      inputMode="numeric" maxLength={6} required value={otp} autoFocus
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000"
                      className="w-full px-4 py-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white text-center text-3xl tracking-[0.4em] font-mono focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 dark:focus:ring-primary-500/20 outline-none transition-all duration-300"
                    />
                  </div>

                  {devOtp && (
                     <div className="p-3 rounded-xl bg-accent-50 border border-accent-100 dark:bg-accent-500/10 dark:border-accent-500/20 text-center">
                        <p className="text-xs font-semibold text-accent-700 dark:text-accent-400">{t('login.demoCode', { otp: devOtp })}</p>
                     </div>
                  )}
                  {error && <p className="text-sm text-rose-600 dark:text-rose-400 font-medium px-1 text-center">{error}</p>}

                  <button type="submit" disabled={loading || otp.length < 6} className="w-full py-3.5 rounded-2xl bg-primary-600 text-white font-semibold hover:bg-primary-700 focus:ring-4 focus:ring-primary-500/20 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:bg-primary-600">
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
