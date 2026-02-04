/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dota: {
          radiant: '#92A525',
          dire: '#C23C2A',
          bg: '#121218',
          surface: '#1c1c24',
          accent: '#2a2a36',
          gold: '#d4a855',
          border: '#2f2f3a',
          text: {
            primary: '#e5e5e7',
            secondary: '#9ca3af',
            muted: '#6b7280',
          },
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        stat: ['0.6875rem', { lineHeight: '1rem' }],
        label: ['0.625rem', { lineHeight: '0.875rem' }],
      },
    },
  },
  plugins: [],
};
