import type { Config } from 'tailwindcss'
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        // Novas Cores Premium (Sincronizadas com index.css)
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        "background-light": "var(--background)",
        "background-dark": "var(--background)",
        success: "var(--success)",
        warning: "var(--warning)",
        error: "var(--error)",
        surface: {
          light: "var(--surface)",
          dark: "var(--surface)",
        },
        // Legado (Sincronizado para consistência visual em todas as rotas)
        brand1: 'var(--primary)',
        brand2: 'var(--secondary)',
        brand3: '#00ffa3', // Cyan-Green vibrante do sistema original
        bg0: 'var(--background)',
        bg1: 'var(--surface)',
        text1: 'var(--text-primary)',
        text2: 'var(--text-secondary)',
        momentum: {
          bg: 'var(--background)',
          surface: 'var(--surface)',
          glass: 'var(--glass-bg)',
          border: 'var(--glass-border)',
          text: 'var(--text-primary)',
          muted: 'var(--text-secondary)',
          accent: 'var(--primary)',
          secondary: 'var(--secondary)',
          success: 'var(--success)',
          warn: 'var(--warning)',
          danger: 'var(--error)',
        },
      },
      borderRadius: {
        DEFAULT: "0.75rem",
        '2xl': '1.25rem',
        'xl': '1rem'
      },
      boxShadow: {
        'soft': '0 10px 25px rgba(0,0,0,.1)',
        '3d': '0 20px 40px rgba(0,0,0,.2)',
        'glow': '0 0 20px rgba(110, 52, 255, 0.15)',
        'glow-cyan': '0 0 20px rgba(0, 198, 255, 0.15)',
      }
    }
  },
  plugins: []
} satisfies Config
