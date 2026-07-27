import { defineConfig } from 'vite';

const platformApiUrl = process.env.PLATFORM_API_URL ?? 'http://127.0.0.1:3100';

export default defineConfig({
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist/client',
    sourcemap: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5178,
    proxy: {
      '/api': {
        target: platformApiUrl,
        changeOrigin: true,
        headers: { origin: platformApiUrl },
      },
    },
  },
});
