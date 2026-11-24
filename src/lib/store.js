// Small localStorage-backed stores with React bindings.
import { useSyncExternalStore } from 'react';

function read(key, initial) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return initial;
    const parsed = JSON.parse(raw);
    return Array.isArray(initial) ? (Array.isArray(parsed) ? parsed : initial) : { ...initial, ...parsed };
  } catch {
    return initial;
  }
}

function createStore(key, initial) {
  let state = read(key, initial);
  const listeners = new Set();
  const persist = () => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* quota / private mode */
    }
  };
  const emit = () => listeners.forEach((l) => l());
  const store = {
    get: () => state,
    set(next) {
      state = typeof next === 'function' ? next(state) : next;
      persist();
      emit();
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    /** Point the store at another localStorage key (profile switch). */
    rebind(nextKey) {
      key = nextKey;
      state = read(key, initial);
      emit();
    },
  };
  // Keep tabs in sync.
  window.addEventListener('storage', (e) => {
    if (e.key !== key) return;
    try {
      state = e.newValue ? JSON.parse(e.newValue) : initial;
      emit();
    } catch {
      /* ignore */
    }
  });
  return store;
}

// ---------- Profiles ----------

export const AVATARS = ['#e50914', '#2f80ed', '#f2b01e', '#27ae60', '#9b51e0', '#ff6f91', '#00b8a9', '#f2994a'];
export const profilesStore = createStore('nv2:profiles', {
  list: [{ id: 'main', name: 'You', avatar: 0, kids: false }],
  active: 'main',
});
export const useProfiles = () => useSyncExternalStore(profilesStore.subscribe, profilesStore.get);

// Per-profile data lives under 'nv3:' since the switch to the public-domain
// library (older 'nv2:' lists pointed at titles that are no longer offered).
const prefixFor = (pid) => (pid === 'main' ? 'nv3:' : `nv3:${pid}:`);
let prefix = prefixFor(profilesStore.get().active);

export function activeProfile(state = profilesStore.get()) {
  return state.list.find((p) => p.id === state.active) || state.list[0];
}

export function switchProfile(pid) {
  sessionStorage.setItem('nv2:picked', '1');
  if (pid === profilesStore.get().active) return;
  profilesStore.set((s) => ({ ...s, active: pid }));
  prefix = prefixFor(pid);
  for (const [name, st] of Object.entries(perProfile)) st.rebind(prefix + name);
}

export function saveProfile(p) {
  profilesStore.set((s) => {
    const exists = s.list.some((x) => x.id === p.id);
    return { ...s, list: exists ? s.list.map((x) => (x.id === p.id ? { ...x, ...p } : x)) : [...s.list, p] };
  });
}

export function deleteProfile(pid) {
  if (pid === 'main') return;
  for (const name of Object.keys(perProfile)) localStorage.removeItem(prefixFor(pid) + name);
  if (profilesStore.get().active === pid) switchProfile('main');
  profilesStore.set((s) => ({ ...s, list: s.list.filter((x) => x.id !== pid) }));
}

/** Show "Who's watching?" once per browser session when there are several profiles. */
export const needsProfilePick = () => profilesStore.get().list.length > 1 && !sessionStorage.getItem('nv2:picked');

export const DEFAULT_SETTINGS = {
  previews: true,
  autoPlay: true,
  autoNext: true,
  quality: 'auto',
};

export const settingsStore = createStore('nv2:settings', DEFAULT_SETTINGS);
export const listStore = createStore(prefix + 'list', []);
export const progressStore = createStore(prefix + 'progress', {});
export const remindStore = createStore(prefix + 'reminders', []);
export const ratingStore = createStore(prefix + 'ratings', {});
export const seenStore = createStore(prefix + 'seen', []);
const perProfile = { list: listStore, progress: progressStore, reminders: remindStore, ratings: ratingStore, seen: seenStore };

const useStore = (s) => useSyncExternalStore(s.subscribe, s.get);
export const useSettings = () => useStore(settingsStore);
export const useList = () => useStore(listStore);
export const useProgress = () => useStore(progressStore);
export const useReminders = () => useStore(remindStore);
export const useRatings = () => useStore(ratingStore);
export const useSeen = () => useStore(seenStore);

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
  kids: Boolean(item.kids),
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

/** Where "Play" should go: resume the last episode for series. */
export function watchHref(type, id, progress, firstSeason = 1) {
  if (type === 'movie') return `/watch/movie/${id}`;
  const p = progress?.[progressKey('tv', id)];
  return p ? `/watch/tv/${id}/${p.season}/${p.episode}` : `/watch/tv/${id}/${firstSeason}/1`;
}

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

// ---------- Remind me ----------

export const isReminded = (list, id) => list.some((x) => String(x.id) === String(id));

export function toggleReminder(item) {
  remindStore.set((list) =>
    isReminded(list, item.id)
      ? list.filter((x) => String(x.id) !== String(item.id))
      : [{ ...slim(item, item.type), date: item.date || item.released || null, kind: item.kind || null, season: item.season || null, addedAt: Date.now() }, ...list]
  );
}

// ---------- Ratings (thumbs) ----------

/** value: 1 = like, 2 = love, -1 = not for me, 0 = clear */
export function rate(item, value) {
  ratingStore.set((all) => {
    const next = { ...all };
    const k = progressKey(item.type, item.id);
    if (!value || all[k]?.value === value) delete next[k];
    else next[k] = { ...slim(item, item.type), genres: item.genres || [], value, at: Date.now() };
    return next;
  });
}

export const ratingOf = (all, item) => all[progressKey(item.type, item.id)]?.value || 0;

/** Genres from liked titles, for "Match" scores and recommendations. */
export function likedGenres(all) {
  const set = new Set();
  Object.values(all).forEach((r) => r.value > 0 && (r.genres || []).forEach((g) => set.add(g)));
  return set;
}

// ---------- Notifications ----------

export function markSeen(keys) {
  seenStore.set((seen) => [...new Set([...keys, ...seen])].slice(0, 300));
}
