import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist/client',
    sourcemap: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5176,
    proxy: {
      '/api': 'http://127.0.0.1:3103',
      '/socket.io': {
        target: 'ws://127.0.0.1:3103',
        ws: true,
      },
    },
  },
});
