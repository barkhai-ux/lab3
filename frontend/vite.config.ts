import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/auth/steam': 'http://localhost:8000',
      '/auth/me': 'http://localhost:8000',
      '/auth/logout': 'http://localhost:8000',
      '/api': 'http://localhost:8000',
    },
  },
});
