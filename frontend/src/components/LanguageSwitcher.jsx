import { useState, useRef, useEffect } from 'react'
import { Globe, Check } from 'lucide-react'
import { useI18n } from '../i18n/context'

// Sélecteur de langue FR / العربية / EN. Bascule la langue ET le sens d'écriture (RTL pour l'arabe).
export default function LanguageSwitcher({ align = 'end' }) {
  const { lang, setLang, langs } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        aria-label={langs[lang]?.name}
      >
        <Globe size={16} />
        <span className="font-semibold">{langs[lang]?.short}</span>
      </button>

      {open && (
        <div className={`absolute z-50 mt-1 min-w-[9rem] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1 ${align === 'end' ? 'end-0' : 'start-0'}`}>
          {Object.entries(langs).map(([code, meta]) => (
            <button
              key={code}
              onClick={() => { setLang(code); setOpen(false) }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition ${
                lang === code
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{meta.name}</span>
              {lang === code && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
