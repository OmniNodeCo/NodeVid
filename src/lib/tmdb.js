// TMDB client. Uses the server proxy when the server has a key configured,
// otherwise falls back to a key the user saved in their browser.

const DIRECT_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/';
const KEY_STORAGE = 'nv:tmdbKey';

let mode = 'none'; // 'server' | 'client' | 'none'
const cache = new Map();

export function img(path, size = 'w500') {
  return path ? `${IMG_BASE}${size}${path}` : null;
}

export function getClientKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setClientKey(key) {
  if (key) localStorage.setItem(KEY_STORAGE, key.trim());
  else localStorage.removeItem(KEY_STORAGE);
  cache.clear();
}

export function getMode() {
  return mode;
}

export async function initTmdb() {
  try {
    const r = await fetch('/api/config');
    if (r.ok) {
      const cfg = await r.json();
      if (cfg.serverKey) {
        mode = 'server';
        return mode;
      }
    }
  } catch {
    /* static hosting with no server – fall through */
  }
  mode = getClientKey() ? 'client' : 'none';
  return mode;
}

function buildRequest(path, params, keyOverride) {
  const clean = path.replace(/^\/+/, '');
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v);
  }
  if (mode === 'server' && !keyOverride) {
    return { url: `/api/tmdb/${clean}?${qs}`, headers: {} };
  }
  const key = keyOverride || getClientKey();
  const bearer = key.startsWith('eyJ');
  if (!bearer) qs.set('api_key', key);
  return {
    url: `${DIRECT_BASE}/${clean}?${qs}`,
    headers: bearer ? { Authorization: `Bearer ${key}` } : {},
  };
}

export function tmdb(path, params = {}) {
  const { url, headers } = buildRequest(path, { language: 'en-US', ...params });
  if (cache.has(url)) return cache.get(url);
  const p = fetch(url, { headers }).then(async (r) => {
    if (!r.ok) {
      cache.delete(url);
      const body = await r.json().catch(() => ({}));
      throw new Error(body.status_message || body.error || `TMDB error ${r.status}`);
    }
    return r.json();
  });
  p.catch(() => cache.delete(url));
  cache.set(url, p);
  return p;
}

export async function validateKey(key) {
  const { url, headers } = buildRequest('configuration', {}, key);
  const r = await fetch(url, { headers });
  return r.ok;
}

// ---------- helpers ----------

export const mediaTypeOf = (item, fallback) =>
  item.media_type && item.media_type !== 'person' ? item.media_type : fallback || (item.first_air_date !== undefined || item.name ? 'tv' : 'movie');

export const titleOf = (item) => item?.title || item?.name || '';

export const yearOf = (item) => (item?.release_date || item?.first_air_date || '').slice(0, 4);

export function pickLogo(images) {
  const logos = images?.logos || [];
  return logos.find((l) => l.iso_639_1 === 'en') || logos.find((l) => !l.iso_639_1) || logos[0] || null;
}

export function pickTrailer(videos) {
  const list = (videos?.results || []).filter((v) => v.site === 'YouTube');
  return (
    list.find((v) => v.type === 'Trailer' && v.official) ||
    list.find((v) => v.type === 'Trailer') ||
    list.find((v) => v.type === 'Teaser') ||
    list[0] ||
    null
  );
}

export function certificationOf(details, type) {
  if (type === 'movie') {
    const us = details?.release_dates?.results?.find((r) => r.iso_3166_1 === 'US');
    return us?.release_dates?.find((d) => d.certification)?.certification || '';
  }
  return details?.content_ratings?.results?.find((r) => r.iso_3166_1 === 'US')?.rating || '';
}

export function formatRuntime(min) {
  if (!min) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

const logoCache = new Map();
export function fetchLogo(type, id) {
  const k = `${type}:${id}`;
  if (!logoCache.has(k)) {
    logoCache.set(
      k,
      tmdb(`${type}/${id}/images`, { include_image_language: 'en,null', language: '' })
        .then(pickLogo)
        .catch(() => null)
    );
  }
  return logoCache.get(k);
}

export const MOVIE_GENRES = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' },
];

export const TV_GENRES = [
  { id: 10759, name: 'Action & Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 10762, name: 'Kids' },
  { id: 9648, name: 'Mystery' },
  { id: 10764, name: 'Reality' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10768, name: 'War & Politics' },
  { id: 37, name: 'Western' },
];
