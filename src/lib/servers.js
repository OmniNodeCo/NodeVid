// Streaming servers (embed providers). Each server knows how to build its
// embed URL, how to read its player's progress events, and how to health-check
// itself (site up? title available? quality?) so the watch page can fail over.
//
// Vidking: https://www.vidking.net         (TMDB ids)
// VidSrc:  https://vidsrc.sh/vidsrc/docs/  (IMDb or TMDB ids, official mirrors below)

const CHECK_TIMEOUT = 5000;

/** Resolve within `ms` or reject. */
function withTimeout(promise, ms = CHECK_TIMEOUT) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

// ---------- site reachability ----------

const originCache = new Map(); // origin -> { t, up: Promise<boolean> }
const ORIGIN_TTL = 2 * 60 * 1000;

/** Is a cross-origin site reachable? Opaque (no-cors) fetch: resolves if up, rejects on DNS/network failure. */
export function probeOrigin(origin) {
  const hit = originCache.get(origin);
  if (hit && Date.now() - hit.t < ORIGIN_TTL) return hit.up;
  const up = withTimeout(fetch(`${origin}/favicon.ico?_=${Date.now()}`, { mode: 'no-cors', cache: 'no-store' }))
    .then(() => true)
    .catch(() => false);
  originCache.set(origin, { t: Date.now(), up });
  return up;
}

/** First reachable origin in the list, or null. Probes in parallel, keeps list order as priority. */
async function firstUp(origins) {
  const ups = await Promise.all(origins.map(probeOrigin));
  const i = ups.indexOf(true);
  return i === -1 ? null : origins[i];
}

// ---------- quality ----------

/** 4 = 4K, 3 = 1080p, 1 = 720p, 0.5 = SD/DVD, 0 = CAM, null = unknown */
export function qualityScore(q) {
  if (!q) return null;
  const s = String(q).toLowerCase();
  if (/2160|4k|uhd/.test(s)) return 4;
  if (/1080|fhd|full ?hd/.test(s)) return 3;
  if (/720|\bhd\b/.test(s)) return 1;
  if (/cam|\bts\b|telesync|hdcam/.test(s)) return 0;
  if (/sd|dvd|480|360/.test(s)) return 0.5;
  return null;
}
export const HD_SCORE = 3;

// ---------- servers ----------

/**
 * ctx = { type: 'movie'|'tv', imdbId, tmdbId, season, episode, progress, settings }
 * check(ctx) -> { up: boolean, origin: string|null, available: boolean|null, quality: string|null }
 * parseEvent(data) -> { event, time, duration, season, episode, ids } | null
 */
export const SERVERS = [
  {
    id: 'vidking',
    name: 'Vidking',
    note: 'Fast HLS player · 4K on some titles',
    origins: ['https://www.vidking.net'],
    canPlay: ({ imdbId, tmdbId }) => Boolean(tmdbId || imdbId),
    url({ type, imdbId, tmdbId, season, episode, progress, settings }, origin = this.origins[0]) {
      const id = tmdbId || imdbId;
      const qs = new URLSearchParams();
      qs.set('color', (settings.color || '8b6cff').replace('#', ''));
      if (settings.autoPlay) qs.set('autoPlay', 'true');
      if (type === 'tv') {
        if (settings.nextEpisode) qs.set('nextEpisode', 'true');
        if (settings.episodeSelector) qs.set('episodeSelector', 'true');
      }
      if (progress > 0) qs.set('progress', String(Math.floor(progress)));
      const path = type === 'tv' ? `/embed/tv/${id}/${season}/${episode}` : `/embed/movie/${id}`;
      return `${origin}${path}?${qs}`;
    },
    async check() {
      // No public availability API: we can only tell whether the site is up.
      const origin = await firstUp(this.origins);
      return { up: Boolean(origin), origin, available: null, quality: null };
    },
    parseEvent(d) {
      if (!d || d.player_info) return null;
      if (d.event === undefined && d.currentTime === undefined) return null;
      return {
        event: d.event || 'timeupdate',
        time: Number(d.currentTime) || 0,
        duration: Number(d.duration) || 0,
        season: Number(d.season) || null,
        episode: Number(d.episode) || null,
        ids: [d.id].filter(Boolean).map(String),
      };
    },
  },
  {
    id: 'vidsrc',
    name: 'VidSrc',
    note: 'Multi-source · built-in subtitles · auto-next',
    handlesAutoNext: true,
    // Official live domains (https://vidsrc.domains) — all serve identical content.
    origins: ['https://vidsrc.sh', 'https://vidsrc2.ru', 'https://vidsrc.ir'],
    canPlay: ({ imdbId, tmdbId }) => Boolean(imdbId || tmdbId),
    url({ type, imdbId, tmdbId, season, episode, progress, settings }, origin = this.origins[0]) {
      const id = imdbId || tmdbId;
      const qs = new URLSearchParams();
      if (settings.autoPlay) qs.set('autoplay', '1');
      if (type === 'tv' && settings.autoNext) qs.set('autonext', '1');
      if (progress > 0) qs.set('startAt', String(Math.floor(progress)));
      if (settings.subLang) qs.set('ds_lang', settings.subLang);
      const path = type === 'tv' ? `/embed/tv/${id}/${season}/${episode}` : `/embed/movie/${id}`;
      const q = qs.toString();
      return `${origin}${path}${q ? `?${q}` : ''}`;
    },
    async check({ type, imdbId, tmdbId, season, episode }) {
      const id = imdbId || tmdbId;
      if (!id) return { up: false, origin: null, available: false, quality: null };
      return vidsrcInfo(type, id, type === 'tv' ? season : null, type === 'tv' ? episode : null);
    },
    parseEvent(d) {
      if (!d || !d.player_status) return null;
      const info = d.player_info || {};
      const map = { playing: 'timeupdate', paused: 'pause', completed: 'ended', seeked: 'seeked' };
      return {
        event: map[d.player_status] || d.player_status,
        time: Number(d.player_progress) || 0,
        duration: Number(d.player_duration) || 0,
        season: Number(info.season) || null,
        episode: Number(info.episode) || null,
        ids: [info.imdb, info.tmdb].filter(Boolean).map(String),
      };
    },
  },
];

