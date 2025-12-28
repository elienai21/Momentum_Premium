
import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand1: '#6e34ff',
        brand2: '#00d4ff',
        brand3: '#00ffa3',
        bg0: 'var(--bg-0)',
        bg1: 'var(--bg-1)',
        text1: 'var(--text-1)',
        text2: 'var(--text-2)',
        momentum: {
          bg: 'var(--bg)',
          surface: 'var(--glass)',
          glass: 'var(--glass)',
          border: 'rgba(255,255,255,0.1)',
          text: 'var(--text-1)',
          muted: 'var(--text-2)',
          accent: '#6e34ff',
          secondary: '#00c6ff',
          success: '#10b981',
          warn: '#f59e0b',
          danger: '#f43f5e',
        },
      },
      borderRadius: {
        '2xl': '1.25rem',
        'xl': '1rem'
      },
      boxShadow: {
        'soft': '0 10px 25px rgba(0,0,0,.25)',
        '3d': '0 20px 40px rgba(0,0,0,.35)',
        'momentum-glow': '0 0 20px rgba(110, 52, 255, 0.15)',
      }
    }
  },
  plugins: []
} satisfies Config
