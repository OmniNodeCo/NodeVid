import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { catalog, comingSoon, isUpcoming, newReleases, releaseLabel, sized } from '../lib/catalog.js';
import { kidSafe } from '../lib/categories.js';
import { vidsrcLatest } from '../lib/servers.js';
import { activeProfile, inList, toggleList, useList, useProfiles, useProgress, watchHref } from '../lib/store.js';
import Img from '../components/Img.jsx';
import { RemindButton } from '../components/Preview.jsx';
import { PosterCard, Top10Card } from '../components/Card.jsx';
import * as I from '../components/Icons.jsx';

const TABS = [
  { id: 'coming', label: 'Coming Soon', emoji: '🍿' },
  { id: 'new', label: 'New Releases', emoji: '✨' },
  { id: 'watching', label: "Everyone's Watching", emoji: '🔥' },
  { id: 'top-tv', label: 'Top 10 TV Shows', emoji: '🔟' },
  { id: 'top-movies', label: 'Top 10 Movies', emoji: '🔟' },
  { id: 'episodes', label: 'New Episodes', emoji: '📺' },
];

function DateCol({ date }) {
  if (!date)
    return (
      <div className="cs-date">
        <span className="cs-month">TBA</span>
      </div>
    );
  const d = new Date(date);
  return (
    <div className="cs-date">
      <span className="cs-month">{d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span>
      <span className="cs-day">{d.getDate()}</span>
    </div>
  );
}

/** Big landscape entry used by Coming Soon / Everyone's Watching / New Releases. */
function Feature({ item, showDate, label }) {
  const list = useList();
  const progress = useProgress();
  const upcoming = isUpcoming(item);
  const saved = inList(list, item.id, item.type);
  const date = item.date || item.released;
  return (
    <article className="cs-item">
      {showDate && <DateCol date={date} />}
      <div className="cs-card">
        <Link to={`/${item.type}/${item.id}`} className="cs-img">
          <Img srcs={[...sized(item.background, 'large'), ...sized(item.poster, 'medium')]} alt="" loading="lazy" fallback={<div className="card-fallback">{item.title}</div>} />
          <span className="cs-img-shade" />
          {item.logo ? (
            <Img className="cs-logo" srcs={sized(item.logo, 'medium')} alt={item.title} loading="lazy" fallback={<span className="cs-name">{item.title}</span>} />
          ) : (
            <span className="cs-name">{item.title}</span>
          )}
        </Link>
        <div className="cs-body">
          <div className="cs-actions">
            {upcoming ? (
              <RemindButton item={item} className="cs-act" label />
            ) : (
              <Link to={watchHref(item.type, item.id, progress)} className="cs-act">
                <I.Play width={18} height={18} />
                <span>Play</span>
              </Link>
            )}
            <button className="cs-act" onClick={() => toggleList(item, item.type)}>
              {saved ? <I.Check width={18} height={18} /> : <I.Plus width={18} height={18} />}
              <span>My List</span>
            </button>
            <Link to={`/${item.type}/${item.id}`} className="cs-act">
              <I.Info width={18} height={18} />
              <span>Info</span>
            </Link>
          </div>
          <div className="cs-when">
            {label ||
              (upcoming
                ? item.kind === 'season'
                  ? `Season ${item.season} coming ${releaseLabel(date)}`
                  : date
                    ? `Coming ${releaseLabel(date) === 'Today' ? 'today' : `on ${new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`}`
                    : 'Release date to be announced'
                : item.released
                  ? `Released ${new Date(item.released).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`
                  : item.type === 'tv'
                    ? 'Series'
                    : 'Movie')}
          </div>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <div className="cs-genres">
            {item.kind === 'season' && <span className="cs-tag">New Season</span>}
            {item.kind === 'series' && <span className="cs-tag">New Series</span>}
            {item.genres.slice(0, 4).map((g) => (
              <span key={g}>{g}</span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function useLoad(fn, key) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    fn()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { data, error };
}

const Skeleton = () => (
  <div className="cs-list">
    {Array.from({ length: 3 }, (_, i) => (
      <div className="cs-item" key={i}>
        <div className="cs-card">
          <div className="cs-img skeleton" />
        </div>
      </div>
    ))}
  </div>
);

function Tab({ tab, kids }) {
  const filt = (arr) => (kids ? arr.filter(kidSafe) : arr);
  const loaders = {
    coming: comingSoon,
    new: () => newReleases(),
    watching: async () => {
      const [m, t] = await Promise.all([catalog('movie'), catalog('tv')]);
      const out = [];
      for (let i = 0; i < 10; i++) out.push(t[i], m[i]);
      return out.filter(Boolean);
    },
    'top-tv': () => catalog('tv', { list: 'top' }),
    'top-movies': () => catalog('movie', { list: 'top' }),
    episodes: () => vidsrcLatest('episodes'),
  };
  const { data, error } = useLoad(loaders[tab], tab);
  const items = useMemo(() => (data ? filt(data) : null), [data, kids]);

  if (error) return <p className="empty">Couldn&apos;t load: {error}</p>;
  if (!items) return <Skeleton />;
  if (!items.length) return <p className="empty">Nothing here right now — check back soon.</p>;

  if (tab === 'top-tv' || tab === 'top-movies') {
    return (
      <div className="top10-grid">
        {items.slice(0, 10).map((it, i) => (
          <Top10Card key={it.id} item={it} rank={i + 1} />
        ))}
      </div>
    );
  }
  if (tab === 'episodes') {
    return (
      <div className="grid">
        {items.map((it) => (
          <PosterCard key={it.id} item={it} href={`/watch/tv/${it.id}/${it.season}/${it.episode}`} sub={`S${it.season} E${it.episode}`} badge={it.quality} />
        ))}
      </div>
    );
  }
  return (
    <div className="cs-list">
      {items.slice(0, 40).map((it, i) => (
        <Feature key={`${it.id}-${it.season || ''}`} item={it} showDate={tab === 'coming'} label={tab === 'watching' ? `#${i + 1} today · ${it.type === 'tv' ? 'Series' : 'Movie'}` : null} />
      ))}
    </div>
  );
}

export default function NewPopular() {
  const [sp, setSp] = useSearchParams();
  const tab = TABS.some((t) => t.id === sp.get('tab')) ? sp.get('tab') : 'coming';
  const me = activeProfile(useProfiles());

  useEffect(() => {
    document.title = 'New & Popular — NodeVid';
  }, []);

  return (
    <div className="container page-pad newpop">
      <h1 className="page-title">New &amp; Popular</h1>
      <div className="np-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === tab} className={`np-tab ${t.id === tab ? 'active' : ''}`} onClick={() => setSp(t.id === 'coming' ? {} : { tab: t.id }, { replace: true })}>
            <span aria-hidden="true">{t.emoji}</span> {t.label}
          </button>
        ))}
      </div>
      <Tab key={tab} tab={tab} kids={me.kids} />
    </div>
  );
}
