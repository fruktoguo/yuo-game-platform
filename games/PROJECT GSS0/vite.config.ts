import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';

const INDEX_HTML_URL = new URL('index.html', import.meta.url);
const CLASSIC_SCRIPT_PATTERN = /<script\s+src="([^"]+\.js)(?:\?[^"]*)?"><\/script>/gu;

export function referencedClassicScripts(indexHtml: string): string[] {
  const scripts: string[] = [];
  for (const match of indexHtml.matchAll(CLASSIC_SCRIPT_PATTERN)) {
    const fileName = match[1].replace(/^\.\//u, '');
    if (fileName.startsWith('/') || fileName.includes('://') || scripts.includes(fileName)) continue;
    scripts.push(fileName);
  }
  return scripts;
}

export default defineConfig({
  base: './',
  plugins: [{
    name: 'project-gss0-classic-script',
    apply: 'build',
    async generateBundle() {
      const indexHtml = await readFile(INDEX_HTML_URL, 'utf8');
      for (const fileName of referencedClassicScripts(indexHtml)) {
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
