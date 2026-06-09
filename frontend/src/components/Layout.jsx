import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Home, Mic, User, Lightbulb, BarChart3, SlidersHorizontal, Network, FileText, History, Sun, Moon, LogOut } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

const clientNav = [
  { label: 'Accueil', path: '/dashboard', icon: Home },
  { label: 'Assistant vocal', path: '/assistant', icon: Mic },
  { label: 'Profil', path: '/profil', icon: User },
]
const demoNav = [
  { label: 'Explicabilité', path: '/xai', icon: Lightbulb },
  { label: 'Analytique', path: '/analytics', icon: BarChart3 },
  { label: 'Simulateur', path: '/simulateur', icon: SlidersHorizontal },
  { label: 'Multi-agents', path: '/supervision', icon: Network },
  { label: 'Base RAG', path: '/documents', icon: FileText },
  { label: 'Audit', path: '/historique', icon: History },
]

function NavGroup({ title, items, pathname, navigate }) {
  return (
    <div className="mb-6">
      <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</p>
      <div className="space-y-1">
        {items.map(({ label, path, icon: Icon }) => {
          const active = pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
                active
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon size={18} /> {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Layout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { theme, toggle } = useTheme()

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <aside className="w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-5 overflow-y-auto">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">B</div>
          <span className="font-bold text-lg tracking-tight">BankIA</span>
        </div>
        <div className="flex-1">
          <NavGroup title="Espace client" items={clientNav} pathname={pathname} navigate={navigate} />
          <NavGroup title="Démonstration" items={demoNav} pathname={pathname} navigate={navigate} />
        </div>
        <div className="space-y-1 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button onClick={toggle} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          </button>
          <button
            onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('clientId'); navigate('/login') }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
