import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O dev server serve o SPA e faz proxy de /api e /actuator para o backend
// Spring Boot (porta 8086), evitando CORS. Ajuste VITE_BACKEND_URL se necessario.
const backend = process.env.VITE_BACKEND_URL || 'http://localhost:8086';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/actuator': { target: backend, changeOrigin: true },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/actuator': { target: backend, changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@mui/x-data-grid')) return 'grid';
          if (id.includes('node_modules/@mui/x-date-pickers')) return 'pickers';
          if (id.includes('node_modules/@mui')) return 'mui';
          if (id.includes('node_modules/@tanstack')) return 'query';
        },
      },
    },
  },
});
