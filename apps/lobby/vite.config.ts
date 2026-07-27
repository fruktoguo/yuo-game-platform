import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const platformApiUrl = process.env.PLATFORM_API_URL ?? 'http://127.0.0.1:3100';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    proxy: {
      '/api': {
        target: platformApiUrl,
        changeOrigin: true,
        headers: { origin: platformApiUrl },
      },
      '/.well-known': {
        target: platformApiUrl,
        changeOrigin: true,
        headers: { origin: platformApiUrl },
      },
      '/health': {
        target: platformApiUrl,
        changeOrigin: true,
        headers: { origin: platformApiUrl },
      },
    },
  },
});