export const getServer = (id) => SERVERS.find((s) => s.id === id) || SERVERS[0];

// ---------- health checks + automatic selection ----------

const checkCache = new Map();
const CHECK_TTL = 5 * 60 * 1000;

/** Health of one server for one title/episode (cached). Never rejects. */
export function checkServer(serverId, ctx) {
  const s = getServer(serverId);
  const key = `${s.id}|${ctx.type}|${ctx.imdbId || ''}|${ctx.tmdbId || ''}|${ctx.type === 'tv' ? `${ctx.season}:${ctx.episode}` : ''}`;
  const hit = checkCache.get(key);
  if (hit && Date.now() - hit.t < CHECK_TTL) return hit.p;
  const p = s
    .check(ctx)
    .catch(() => ({ up: false, origin: null, available: null, quality: null }))
    .then((r) => ({ ...r, score: qualityScore(r.quality) }));
  checkCache.set(key, { t: Date.now(), p });
  return p;
}

const usable = (r) => r && r.up !== false && r.available !== false;
const rank = (r) => (r.score == null ? 2.5 : r.score); // unknown quality sits between 1080p and 720p

/**
 * Decide which server to use.
 *   - keep the preferred server if it's up, has the title and isn't known to be < 1080p
 *   - otherwise switch to the best usable alternative
 * Returns { id, origin, reason, from } where reason is null | 'down' | 'unavailable' | 'quality'.
 */
export async function autoPickServer(preferredId, ctx, { minHD = true, exclude = [], onResult } = {}) {
  const report = (id) => (r) => {
    onResult?.(id, r);
    return r;
  };
  const preferred = getServer(preferredId).id;
  const prefOk = (r) => usable(r) && !exclude.includes(preferred) && (!minHD || r.score == null || r.score >= HD_SCORE);

  // Fast path: check the preferred server first; if it's fine, go immediately.
  const others = SERVERS.filter((s) => s.id !== preferred).map((s) => [s.id, checkServer(s.id, ctx).then(report(s.id))]);
  const pref = await checkServer(preferred, ctx).then(report(preferred));
  if (prefOk(pref)) return { id: preferred, origin: pref.origin, reason: null, from: null };

  const results = { [preferred]: pref };
  for (const [id, p] of others) results[id] = await p;

  const candidates = Object.entries(results)
    .filter(([id, r]) => usable(r) && !exclude.includes(id))
    .sort(([ia, a], [ib, b]) => rank(b) - rank(a) || (ia === preferred ? -1 : ib === preferred ? 1 : 0));

  const reason = exclude.includes(preferred) || pref.up === false ? 'down' : pref.available === false ? 'unavailable' : 'quality';

  if (!candidates.length) return { id: preferred, origin: pref.origin, reason: 'none', from: null };
  const [bestId, best] = candidates[0];
  if (bestId === preferred) return { id: preferred, origin: pref.origin, reason: null, from: null };
  // Only switch for quality if the alternative is actually better.
  if (reason === 'quality' && rank(best) <= rank(pref)) return { id: preferred, origin: pref.origin, reason: null, from: null };
  return { id: bestId, origin: best.origin, reason, from: preferred, fromQuality: pref.quality };
}

