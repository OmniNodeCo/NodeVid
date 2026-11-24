import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// BASE_PATH lets the app live under a sub-path, e.g. GitHub Pages project
// sites (https://<user>.github.io/NodeVid/). Defaults to "/" for local/servers.
const raw = process.env.BASE_PATH || '/';
const base = `/${raw.replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/');

// GitHub Pages has no SPA rewrites: serving index.html as 404.html makes deep
// links like /NodeVid/tv/tt0903747 load the app, which then routes client-side.
const spaFallback = () => {
  let outDir;
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const index = path.join(outDir, 'index.html');
      if (fs.existsSync(index)) fs.copyFileSync(index, path.join(outDir, '404.html'));
    },
  };
};

export default defineConfig({
  // The front-end source (incl. index.html) lives in src/ so the repo root can
  // hold the pre-built GitHub Pages site (see scripts/build-pages.mjs).
  root: path.resolve(__dirname, 'src'),
  publicDir: path.resolve(__dirname, 'public'),
  build: { outDir: path.resolve(__dirname, 'dist'), emptyOutDir: true },
  base,
  plugins: [react(), spaFallback()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
});
