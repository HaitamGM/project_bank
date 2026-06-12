import { useState, useEffect, useCallback } from 'react'
import { translations, LANGS } from './translations'
import { I18nContext } from './context'

function resolve(dict, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict)
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem('lang')
    return LANGS[stored] ? stored : 'fr'
  })
  const dir = LANGS[lang]?.dir || 'ltr'

  // Synchronise <html lang/dir> + persistance. Le navigateur applique le RTL globalement.
  useEffect(() => {
    const root = document.documentElement
    root.lang = lang
    root.dir = dir
    localStorage.setItem('lang', lang)
  }, [lang, dir])

  const setLang = useCallback((l) => {
    if (LANGS[l]) setLangState(l)
  }, [])

  // t('section.cle', { name: 'Yasmina' }) → chaîne traduite, repli sur le français puis la clé.
  const t = useCallback((key, vars) => {
    let val = resolve(translations[lang], key)
    if (typeof val !== 'string') val = resolve(translations.fr, key)
    if (typeof val !== 'string') return key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
      }
    }
    return val
  }, [lang])

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir, langs: LANGS }}>
      {children}
    </I18nContext.Provider>
  )
}
