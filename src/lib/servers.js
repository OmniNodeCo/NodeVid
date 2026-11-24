// Streaming servers (embed providers). Each server knows how to build its
// embed URL and how to read the progress events its player posts back.
//
// Vidking: https://www.vidking.net         (TMDB ids)
// VidSrc:  https://vidsrc.sh/vidsrc/docs/  (IMDb or TMDB ids)

const VIDKING = 'https://www.vidking.net';
const VIDSRC = 'https://vidsrc.sh';

/**
 * ctx = { type: 'movie'|'tv', imdbId, tmdbId, season, episode, progress, settings }
 * normalized event = { event: 'timeupdate'|'play'|'pause'|'ended'|'seeked',
 *                      time, duration, season, episode, ids: string[] }
 */
export const SERVERS = [
  {
    id: 'vidking',
    name: 'Vidking',
    note: 'Fast HLS player · 4K on some titles',
    canPlay: ({ imdbId, tmdbId }) => Boolean(tmdbId || imdbId),
    url({ type, imdbId, tmdbId, season, episode, progress, settings }) {
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
      return `${VIDKING}${path}?${qs}`;
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
    canPlay: ({ imdbId, tmdbId }) => Boolean(imdbId || tmdbId),
    url({ type, imdbId, tmdbId, season, episode, progress, settings }) {
      const id = imdbId || tmdbId;
      const qs = new URLSearchParams();
      if (settings.autoPlay) qs.set('autoplay', '1');
      if (type === 'tv' && settings.autoNext) qs.set('autonext', '1');
      if (progress > 0) qs.set('startAt', String(Math.floor(progress)));
      if (settings.subLang) qs.set('ds_lang', settings.subLang);
      const path = type === 'tv' ? `/embed/tv/${id}/${season}/${episode}` : `/embed/movie/${id}`;
      const q = qs.toString();
      return `${VIDSRC}${path}${q ? `?${q}` : ''}`;
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

const infoCache = new Map();

/**
 * Availability + quality for a title/episode on VidSrc.
 * Resolves to { available: boolean, quality?: string }.
 */
export function vidsrcInfo(type, id, season, episode) {
  const path = type === 'tv' && season != null && episode != null ? `tv/${id}/${season}/${episode}` : `${type === 'tv' ? 'tv' : 'movie'}/${id}`;
  if (!infoCache.has(path)) {
    infoCache.set(
      path,
      fetch(`${VIDSRC}/info/${path}.json`)
        .then(async (r) => {
          if (r.status === 404) return { available: false };
          if (!r.ok) throw new Error(String(r.status));
          const d = await r.json();
          return { available: true, quality: d.quality || '' };
        })
        .catch(() => {
          infoCache.delete(path);
          return { available: null }; // unknown (network / CORS)
        })
    );
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
  const r = await fetch(`${VIDSRC}/${kind}/latest/page-${page}.json`);
  if (!r.ok) throw new Error(`VidSrc ${r.status}`);
  const d = await r.json();
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
