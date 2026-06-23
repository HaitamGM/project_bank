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
    <div className="mb-8">
      <p className="px-4 mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{title}</p>
      <div className="space-y-1.5 px-2">
        {items.map(({ key, path, icon: Icon }) => {
          const active = pathname === path
          return (
            <button
              key={path}
              onClick={() => onNavigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                active
                  ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 shadow-sm ring-1 ring-primary-100/50 dark:ring-primary-500/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={18} className={active ? 'text-primary-600 dark:text-primary-400' : 'opacity-70'} />
              {t(`nav.${key}`)}
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
      <div className="flex items-center justify-between mb-10 px-2 mt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-900 to-primary-700 text-white flex items-center justify-center font-serif font-bold text-xl shadow-md ring-1 ring-white/20">
            B
          </div>
          <span className="font-serif font-bold text-xl tracking-tight text-slate-900 dark:text-white">BankIA</span>
        </div>
        <LanguageSwitcher />
      </div>

      {client && (
        <button
          onClick={() => onNavigate('/profil')}
          className="flex items-center gap-3 mx-2 mb-8 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-300 text-start group"
        >
          <Avatar photo={client.photo} prenom={client.prenom} nom={client.nom} size={42} rounded="rounded-xl" className="ring-2 ring-white dark:ring-slate-900 group-hover:ring-primary-100 dark:group-hover:ring-primary-900 transition-all" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{client.prenom} {client.nom}</p>
            <p className="text-xs text-primary-600 dark:text-primary-400 font-medium truncate mt-0.5">{client.segment}</p>
          </div>
        </button>
      )}

      <div className="flex-1">
        <NavGroup title={t('nav.clientSpace')} items={clientNav} pathname={pathname} onNavigate={onNavigate} t={t} />
        <NavGroup title={t('nav.demo')} items={demoNav} pathname={pathname} onNavigate={onNavigate} t={t} />
      </div>

      <div className="space-y-1 pt-6 pb-2 px-2 border-t border-slate-200/60 dark:border-slate-800/60 mt-auto">
        <button onClick={toggle} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 transition-all duration-300">
          {theme === 'dark' ? <Sun size={18} className="opacity-70" /> : <Moon size={18} className="opacity-70" />}
          {theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
        </button>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-300">
          <LogOut size={18} className="opacity-70" /> {t('common.logout')}
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-0 lg:p-4 gap-4">
      {/* Sidebar desktop (Floating) */}
      <aside className="hidden lg:flex w-[280px] shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/60 flex-col p-4 overflow-y-auto rounded-3xl shadow-sm">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Barre supérieure mobile */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => setMobileOpen(true)} aria-label={t('common.menu')} className="p-2 -ms-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-900 to-primary-700 text-white flex items-center justify-center font-serif font-bold text-sm shadow-sm ring-1 ring-white/20">B</div>
          <span className="font-serif font-bold tracking-tight text-lg">BankIA</span>
        </div>
        <div className="flex items-center gap-1.5">
          <LanguageSwitcher />
          <button onClick={toggle} aria-label="theme" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
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

      <main className="flex-1 min-w-0 overflow-auto bg-white/40 dark:bg-slate-900/40 rounded-3xl border border-slate-200/40 dark:border-slate-800/40 shadow-sm relative">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
