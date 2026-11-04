/** @type {import('tailwindcss').Config} */
export default {
  // Tell Tailwind which files to scan for class names
  // It removes unused CSS in production builds (tree-shaking)
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Custom color palette — dark developer theme inspired by VS Code
      colors: {
        // Editor background colors
        editor: {
          bg:        '#1e1e1e',  // main editor dark background
          sidebar:   '#252526',  // sidebar background
          toolbar:   '#2d2d30',  // top bar background
          panel:     '#1e1e1e',  // bottom panel background
          border:    '#3e3e42',  // subtle border color
          highlight: '#2a2d2e',  // hover / active item highlight
        },
        // Brand accent color (used for buttons, focus rings, links)
        brand: {
          DEFAULT: '#0ea5e9',   // sky-500
          dark:    '#0284c7',   // sky-600
          light:   '#38bdf8',   // sky-400
        },
        // Collaboration cursor colors (one per participant)
        cursor: {
          blue:   '#3b82f6',
          green:  '#22c55e',
          orange: '#f97316',
          purple: '#a855f7',
          red:    '#ef4444',
          yellow: '#eab308',
          pink:   '#ec4899',
          teal:   '#14b8a6',
        },
      },
      // Custom font family
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Custom animation for presence indicators
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.2s ease-in-out',
        'slide-up':   'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',   opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
