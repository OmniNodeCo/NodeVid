// Notifications for the bell in the navbar: titles you asked to be reminded
// about (Public Domain Day arrivals), plus a nudge to finish what you started.
import { useMemo } from 'react';
import { getEntry, getItem } from './catalog.js';
import { useProgress, useReminders, useSeen } from './store.js';

export function useNotifications() {
  const reminders = useReminders();
  const progress = useProgress();
  const seen = useSeen();

  return useMemo(() => {
    const now = Date.now();
    const out = [];
    for (const r of reminders) {
      const t = r.date ? Date.parse(r.date) : null;
      if (t && t <= now) {
        out.push({
          key: `rel:${r.id}`,
          item: r,
          title: r.title,
          text: 'Now in the public domain',
          href: `/${r.type}/${r.id}`,
          at: t,
        });
      } else {
        out.push({
          key: `soon:${r.id}`,
          item: r,
          title: r.title,
          text: `Public domain on ${t ? new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'soon'}`,
          href: `/${r.type}/${r.id}`,
          at: t || now + 1e12,
          upcoming: true,
        });
      }
    }
    // Unfinished series: remind about the next episode.
    for (const e of Object.values(progress)) {
      if (e.type !== 'tv' || !getItem(e.id) || e.progress < 90) continue;
      const total = getEntry(e.id)?.episodes?.length;
      if (total && e.episode >= total) continue;
      out.push({
        key: `next:${e.id}:${e.season}:${e.episode}`,
        item: e,
        title: e.title,
        text: `Up next — episode ${e.episode + 1}`,
        href: `/watch/tv/${e.id}/${e.season}/${e.episode + 1}`,
        at: e.updatedAt,
      });
    }
    const seenSet = new Set(seen);
    const items = out
      .map((n) => ({ ...n, unread: !n.upcoming && !seenSet.has(n.key) }))
      .sort((a, b) => Number(Boolean(a.upcoming)) - Number(Boolean(b.upcoming)) || (a.upcoming ? a.at - b.at : b.at - a.at));
    return { items, unread: items.filter((n) => n.unread).length };
  }, [reminders, progress, seen]);
}
