import { useEffect, useState } from 'react'

export function useTheme() {
  // v13.7 considera LIGHT como padrão
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('theme') || 'light')

  useEffect(() => {
    // aplica atributo esperado pelo v13.7
    document.documentElement.setAttribute('data-theme', theme)

    // mantém classes legadas para compatibilidade
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    }

    localStorage.setItem('theme', theme)
  }, [theme])

  return { theme, toggle: () => setTheme(t => t === 'light' ? 'dark' : 'light') }
}
