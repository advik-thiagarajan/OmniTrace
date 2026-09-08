/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        command: {
          950: '#07090e',
          900: '#0b0f19',
          850: '#101626',
          800: '#151d32',
          700: '#1e2945',
          600: '#2c3b60',
          500: '#3d5180',
        },
        neon: {
          cyan: '#00f2fe',
          blue: '#4facfe',
          purple: '#a855f7',
          magenta: '#f43f5e',
          gold: '#f59e0b',
          emerald: '#10b981',
          danger: '#ef4444',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 242, 254, 0.35)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.35)',
        'glow-danger': '0 0 25px rgba(239, 68, 68, 0.45)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}
