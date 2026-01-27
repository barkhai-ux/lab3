/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dota: {
          radiant: '#92A525',
          dire: '#C23C2A',
          bg: '#1a1a2e',
          surface: '#16213e',
          accent: '#0f3460',
          gold: '#e7b84e',
        },
      },
    },
  },
  plugins: [],
};
