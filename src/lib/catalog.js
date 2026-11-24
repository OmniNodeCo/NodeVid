// Keyless metadata from Cinemeta (Stremio's public catalog API).
// It returns IMDb ids plus the matching TMDB id (`moviedb_id`), which is what
// the Vidking embed expects — so no API key is required anywhere.

const BASE = 'https://v3-cinemeta.strem.io';
const cache = new Map();

function get(url) {
  if (cache.has(url)) return cache.get(url);
  const p = fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Catalog error ${r.status}`);
    return r.json();
  });
  p.catch(() => cache.delete(url));
  cache.set(url, p);
  return p;
}

/** our route type ('movie' | 'tv') -> Cinemeta type */
export const ctype = (t) => (t === 'tv' ? 'series' : 'movie');

/** Bigger variants of metahub images, with the original as fallback. */
export function sized(url, size) {
  if (!url) return [];
  const big = url.replace(/\/(poster|background|logo)\/(small|medium|large)\//, `/$1/${size}/`);
  return big === url ? [url] : [big, url];
}

export function normalize(m, typeHint) {
  if (!m) return null;
  const type = m.type === 'series' ? 'tv' : m.type === 'movie' ? 'movie' : typeHint;
  return {
    id: m.imdb_id || m.id,
    type,
    title: m.name || '',
    poster: m.poster || null,
    background: m.background || null,
    logo: m.logo || null,
    year: String(m.releaseInfo || m.year || '').slice(0, 4),
    yearRange: String(m.releaseInfo || m.year || ''),
    rating: parseFloat(m.imdbRating) || 0,
    genres: m.genres || m.genre || [],
    description: m.description || '',
    tmdbId: m.moviedb_id || null,
    runtime: m.runtime || '',
  };
}

function extrasPath(extra) {
  const parts = Object.entries(extra)
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 0)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  return parts.length ? `/${parts.join('&')}` : '';
}

/**
 * Fetch a catalog page.
 * @param {'movie'|'tv'} type
 * @param {{ list?: 'top'|'imdbRating'|'year', genre?: string, search?: string, skip?: number }} opts
 */
export async function catalog(type, { list = 'top', genre, search, skip } = {}) {
  const url = `${BASE}/catalog/${ctype(type)}/${list}${extrasPath({ genre, search, skip })}.json`;
  const d = await get(url);
  return (d.metas || []).map((m) => normalize(m, type)).filter((x) => x && x.id && x.poster);
}

/** Full metadata for one title (includes episodes for series). */
export async function meta(type, id) {
  const d = await get(`${BASE}/meta/${ctype(type)}/${id}.json`);
  if (!d?.meta) throw new Error('Title not found');
  return d.meta;
}

/** Search movies and series together. */
export async function searchAll(query) {
  const [movies, shows] = await Promise.all([
    catalog('movie', { search: query }).catch(() => []),
    catalog('tv', { search: query }).catch(() => []),
  ]);
  // interleave so both kinds show up near the top
  const out = [];
  for (let i = 0; i < Math.max(movies.length, shows.length); i++) {
    if (movies[i]) out.push(movies[i]);
    if (shows[i]) out.push(shows[i]);
  }
  return out;
}

/** Group a series' videos into seasons: [{ season, episodes: [...] }] */
export function seasonsOf(m) {
  const map = new Map();
  for (const v of m?.videos || []) {
    const s = Number(v.season);
    const e = Number(v.episode ?? v.number);
    if (!Number.isFinite(s) || !Number.isFinite(e)) continue;
    if (!map.has(s)) map.set(s, []);
    map.get(s).push({ ...v, season: s, episode: e });
  }
  return [...map.entries()]
    .map(([season, eps]) => ({ season, episodes: eps.sort((a, b) => a.episode - b.episode) }))
    .sort((a, b) => (a.season === 0 ? 1 : b.season === 0 ? -1 : a.season - b.season));
}

export const MOVIE_GENRES = ['Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western'];
export const TV_GENRES = [...MOVIE_GENRES, 'Reality-TV', 'Talk-Show', 'Game-Show'];

const THIS_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: 30 }, (_, i) => String(THIS_YEAR - i));

// ---------- Vidking ----------

export const VIDKING = 'https://www.vidking.net';

/** True for a bare TMDB numeric id (e.g. from /watch/movie/1078605). */
export const isTmdbId = (id) => /^\d+$/.test(String(id));

export function vidkingUrl({ type, id, season, episode }, opts = {}) {
  const qs = new URLSearchParams();
  qs.set('color', (opts.color || '8b6cff').replace('#', ''));
  if (opts.autoPlay) qs.set('autoPlay', 'true');
  if (type === 'tv') {
    if (opts.nextEpisode) qs.set('nextEpisode', 'true');
    if (opts.episodeSelector) qs.set('episodeSelector', 'true');
  }
  if (opts.progress > 0) qs.set('progress', String(Math.floor(opts.progress)));
  const path = type === 'tv' ? `/embed/tv/${id}/${season}/${episode}` : `/embed/movie/${id}`;
  return `${VIDKING}${path}?${qs}`;
}
