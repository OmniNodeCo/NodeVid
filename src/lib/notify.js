// Notifications for the bell in the navbar:
//  - titles you asked to be reminded about that are now out (or coming up)
//  - new episodes (from VidSrc's "latest episodes" feed) of shows you're
//    watching or have in My List
import { useEffect, useMemo, useState } from 'react';
import { vidsrcLatest } from './servers.js';
import { useList, useProgress, useReminders, useSeen } from './store.js';

let feed = null;
const latestEpisodes = () => {
  if (!feed) {
    feed = Promise.all([1, 2].map((p) => vidsrcLatest('episodes', p).catch(() => [])))
      .then((pages) => pages.flat())
      .catch(() => []);
  }
  return feed;
};

export function useNotifications() {
  const reminders = useReminders();
  const progress = useProgress();
  const list = useList();
  const seen = useSeen();
  const [episodes, setEpisodes] = useState([]);

  useEffect(() => {
    let alive = true;
    latestEpisodes().then((eps) => alive && setEpisodes(eps));
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => {
    const now = Date.now();
    const out = [];
    for (const r of reminders) {
      const t = r.date ? Date.parse(r.date) : null;
      const label = r.kind === 'season' && r.season ? `Season ${r.season}` : r.type === 'tv' ? 'New series' : 'New movie';
      if (t && t <= now) {
        out.push({
          key: `rel:${r.id}:${r.season || ''}`,
          item: r,
          title: r.title,
          text: `${label} — now available`,
          href: r.type === 'tv' ? `/tv/${r.id}${r.season ? `?season=${r.season}` : ''}` : `/movie/${r.id}`,
          at: t,
        });
      } else {
        out.push({
          key: `soon:${r.id}`,
          item: r,
          title: r.title,
          text: `${label} — coming ${t ? new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'soon'}`,
          href: `/${r.type}/${r.id}`,
          at: t || now + 1e12,
          upcoming: true,
        });
      }
    }
    const followed = new Map();
    for (const e of Object.values(progress)) if (e.type === 'tv') followed.set(String(e.id), e);
    for (const e of list) if (e.type === 'tv' && !followed.has(String(e.id))) followed.set(String(e.id), e);
    const added = new Set();
    for (const ep of episodes) {
      const f = followed.get(String(ep.id));
      if (!f || added.has(ep.id)) continue;
      // Skip episodes you've already reached.
      if (f.season && (ep.season < f.season || (ep.season === f.season && ep.episode <= f.episode))) continue;
      added.add(ep.id);
      out.push({
        key: `ep:${ep.id}:${ep.season}:${ep.episode}`,
        item: { ...f, ...ep, poster: f.poster || ep.poster, background: f.background },
        title: f.title || ep.title,
        text: `New episode — S${ep.season} E${ep.episode}`,
        href: `/watch/tv/${ep.id}/${ep.season}/${ep.episode}`,
        at: now - added.size,
      });
    }
    const seenSet = new Set(seen);
    const items = out
      .map((n) => ({ ...n, unread: !n.upcoming && !seenSet.has(n.key) }))
      .sort((a, b) => Number(Boolean(a.upcoming)) - Number(Boolean(b.upcoming)) || (a.upcoming ? a.at - b.at : b.at - a.at));
    return { items, unread: items.filter((n) => n.unread).length };
  }, [reminders, progress, list, seen, episodes]);
}
