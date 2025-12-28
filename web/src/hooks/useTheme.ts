import { useEffect, useState } from 'react'

export function useTheme() {
  // v13.7 considera LIGHT como padrão
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('theme') || 'light')

  useEffect(() => {
    // aplica atributo esperado pelo v13.7
    document.body.setAttribute('data-theme', theme)

    // mantém classes legadas para compatibilidade
    if (theme === 'dark') {
      document.body.classList.add('dark')
      document.body.classList.remove('light')
    } else {
      document.body.classList.add('light')
      document.body.classList.remove('dark')
    }

    localStorage.setItem('theme', theme)
  }, [theme])

  return { theme, toggle: () => setTheme(t => t === 'light' ? 'dark' : 'light') }
}
