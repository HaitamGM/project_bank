import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Home, Mic, ArrowLeftRight, User, Lightbulb, BarChart3, SlidersHorizontal,
  Network, FileText, History, Sun, Moon, LogOut, Menu, X, MessagesSquare,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../hooks/useTheme'
import { useI18n } from '../i18n/context'
import { authService } from '../services/authService'
import Avatar from './Avatar'
import LanguageSwitcher from './LanguageSwitcher'

const clientNav = [
  { key: 'home', path: '/dashboard', icon: Home },
  { key: 'assistant', path: '/assistant', icon: Mic },
  { key: 'conversations', path: '/conversations', icon: MessagesSquare },
  { key: 'operations', path: '/operations', icon: ArrowLeftRight },
  { key: 'profile', path: '/profil', icon: User },
]
const demoNav = [
  { key: 'xai', path: '/xai', icon: Lightbulb },
  { key: 'analytics', path: '/analytics', icon: BarChart3 },
  { key: 'simulator', path: '/simulateur', icon: SlidersHorizontal },
  { key: 'multiagents', path: '/supervision', icon: Network },
  { key: 'rag', path: '/documents', icon: FileText },
  { key: 'audit', path: '/historique', icon: History },
]

function NavGroup({ title, items, pathname, onNavigate, t }) {
  return (
    <div className="mb-6">
      <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</p>
      <div className="space-y-1">
        {items.map(({ key, path, icon: Icon }) => {
          const active = pathname === path
          return (
            <button
              key={path}
              onClick={() => onNavigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
                active
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon size={18} /> {t(`nav.${key}`)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Contenu commun à la sidebar desktop et au tiroir mobile.
function SidebarContent({ pathname, onNavigate, client, theme, toggle, logout, t }) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">B</div>
          <span className="font-bold text-lg tracking-tight">BankIA</span>
        </div>
        <LanguageSwitcher />
      </div>

      {client && (
        <button
          onClick={() => onNavigate('/profil')}
          className="flex items-center gap-3 mb-6 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition text-start"
        >
          <Avatar photo={client.photo} prenom={client.prenom} nom={client.nom} size={40} rounded="rounded-xl" />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{client.prenom} {client.nom}</p>
            <p className="text-xs text-slate-400 truncate">{client.segment} · {client.id}</p>
          </div>
        </button>
      )}

      <div className="flex-1">
        <NavGroup title={t('nav.clientSpace')} items={clientNav} pathname={pathname} onNavigate={onNavigate} t={t} />
        <NavGroup title={t('nav.demo')} items={demoNav} pathname={pathname} onNavigate={onNavigate} t={t} />
      </div>

      <div className="space-y-1 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button onClick={toggle} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
        </button>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <LogOut size={18} /> {t('common.logout')}
        </button>
      </div>
    </>
  )
}

function Layout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { theme, toggle } = useTheme()
  const { t, dir } = useI18n()
  const client = authService.getStoredClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  const logout = () => { authService.logout(); navigate('/login') }
  const go = (path) => { navigate(path); setMobileOpen(false) }

  const sidebarProps = { pathname, onNavigate: go, client, theme, toggle, logout, t }
  const offX = dir === 'rtl' ? '100%' : '-100%'

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-white dark:bg-slate-900 border-e border-slate-200 dark:border-slate-800 flex-col p-5 overflow-y-auto">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Barre supérieure mobile */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => setMobileOpen(true)} aria-label={t('common.menu')} className="p-2 -ms-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">B</div>
          <span className="font-bold tracking-tight">BankIA</span>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <button onClick={toggle} aria-label="theme" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Tiroir mobile (off-canvas) */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="lg:hidden fixed inset-y-0 start-0 z-50 w-72 max-w-[80%] bg-white dark:bg-slate-900 border-e border-slate-200 dark:border-slate-800 flex flex-col p-5 overflow-y-auto"
              initial={{ x: offX }} animate={{ x: 0 }} exit={{ x: offX }}
              transition={{ type: 'tween', duration: 0.25 }}
            >
              <button onClick={() => setMobileOpen(false)} className="self-end p-2 -me-2 mb-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <X size={20} />
              </button>
              <SidebarContent {...sidebarProps} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 min-w-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