/** Parse a postMessage payload from any server's player. */
export function parsePlayerMessage(raw) {
  let msg = raw;
  if (typeof msg === 'string') {
    try {
      msg = JSON.parse(msg);
    } catch {
      return null;
    }
  }
  if (!msg || msg.type !== 'PLAYER_EVENT' || !msg.data) return null;
  for (const s of SERVERS) {
    const ev = s.parseEvent(msg.data);
    if (ev) return { ...ev, server: s.id };
  }
  return null;
}

// ---------- VidSrc catalogue API (keyless, CORS-enabled) ----------

const VIDSRC_ORIGINS = SERVERS.find((s) => s.id === 'vidsrc').origins;
const infoCache = new Map();

/**
 * Availability + quality for a title/episode on VidSrc, trying each mirror.
 * Resolves to { up, origin, available: boolean|null, quality }.
 */
export function vidsrcInfo(type, id, season, episode) {
  const path = type === 'tv' && season != null && episode != null ? `tv/${id}/${season}/${episode}` : `${type === 'tv' ? 'tv' : 'movie'}/${id}`;
  if (!infoCache.has(path)) {
    const p = (async () => {
      for (const origin of VIDSRC_ORIGINS) {
        try {
          const r = await withTimeout(fetch(`${origin}/info/${path}.json`));
          if (r.status === 404) return { up: true, origin, available: false, quality: null };
          if (!r.ok) continue; // 5xx: try the next mirror
          const d = await r.json();
          return { up: true, origin, available: true, quality: d.quality || null };
        } catch {
          /* network error / CORS / timeout: try the next mirror */
        }
      }
      // API unreachable everywhere — the player might still be up.
      const origin = await firstUp(VIDSRC_ORIGINS);
      return { up: Boolean(origin), origin, available: null, quality: null };
    })();
    infoCache.set(path, p);
    p.then((r) => !r.up && setTimeout(() => infoCache.delete(path), 30000));
  }
  return infoCache.get(path);
}

const metahub = (kind, imdb) => (imdb ? `https://images.metahub.space/${kind}/medium/${imdb}/img` : null);

// Feed titles look like "Iron Man 3 2013", "Show (2018)" or "Show (TV Mini Series 2025)".
export function splitTitle(raw = '') {
  let s = String(raw).trim();
  let year = '';
  const paren = s.match(/\s*\(([^()]*?)(\d{4})[^()]*\)?\s*$/);
  if (paren) {
    year = paren[2];
    s = s.slice(0, paren.index);
  } else {
    const bare = s.match(/^(.+?)\s+(\d{4})$/);
    if (bare) {
      year = bare[2];
      s = bare[1];
    }
  }
  s = s.replace(/\s*\((?:TV|Mini|Video)[^)]*\)?\s*$/i, '').trim();
  return { title: s || String(raw), year };
}

/** Recently added titles on VidSrc. kind: 'movies' | 'tvshows' | 'episodes' */
export async function vidsrcLatest(kind, page = 1) {
  let d = null;
  for (const origin of VIDSRC_ORIGINS) {
    try {
      const r = await withTimeout(fetch(`${origin}/${kind}/latest/page-${page}.json`), 8000);
      if (r.ok) {
        d = await r.json();
        break;
      }
    } catch {
      /* next mirror */
    }
  }
  if (!d) throw new Error('VidSrc unavailable');
  const seen = new Set();
  const out = [];
  for (const x of d.result || []) {
    if (!x.imdb_id || seen.has(x.imdb_id)) continue;
    seen.add(x.imdb_id);
    const { title, year } = splitTitle(x.title || x.show_title);
    out.push({
      id: x.imdb_id,
      type: kind === 'movies' ? 'movie' : 'tv',
      title,
      year,
      poster: metahub('poster', x.imdb_id),
      background: metahub('background', x.imdb_id),
      logo: null,
      rating: 0,
      genres: [],
      tmdbId: x.tmdb_id ? Number(x.tmdb_id) : null,
      quality: x.quality || '',
      season: x.season != null ? Number(x.season) : undefined,
      episode: x.episode != null ? Number(x.episode) : undefined,
    });
  }
  return out;
}
