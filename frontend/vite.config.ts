import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      // Proxy ONLY backend auth endpoints.
      // Don't proxy `/auth/callback` because that's a frontend React Router route.
      '/auth/steam': { target: apiTarget, changeOrigin: true },
      '/auth/me': { target: apiTarget, changeOrigin: true },
      '/auth/logout': { target: apiTarget, changeOrigin: true },
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
});
