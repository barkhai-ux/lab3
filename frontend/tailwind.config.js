/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dota: {
          // Team colors
          radiant: '#92A525',
          'radiant-dark': '#6b7a1a',
          'radiant-light': '#b8d42e',
          dire: '#C23C2A',
          'dire-dark': '#8a2a1e',
          'dire-light': '#e74c3c',
          // Background & surfaces
          bg: '#0d0d15',
          'bg-dark': '#080810',
          surface: '#171723',
          'surface-light': '#1f1f2e',
          'surface-dark': '#0f0f18',
          // Accents
          accent: '#1a3a5c',
          'accent-light': '#2563eb',
          gold: '#f5a623',
          'gold-light': '#ffd700',
          'gold-dark': '#c4850a',
          // Text
          'text-primary': '#e8e8e8',
          'text-secondary': '#9ca3af',
          'text-muted': '#6b7280',
          // Status colors
          win: '#22c55e',
          loss: '#ef4444',
          // Rarity/tier colors (like item rarities)
          common: '#b0c3d9',
          uncommon: '#5e98d9',
          rare: '#4b69ff',
          mythical: '#8847ff',
          legendary: '#d32ce6',
          immortal: '#e4ae39',
          arcana: '#ade55c',
        },
      },
      boxShadow: {
        'glow-gold': '0 0 20px rgba(245, 166, 35, 0.3)',
        'glow-radiant': '0 0 20px rgba(146, 165, 37, 0.3)',
        'glow-dire': '0 0 20px rgba(194, 60, 42, 0.3)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'dota-pattern': 'linear-gradient(135deg, rgba(23, 23, 35, 0.9) 0%, rgba(13, 13, 21, 0.95) 100%)',
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, transparent 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(245, 166, 35, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(245, 166, 35, 0.4)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
      },
    },
  },
  plugins: [],
};
