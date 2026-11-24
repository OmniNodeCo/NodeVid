// Catalog + streams, backed only by the curated public-domain / openly
// licensed library in ./library.js and the Internet Archive's public APIs.
// No API key, no third-party embeds: video files are played directly from
// archive.org with the browser's own <video> element.

import { COMING_PD, LIBRARY, LICENSES, PD_DAY } from './library.js';

const IA = 'https://archive.org';

/** archive.org thumbnail for an item. */
export const thumb = (id) => (id ? `${IA}/services/img/${encodeURIComponent(id)}` : null);
/** Public page for an item on archive.org. */
export const archiveUrl = (id) => `${IA}/details/${encodeURIComponent(id)}`;
/** Direct file URL. */
export const fileUrl = (id, name) => `${IA}/download/${encodeURIComponent(id)}/${name.split('/').map(encodeURIComponent).join('/')}`;

/** Kept for compatibility with components that ask for bigger image sizes. */
export function sized(url) {
  return url ? [url] : [];
}

// ---------- items ----------

const archiveIdOf = (e) => e.item || e.episodes?.[0]?.id || e.id;

/** Turn a library entry into the item shape the UI uses. */
export function normalize(e) {
  if (!e) return null;
  if (e.__item) return e.__item;
  const img = thumb(e.poster || archiveIdOf(e));
  const lic = e.license || 'pd';
  const item = {
    id: e.id,
    type: e.type,
    title: e.title,
    poster: img,
    background: img,
    logo: null,
    year: e.year ? String(e.year) : '',
    yearRange: e.yearRange || (e.year ? String(e.year) : ''),
    rating: 0,
    genres: e.genres || [],
    description: e.desc || '',
    runtime: e.runtime || '',
    released: e.date || null,
    kids: Boolean(e.kids),
    license: lic,
    licenseLabel: LICENSES[lic]?.label,
    credit: e.credit || null,
    archiveId: archiveIdOf(e),
    start: e.start || 0,
    episodeCount: e.episodes?.length || null,
    trailer: null,
    ...(e.upcoming ? { date: e.date, kind: 'movie', upcoming: true } : {}),
  };
  Object.defineProperty(e, '__item', { value: item, enumerable: false });
  return item;
}

const COMING = COMING_PD.map((c) => ({ ...c, type: 'movie', date: PD_DAY, upcoming: true, runtime: '' }));
const BY_ID = new Map([...LIBRARY, ...COMING].map((e) => [e.id, e]));

/** Library entry by id (including Coming Soon titles). */
export const getEntry = (id) => BY_ID.get(String(id)) || null;
/** Normalized item by id. */
export const getItem = (id) => normalize(getEntry(id));

export const ALL = LIBRARY.map(normalize);
export const COUNTS = {
  movies: ALL.filter((x) => x.type === 'movie').length,
  series: ALL.filter((x) => x.type === 'tv').length,
  episodes: LIBRARY.reduce((n, e) => n + (e.episodes?.length || 0), 0),
};

// ---------- popularity (real Internet Archive download counts) ----------

const STATS_KEY = 'nv2:iastats';
let statsPromise = null;

/**
 * Download counts for every library item: { [libraryId]: { all, week } }.
 * One or two small search API calls, cached for 12h in localStorage.
 */
