import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// NodeVid is a fully static front-end: the catalog is a curated list of
// public-domain / Creative Commons titles streamed from the Internet Archive.
// This server just serves the built app with SPA routing.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const dist = path.join(__dirname, 'dist');

const app = express();
app.disable('x-powered-by');

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y' }));
app.use(express.static(dist, { index: false, maxAge: '1h' }));

app.get(/.*/, (_req, res) => {
  const index = path.join(dist, 'index.html');
  if (!fs.existsSync(index)) return res.status(500).send('Front-end not built. Run "npm run build" and restart.');
  res.set('Cache-Control', 'no-cache').sendFile(index);
});

app.listen(PORT, HOST, () => console.log(`NodeVid running at http://${HOST}:${PORT}`));
