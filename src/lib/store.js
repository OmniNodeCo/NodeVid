// Small localStorage-backed stores with React bindings.
import { useSyncExternalStore } from 'react';

function createStore(key, initial) {
  let state;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) state = initial;
    else {
      const parsed = JSON.parse(raw);
      state = Array.isArray(initial) ? (Array.isArray(parsed) ? parsed : initial) : { ...initial, ...parsed };
    }
  } catch {
    state = initial;
  }
  const listeners = new Set();
  const persist = () => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* quota / private mode */
    }
  };
  const store = {
    get: () => state,
    set(next) {
      state = typeof next === 'function' ? next(state) : next;
      persist();
      listeners.forEach((l) => l());
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
  // Keep tabs in sync.
  window.addEventListener('storage', (e) => {
    if (e.key !== key) return;
    try {
      state = e.newValue ? JSON.parse(e.newValue) : initial;
      listeners.forEach((l) => l());
    } catch {
      /* ignore */
    }
  });
  return store;
}

export const DEFAULT_SETTINGS = {
  color: '8b6cff',
  autoPlay: true,
  nextEpisode: true,
  episodeSelector: true,
  autoNext: true,
  server: 'vidking',
  autoServer: true,
  minHD: true,
  subLang: '',
};

export const settingsStore = createStore('nv2:settings', DEFAULT_SETTINGS);
export const listStore = createStore('nv2:list', []);
export const progressStore = createStore('nv2:progress', {});

const useStore = (s) => useSyncExternalStore(s.subscribe, s.get);
export const useSettings = () => useStore(settingsStore);
export const useList = () => useStore(listStore);
export const useProgress = () => useStore(progressStore);

// ---------- My List ----------

export const slim = (item, type) => ({
  id: item.id,
  type: type || item.type,
  title: item.title || '',
  poster: item.poster || null,
  background: item.background || null,
  logo: item.logo || null,
  rating: item.rating || 0,
  year: item.year || '',
  tmdbId: item.tmdbId || null,
});

export function toggleList(item, type) {
  listStore.set((list) => {
    const exists = list.some((x) => x.id === item.id && x.type === type);
    return exists ? list.filter((x) => !(x.id === item.id && x.type === type)) : [{ ...slim(item, type), addedAt: Date.now() }, ...list];
  });
}

export const inList = (list, id, type) => list.some((x) => String(x.id) === String(id) && x.type === type);

// ---------- Watch progress ----------

export const progressKey = (type, id) => `${type}:${id}`;

/** Record playback progress reported by the player. */
export function saveProgress(meta, { season, episode, time, duration }) {
  if (!duration || !isFinite(duration) || duration < 30) return;
  const key = progressKey(meta.type, meta.id);
  progressStore.set((all) => {
    const prev = all[key] || {};
    const pct = Math.min(100, (time / duration) * 100);
    const entry = {
      ...prev,
      ...slim(meta, meta.type),
      time,
      duration,
      progress: pct,
      updatedAt: Date.now(),
    };
    if (meta.type === 'tv') {
      entry.season = season;
      entry.episode = episode;
      entry.episodes = { ...(prev.episodes || {}), [`${season}:${episode}`]: { time, duration, progress: pct } };
    }
    return { ...all, [key]: entry };
  });
}

/** Mark a title/episode as started (so it shows up even before the player reports time). */
export function touchProgress(meta, season, episode) {
  const key = progressKey(meta.type, meta.id);
  progressStore.set((all) => {
    const prev = all[key] || {};
    const sameEp = meta.type !== 'tv' || (prev.season === season && prev.episode === episode);
    const epData = meta.type === 'tv' ? prev.episodes?.[`${season}:${episode}`] : null;
    return {
      ...all,
      [key]: {
        ...prev,
        ...slim(meta, meta.type),
        ...(meta.type === 'tv' ? { season, episode } : {}),
        ...(sameEp ? {} : { time: epData?.time || 0, duration: epData?.duration || 0, progress: epData?.progress || 0 }),
        updatedAt: Date.now(),
      },
    };
  });
}

export function removeProgress(type, id) {
  progressStore.set((all) => {
    const next = { ...all };
    delete next[progressKey(type, id)];
    return next;
  });
}

export function getResumeTime(type, id, season, episode) {
  const entry = progressStore.get()[progressKey(type, id)];
  if (!entry) return 0;
  const p = type === 'tv' ? entry.episodes?.[`${season}:${episode}`] : entry;
  if (!p || !p.time || p.progress > 95) return 0;
  return Math.max(0, Math.floor(p.time - 3));
}

/** Items for the "Continue Watching" row, most recent first. */
export function continueList(all) {
  return Object.values(all)
    .filter((e) => e.type === 'tv' || !e.duration || e.progress < 95)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
