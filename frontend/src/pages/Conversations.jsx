import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessagesSquare, Mic, Keyboard, ChevronDown, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useConversations } from '../hooks/useClient'

const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800'

export default function Conversations() {
  const navigate = useNavigate()
  const clientId = localStorage.getItem('clientId') || 'CL-2024-0042'
  const { data: conversations, isLoading } = useConversations(clientId)
  const [openId, setOpenId] = useState(null)

  if (isLoading || !conversations) return <div className="p-8 text-slate-400">Chargement…</div>

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 mb-1"><MessagesSquare size={18} /><span className="text-xs font-semibold uppercase tracking-wider">Historique</span></div>
        <h1 className="text-2xl font-bold tracking-tight">Mes conversations</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{conversations.length} échange(s) sauvegardé(s) avec l'assistant BankIA</p>
      </div>

      {conversations.length === 0 ? (
        <div className={`${card} p-10 text-center`}>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-4"><MessagesSquare size={26} /></div>
          <p className="font-semibold mb-1">Aucune conversation pour l'instant</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Parlez ou écrivez à l'assistant ; vos échanges seront conservés ici automatiquement.</p>
          <button onClick={() => navigate('/assistant')} className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
            <Mic size={16} /> Ouvrir l'assistant
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((c, i) => {
            const open = openId === c.id
            const vocal = c.canal === 'vocal'
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className={`${card} overflow-hidden`}>
                <button onClick={() => setOpenId(open ? null : c.id)} className="w-full flex items-center gap-3 p-4 text-start hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${vocal ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400' : 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'}`}>
                    {vocal ? <Mic size={18} /> : <Keyboard size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{c.titre || 'Conversation'}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1"><Clock size={11} /> {c.date}</span>
                      <span>· {c.nbMessages} messages</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${vocal ? 'bg-primary-100 dark:bg-primary-500/15 text-primary-700 dark:text-primary-400' : 'bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400'}`}>{vocal ? 'Vocal' : 'Texte'}</span>
                    </p>
                  </div>
                  <ChevronDown size={18} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        {(c.messages || []).map((m, j) => (
                          <div key={j} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-sm'}`}>
                              {m.role !== 'user' && <p className="text-[10px] uppercase tracking-wide font-semibold text-primary-600 dark:text-primary-400 mb-0.5">BankIA</p>}
                              {m.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
