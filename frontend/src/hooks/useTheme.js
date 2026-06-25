import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  )

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      localStorage.theme = 'dark'
    } else {
      root.classList.remove('dark')
      localStorage.theme = 'light'
    }
  }, [theme])

  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }
}