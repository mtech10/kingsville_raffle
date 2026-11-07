import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the browser talks to Vite, which forwards /api to Express (no CORS needed).
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
});
