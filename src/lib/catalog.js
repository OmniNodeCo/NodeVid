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
    released: m.released || null,
    country: m.country || '',
    awards: m.awards || '',
    trailer: trailerOf(m),
    ...(m.videos ? episodeDates(m.videos) : {}),
  };
}

/** YouTube id of the main trailer, if any. */
export function trailerOf(m) {
  return m?.trailers?.find((t) => t.type === 'Trailer')?.source || m?.trailers?.[0]?.source || m?.trailerStreams?.[0]?.ytId || null;
}

/** For series: next upcoming episode and the season premiere it belongs to. */
function episodeDates(videos) {
  const now = Date.now();
  let next = null;
  for (const v of videos) {
    const t = Date.parse(v.released || v.firstAired);
    const s = Number(v.season);
    if (!t || t <= now || !s) continue;
    if (!next || t < next.t) next = { t, season: s, episode: Number(v.episode ?? v.number) };
  }
  return next ? { nextEp: { date: new Date(next.t).toISOString(), season: next.season, episode: next.episode } } : {};
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

export const THIS_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: 30 }, (_, i) => String(THIS_YEAR - i));

// ---------- ids ----------

/** True for a bare TMDB numeric id (e.g. from /watch/movie/1078605). */
export const isTmdbId = (id) => /^\d+$/.test(String(id));

// ---------- multi-page helpers ----------

/** Fetch several 50-item pages of one catalog in parallel and dedupe. */
export async function catalogPages(type, opts = {}, pages = 2) {
  const res = await Promise.all(
    Array.from({ length: pages }, (_, i) => catalog(type, { ...opts, skip: (opts.skip || 0) + i * 50 }).catch(() => []))
  );
  const seen = new Set();
  return res.flat().filter((x) => !seen.has(x.id) && seen.add(x.id));
}

const dayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * Upcoming releases: movies and new series dated after today (from the
 * current-year catalogs), plus season premieres of popular shows.
 * Returns [{ ...item, date, kind: 'movie'|'series'|'season', season? }] sorted by date.
 */
export async function comingSoon() {
  const today = dayStart();
  const year = String(THIS_YEAR);
  const [movies, series, popular] = await Promise.all([
    catalogPages('movie', { list: 'year', genre: year }, 5),
    catalogPages('tv', { list: 'year', genre: year }, 3),
    catalogPages('tv', { list: 'top' }, 3),
  ]);
  const out = [];
  const seen = new Set();
  const push = (x) => !seen.has(x.id) && seen.add(x.id) && out.push(x);
  for (const m of movies) {
    const t = Date.parse(m.released);
    if (t && t >= today) push({ ...m, date: m.released, kind: 'movie' });
  }
  for (const s of series) {
    const t = Date.parse(s.released);
    if (t && t >= today) push({ ...s, date: s.released, kind: 'series' });
    else if (s.nextEp?.episode === 1) push({ ...s, date: s.nextEp.date, kind: 'season', season: s.nextEp.season });
  }
  for (const s of popular) {
    if (s.nextEp?.episode === 1) push({ ...s, date: s.nextEp.date, kind: 'season', season: s.nextEp.season });
  }
  out.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  // Announced for this year but no date yet (no rating = not out).
  const tba = movies.filter((m) => !m.released && !m.rating && m.background && !seen.has(m.id)).slice(0, 8);
  return [...out, ...tba.map((m) => ({ ...m, date: null, kind: 'movie' }))];
}

/** Movies released in the last `days` days, newest first. */
export async function newReleases(days = 75) {
  const now = Date.now();
  const from = now - days * 864e5;
  const [a, b] = await Promise.all([
    catalogPages('movie', { list: 'year', genre: String(THIS_YEAR) }, 4),
    catalogPages('movie', { list: 'year', genre: String(THIS_YEAR - 1) }, 1),
  ]);
  return [...a, ...b]
    .filter((m) => {
      const t = Date.parse(m.released);
      return t && t <= now && t >= from;
    })
    .sort((x, y) => Date.parse(y.released) - Date.parse(x.released));
}

/** True if a title hasn't been released yet. */
export const isUpcoming = (it) => {
  const d = it?.date || it?.released;
  if (it?.kind === 'season') return Date.parse(it.date) > Date.now();
  return d ? Date.parse(d) > Date.now() : it?.kind === 'movie' && it?.date === null;
};

/** "Dec 18", "Friday", "Tomorrow", "Today" */
export function releaseLabel(date) {
  if (!date) return 'Coming soon';
  const t = new Date(date);
  const days = Math.round((new Date(t).setHours(0, 0, 0, 0) - dayStart()) / 864e5);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return t.toLocaleDateString(undefined, { weekday: 'long' });
  return t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Netflix-style "97% Match" from the IMDb rating (+ a bump for liked genres). */
export function matchScore(item, likedGenres) {
  if (!item?.rating) return null;
  let s = Math.round(38 + item.rating * 7);
  if (likedGenres && item.genres?.some((g) => likedGenres.has(g))) s += 4;
  return Math.max(55, Math.min(99, s));
}