export function loadStats() {
  if (statsPromise) return statsPromise;
  try {
    const c = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
    if (c && Date.now() - c.at < 12 * 36e5 && c.v === 2) return (statsPromise = Promise.resolve(c.stats));
  } catch {
    /* ignore */
  }
  const owner = new Map();
  for (const e of LIBRARY) for (const id of e.episodes ? e.episodes.map((x) => x.id) : [archiveIdOf(e)]) owner.set(id, e.id);
  const ids = [...owner.keys()];
  const chunks = [];
  for (let i = 0; i < ids.length; i += 60) chunks.push(ids.slice(i, i + 60));
  statsPromise = Promise.all(
    chunks.map((c) => {
      const q = `identifier:(${c.map((i) => `"${i}"`).join(' OR ')})`;
      return fetch(`${IA}/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=downloads&fl[]=week&rows=${c.length}&output=json`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
        .then((d) => d.response?.docs || []);
    })
  )
    .then((pages) => {
      const stats = {};
      for (const d of pages.flat()) {
        const id = owner.get(d.identifier);
        if (!id) continue;
        const s = (stats[id] ||= { all: 0, week: 0 });
        s.all += Number(d.downloads) || 0;
        s.week += Number(d.week) || 0;
      }
      try {
        localStorage.setItem(STATS_KEY, JSON.stringify({ v: 2, at: Date.now(), stats }));
      } catch {
        /* ignore */
      }
      return stats;
    })
    .catch(() => {
      statsPromise = null;
      return {};
    });
  return statsPromise;
}

/** Wait for stats, but never longer than `ms` (falls back to curated order). */
const statsSoon = (ms = 2500) => Promise.race([loadStats(), new Promise((r) => setTimeout(() => r({}), ms))]);

const order = new Map(LIBRARY.map((e, i) => [e.id, i]));
function sortBy(list, how, stats) {
  const s = (x, k) => stats?.[x.id]?.[k] ?? -1;
  const arr = [...list];
  if (how === 'week') arr.sort((a, b) => s(b, 'week') - s(a, 'week') || s(b, 'all') - s(a, 'all'));
  else if (how === 'newest') arr.sort((a, b) => Number(b.year) - Number(a.year));
  else if (how === 'oldest') arr.sort((a, b) => Number(a.year) - Number(b.year));
  else if (how === 'az') arr.sort((a, b) => a.title.localeCompare(b.title));
  else arr.sort((a, b) => s(b, 'all') - s(a, 'all') || order.get(a.id) - order.get(b.id));
  return arr;
}

/**
 * Query the library.
 * @param {'movie'|'tv'|undefined} type
 * @param {{ list?: 'top'|'week'|'newest'|'oldest'|'az'|'year'|'decade', genre?: string, filter?: (x)=>boolean, skip?: number, limit?: number }} opts
 */
export async function catalog(type, { list = 'top', genre, filter, skip = 0, limit = 60 } = {}) {
  let items = ALL.filter((x) => !type || x.type === type);
  if (list === 'year' && genre) items = items.filter((x) => x.year === String(genre));
  else if (list === 'decade' && genre) items = items.filter((x) => decadeOf(x) === String(genre));
  else if (genre) items = items.filter((x) => x.genres.includes(genre));
  if (filter) items = items.filter(filter);
  const how = list === 'year' || list === 'decade' ? 'top' : list;
  const stats = how === 'top' || how === 'week' ? await statsSoon() : null;
  return sortBy(items, how, stats).slice(skip, skip + limit);
}

/** Search titles, descriptions, genres and years. */
export async function searchAll(query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored = [];
  for (const x of ALL) {
    const title = x.title.toLowerCase();
    const hay = `${title} ${x.description.toLowerCase()} ${x.genres.join(' ').toLowerCase()} ${x.year}`;
    if (!words.every((w) => hay.includes(w))) continue;
    const q = words.join(' ');
    const score = title === q ? 4 : title.startsWith(q) ? 3 : title.includes(q) ? 2 : 1;
    scored.push([score, x]);
  }
  const stats = await statsSoon(1200);
  return scored.sort((a, b) => b[0] - a[0] || (stats[b[1].id]?.all || 0) - (stats[a[1].id]?.all || 0)).map((s) => s[1]);
}

export const decadeOf = (x) => (x.year ? `${String(x.year).slice(0, 3)}0s` : '');

export const GENRES = [...new Set(ALL.flatMap((x) => x.genres))].sort();
export const MOVIE_GENRES = [...new Set(ALL.filter((x) => x.type === 'movie').flatMap((x) => x.genres))].sort();
export const TV_GENRES = [...new Set(ALL.filter((x) => x.type === 'tv').flatMap((x) => x.genres))].sort();
export const DECADES = [...new Set(ALL.map(decadeOf).filter(Boolean))].sort();
export const THIS_YEAR = new Date().getFullYear();

// ---------- archive.org metadata & stream selection ----------

const metaCache = new Map();
/** archive.org item metadata (files, etc.). CORS-enabled, cached. */
export function iaMetadata(id) {
  if (!metaCache.has(id)) {
    const p = fetch(`${IA}/metadata/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`archive.org error ${r.status}`))))
      .then((d) => {
        if (!d || !d.files) throw new Error('Item not found on archive.org');
        return d;
      });
    p.catch(() => metaCache.delete(id));
    metaCache.set(id, p);
  }
  return metaCache.get(id);
}

// Browser-friendly formats, best first.
const FORMAT_RANK = { 'h.264 IA': 6, 'h.264': 6, 'h.264 HD': 6, 'MPEG4': 4, 'h.264 MPEG4': 4, '512Kb MPEG4': 3, '256Kb MPEG4': 2, 'WebM': 2, 'Ogg Video': 1 };
const PLAYABLE = /\.(mp4|m4v|webm|ogv)$/i;

/**
 * Group an item's files into playable videos:
 * [{ key, title, length, sources: [{ src, type, height, format }] }]
 */
export function playableVideos(id, files) {
  const groups = new Map();
  for (const f of files) {
    if (!PLAYABLE.test(f.name) || !(f.format in FORMAT_RANK)) continue;
    if (/(^|\/)(sample|trailer)/i.test(f.name)) continue;
    const key = (f.source === 'derivative' && f.original) || f.name;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  const out = [];
  for (const [key, fs] of groups) {
    fs.sort((a, b) => FORMAT_RANK[b.format] - FORMAT_RANK[a.format] || (Number(b.height) || 0) - (Number(a.height) || 0));
    const length = Math.max(...fs.map((f) => parseLength(f.length)));
    out.push({
      key,
      title: key.replace(/\.[a-z0-9]+$/i, '').replace(/^.*\//, ''),
      length,
      sources: fs.map((f) => ({
        src: fileUrl(id, f.name),
        type: /\.ogv$/i.test(f.name) ? 'video/ogg' : /\.webm$/i.test(f.name) ? 'video/webm' : 'video/mp4',
        height: Number(f.height) || 0,
        format: f.format,
      })),
    });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
}

function parseLength(v) {
  if (!v) return 0;
  if (String(v).includes(':')) return String(v).split(':').reduce((t, n) => t * 60 + Number(n), 0);
  return Number(v) || 0;
}

/** Pretty episode title from a file name like "Show - s01e04 - The Dark Room". */
function episodeTitle(name, series) {
  let t = name
    .replace(/\(\d{4}\)/g, '')
    .replace(/[._]+/g, ' ')
    .trim();
  const words = series.title.split(/[\s:(]+/)[0];
  t = t.replace(new RegExp(`^${words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^-]*?(?=\\b(s\\d+e\\d+|e\\d+|\\d+)\\b)`, 'i'), '');
  t = t.replace(/^\s*[-–]?\s*(s\d+\s*e\d+|e\d+|\d+)\s*[-–.]?\s*/i, '');
  return t.replace(/\s+/g, ' ').replace(/^[-–\s]+|[-–\s]+$/g, '') || name;
}

/**
 * Full metadata for a title. For series this includes `videos`
 * ([{ season, episode, title, id, file, thumbnail }]) like before.
 */
export async function meta(type, id) {
  const e = getEntry(id);
  if (!e) throw new Error('This title isn\u2019t in the NodeVid library.');
  if (e.type !== 'tv') return e;
  if (e.episodes) {
    return {
      ...e,
      videos: e.episodes.map((x, i) => ({ season: 1, episode: x.episode || i + 1, title: x.title, name: x.title, id: x.id, released: x.year ? `${x.year}-01-01` : null, thumbnail: thumb(x.id) })),
    };
  }
  const m = await iaMetadata(e.item);
  const vids = playableVideos(e.item, m.files).filter((v) => !(e.skip && e.skip.test(v.key)));
  return {
    ...e,
    videos: vids.map((v, i) => {
      const se = v.key.match(/s(\d+)\s*e(\d+)/i);
      return {
        season: se ? Number(se[1]) || 1 : 1,
        episode: se ? Number(se[2]) : i + 1,
        title: episodeTitle(v.title, e),
        name: episodeTitle(v.title, e),
        id: e.item,
        file: v.key,
        runtime: v.length ? `${Math.round(v.length / 60)} min` : '',
        thumbnail: thumb(e.item),
      };
    }),
  };
}

/** Group a series' videos into seasons: [{ season, episodes: [...] }] */
export function seasonsOf(m) {
  const map = new Map();
  for (const v of m?.videos || []) {
    const s = Number(v.season);
    const ep = Number(v.episode ?? v.number);
    if (!Number.isFinite(s) || !Number.isFinite(ep)) continue;
    if (!map.has(s)) map.set(s, []);
    map.get(s).push({ ...v, season: s, episode: ep });
  }
  return [...map.entries()].map(([season, eps]) => ({ season, episodes: eps.sort((a, b) => a.episode - b.episode) })).sort((a, b) => a.season - b.season);
}

/**
 * Resolve the actual video for a movie or an episode.
 * Returns { archiveId, sources: [{src,type,height,format}], length, title }.
 */
export async function resolveStream(type, id, season, episode) {
  const e = getEntry(id);
  if (!e || e.upcoming) throw new Error('This title isn\u2019t available to stream.');
  let archiveId = e.id;
  let file = null;
  let epInfo = null;
  if (e.type === 'tv') {
    const m = await meta('tv', id);
    epInfo = m.videos.find((v) => Number(v.season) === Number(season) && Number(v.episode) === Number(episode));
    if (!epInfo) throw new Error('Episode not found.');
    archiveId = epInfo.id;
    file = epInfo.file || null;
  }
  const md = await iaMetadata(archiveId);
  const vids = playableVideos(archiveId, md.files);
  if (!vids.length) throw new Error('No browser-playable video found for this title on archive.org.');
  // Movies: the main feature is the longest video in the item.
  const pick = file ? vids.find((v) => v.key === file) : [...vids].sort((a, b) => b.length - a.length)[0];
  if (!pick) throw new Error('Video file not found on archive.org.');
  return { archiveId, sources: pick.sources, length: pick.length, title: epInfo?.title || e.title, episode: epInfo };
}

// ---------- Coming Soon: Public Domain Day ----------

/** Films joining the US public domain on Jan 1 (not streamable before then). */
export async function comingSoon() {
  return COMING.map(normalize);
}

const dayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** True if a title hasn't been released yet. */
export const isUpcoming = (it) => Boolean(it?.upcoming) && Date.parse(it.date) > Date.now();

/** "Jan 1", "Friday", "Tomorrow", "Today" */
export function releaseLabel(date) {
  if (!date) return 'Coming soon';
  const t = new Date(date);
  const days = Math.round((new Date(t).setHours(0, 0, 0, 0) - dayStart()) / 864e5);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return t.toLocaleDateString(undefined, { weekday: 'long' });
  return t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Netflix-style "% Match" — based on genres you've liked (no ratings data). */
export function matchScore(item, likedGenres) {
  if (!likedGenres || !likedGenres.size || !item?.genres?.length) return null;
  const hits = item.genres.filter((g) => likedGenres.has(g)).length;
  if (!hits) return null;
  return Math.min(98, 80 + hits * 6);
}
