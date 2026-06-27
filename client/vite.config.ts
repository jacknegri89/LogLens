import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Proxy API calls to the backend in dev, so the client can call "/api/..."
    // without CORS headaches or hard-coded URLs.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
