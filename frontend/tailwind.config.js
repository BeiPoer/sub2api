import colors from 'tailwindcss/colors'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        white: 'rgb(var(--color-white, 255 255 255) / <alpha-value>)',
        gray: Object.fromEntries(Object.entries(colors.gray).map(([shade, hex]) => [
          shade,
          `rgb(var(--color-gray-${shade}, ${hex.slice(1).match(/../g).map(value => parseInt(value, 16)).join(' ')}) / <alpha-value>)`
        ])),
        // 主色调 - Teal/Cyan 青色系
        primary: {
          50: 'rgb(var(--color-primary-50, 240 253 250) / <alpha-value>)',
          100: 'rgb(var(--color-primary-100, 204 251 241) / <alpha-value>)',
          200: 'rgb(var(--color-primary-200, 153 246 228) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300, 94 234 212) / <alpha-value>)',
          400: 'rgb(var(--color-primary-400, 45 212 191) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500, 20 184 166) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600, 13 148 136) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700, 15 118 110) / <alpha-value>)',
          800: 'rgb(var(--color-primary-800, 17 94 89) / <alpha-value>)',
          900: 'rgb(var(--color-primary-900, 19 78 74) / <alpha-value>)',
          950: 'rgb(var(--color-primary-950, 4 47 46) / <alpha-value>)'
        },
        // 辅助色 - 深蓝灰
        accent: {
          50: 'rgb(var(--color-accent-50, 248 250 252) / <alpha-value>)',
          100: 'rgb(var(--color-accent-100, 241 245 249) / <alpha-value>)',
          200: 'rgb(var(--color-accent-200, 226 232 240) / <alpha-value>)',
          300: 'rgb(var(--color-accent-300, 203 213 225) / <alpha-value>)',
          400: 'rgb(var(--color-accent-400, 148 163 184) / <alpha-value>)',
          500: 'rgb(var(--color-accent-500, 100 116 139) / <alpha-value>)',
          600: 'rgb(var(--color-accent-600, 71 85 105) / <alpha-value>)',
          700: 'rgb(var(--color-accent-700, 51 65 85) / <alpha-value>)',
          800: 'rgb(var(--color-accent-800, 30 41 59) / <alpha-value>)',
          900: 'rgb(var(--color-accent-900, 15 23 42) / <alpha-value>)',
          950: 'rgb(var(--color-accent-950, 2 6 23) / <alpha-value>)'
        },
        // 深色模式背景
        dark: {
          50: 'rgb(var(--color-dark-50, 248 250 252) / <alpha-value>)',
          100: 'rgb(var(--color-dark-100, 241 245 249) / <alpha-value>)',
          200: 'rgb(var(--color-dark-200, 226 232 240) / <alpha-value>)',
          300: 'rgb(var(--color-dark-300, 203 213 225) / <alpha-value>)',
          400: 'rgb(var(--color-dark-400, 148 163 184) / <alpha-value>)',
          500: 'rgb(var(--color-dark-500, 100 116 139) / <alpha-value>)',
          600: 'rgb(var(--color-dark-600, 71 85 105) / <alpha-value>)',
          700: 'rgb(var(--color-dark-700, 51 65 85) / <alpha-value>)',
          800: 'rgb(var(--color-dark-800, 30 41 59) / <alpha-value>)',
          900: 'rgb(var(--color-dark-900, 15 23 42) / <alpha-value>)',
          950: 'rgb(var(--color-dark-950, 2 6 23) / <alpha-value>)'
        }
      },
      fontFamily: {
        sans: [
          'var(--skin-font-sans, system-ui)',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif'
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.08)',
        'glass-sm': '0 4px 16px rgba(0, 0, 0, 0.06)',
        glow: '0 0 20px rgba(20, 184, 166, 0.25)',
        'glow-lg': '0 0 40px rgba(20, 184, 166, 0.35)',
        card: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 40px rgba(0, 0, 0, 0.08)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        'gradient-glass':
          'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'mesh-gradient':
          'radial-gradient(at 40% 20%, rgba(20, 184, 166, 0.12) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(6, 182, 212, 0.08) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(20, 184, 166, 0.08) 0px, transparent 50%)'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s linear infinite',
        glow: 'glow 2s ease-in-out infinite alternate'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(20, 184, 166, 0.25)' },
          '100%': { boxShadow: '0 0 30px rgba(20, 184, 166, 0.4)' }
        }
      },
      backdropBlur: {
        xs: '2px'
      },
      borderRadius: {
        lg: 'var(--skin-radius-lg, 0.5rem)',
        xl: 'var(--skin-radius-xl, 0.75rem)',
        '2xl': 'var(--skin-radius-2xl, 1rem)',
        '3xl': 'var(--skin-radius-3xl, 1.5rem)',
        '4xl': 'var(--skin-radius-4xl, 2rem)'
      }
    }
  },
  plugins: []
}
