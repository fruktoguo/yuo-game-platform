import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';

const CLASSIC_SCRIPTS = ['designer-config.js', 'spawn-planner.js', 'lobby-navigation.js', 'game.js', 'network-codec.js', 'network-player-prediction.js', 'network-player-state-codec.js', 'network-player-collisions.js', 'network-head-collisions.js', 'network-food-claims.js', 'network-projectiles.js'] as const;

export default defineConfig({
  base: './',
  plugins: [{
    name: 'project-gss0-classic-script',
    apply: 'build',
    async generateBundle() {
      for (const fileName of CLASSIC_SCRIPTS) {
        this.emitFile({ type: 'asset', fileName, source: await readFile(new URL(fileName, import.meta.url)) });
      }
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
