import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Load a local .env file if present (no extra dependency needed).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const TMDB_KEY = (process.env.TMDB_API_KEY || process.env.TMDB_TOKEN || '').trim();
const TMDB_BASE = (process.env.TMDB_BASE || 'https://api.themoviedb.org/3').replace(/\/$/, '');
const CACHE_TTL = 10 * 60 * 1000;

const app = express();
app.disable('x-powered-by');

// Tiny in-memory cache so popular rows don't hammer TMDB.
const cache = new Map();
function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.t > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return hit.v;
}
function cacheSet(key, v) {
  if (cache.size > 2000) cache.delete(cache.keys().next().value);
  cache.set(key, { t: Date.now(), v });
}

app.get('/api/config', (_req, res) => {
  res.json({ serverKey: Boolean(TMDB_KEY) });
});

// Proxy: /api/tmdb/<path>?<query>  ->  TMDB /3/<path>?<query>
// Supports both v3 API keys and v4 "read access tokens" (JWT bearer).
app.get(/^\/api\/tmdb\/(.+)$/, async (req, res) => {
  if (!TMDB_KEY) return res.status(503).json({ error: 'TMDB_API_KEY is not configured on the server.' });
  const tmdbPath = req.params[0];
  if (!/^[a-z0-9_/\-]+$/i.test(tmdbPath)) return res.status(400).json({ error: 'Bad path' });

  const params = new URLSearchParams(req.query);
  params.delete('api_key');
  const isBearer = TMDB_KEY.startsWith('eyJ');
  if (!isBearer) params.set('api_key', TMDB_KEY);
  const url = `${TMDB_BASE}/${tmdbPath}?${params}`;

  const cached = cacheGet(url);
  if (cached) return res.set('X-Cache', 'HIT').json(cached);

  try {
    const r = await fetch(url, {
      headers: { accept: 'application/json', ...(isBearer ? { authorization: `Bearer ${TMDB_KEY}` } : {}) },
    });
    const body = await r.json().catch(() => ({}));
    if (r.ok) cacheSet(url, body);
    res.status(r.status).set('Cache-Control', 'public, max-age=300').json(body);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach TMDB', detail: String(err?.message || err) });
  }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Serve the built front-end (run `npm run build` first).
const dist = path.join(__dirname, 'dist');
app.use(express.static(dist, { index: false, maxAge: '1h' }));
app.get(/.*/, (_req, res) => {
  const index = path.join(dist, 'index.html');
  if (!fs.existsSync(index)) {
    return res.status(500).send('Front-end not built. Run "npm run build" and restart.');
  }
  res.sendFile(index);
});

app.listen(PORT, HOST, () => {
  console.log(`NodeVid running at http://${HOST}:${PORT}`);
  console.log(TMDB_KEY ? 'TMDB key: configured on server' : 'TMDB key: not set (users will be asked to enter one in the browser)');
});
