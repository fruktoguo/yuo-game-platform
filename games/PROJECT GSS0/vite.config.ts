import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'project-gss0-classic-script',
    apply: 'build',
    async generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'game.js', source: await readFile(new URL('./game.js', import.meta.url)) });
    },
  }],
  build: {
    outDir: 'dist/client',
    sourcemap: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5176,
    proxy: {
      '/api': 'http://127.0.0.1:3103',
      '/health': 'http://127.0.0.1:3103',
      '/socket.io': {
        target: 'http://127.0.0.1:3103',
        ws: true,
      },
    },
  },
});
