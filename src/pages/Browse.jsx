import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Hero from '../components/Hero.jsx';
import { PosterCard } from '../components/Card.jsx';
import { catalog, decadeOf, ALL } from '../lib/catalog.js';
import { kidSafe } from '../lib/categories.js';
import { activeProfile, useProfiles } from '../lib/store.js';

const SORTS = [
  { id: 'top', label: 'Most Watched' },
  { id: 'week', label: 'Trending' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'newest', label: 'Newest First' },
  { id: 'az', label: 'A–Z' },
];

const CONFIG = {
  movie: { title: 'Movies', type: 'movie' },
  tv: { title: 'Series & Shorts', type: 'tv' },
  animation: { title: 'Animation', type: undefined, fixedGenre: 'Animation' },
};

export default function Browse({ kind }) {
  const cfg = CONFIG[kind];
  const [sp, setSp] = useSearchParams();
  const [hero, setHero] = useState(null);
  const [items, setItems] = useState(null);
  const me = activeProfile(useProfiles());
  const sort = SORTS.some((s) => s.id === sp.get('sort')) ? sp.get('sort') : 'top';
  const genre = sp.get('genre') || '';
  const decade = sp.get('decade') || '';

  const pool = useMemo(() => ALL.filter((x) => (!cfg.type || x.type === cfg.type) && (!cfg.fixedGenre || x.genres.includes(cfg.fixedGenre)) && (!me.kids || kidSafe(x))), [cfg, me.kids]);
  const genres = useMemo(() => [...new Set(pool.flatMap((x) => x.genres))].filter((g) => g !== cfg.fixedGenre).sort(), [pool, cfg]);
  const decades = useMemo(() => [...new Set(pool.map(decadeOf).filter(Boolean))].sort(), [pool]);

  useEffect(() => {
    document.title = `${cfg.title} — NodeVid`;
  }, [cfg]);

  useEffect(() => {
    setHero(null);
    catalog(cfg.type, { genre: cfg.fixedGenre, filter: (x) => !x.genres.includes('Short') && (!me.kids || kidSafe(x)) })
      .then(setHero)
      .catch(() => setHero([]));
  }, [kind, me.kids]);

  useEffect(() => {
    let alive = true;
    setItems(null);
    const filter = (x) => (!cfg.fixedGenre || x.genres.includes(cfg.fixedGenre)) && (!me.kids || kidSafe(x)) && (!genre || x.genres.includes(genre)) && (!decade || decadeOf(x) === decade);
    catalog(cfg.type, { list: sort, filter, limit: 500 }).then((r) => alive && setItems(r));
    return () => {
      alive = false;
    };
  }, [kind, sort, genre, decade, me.kids]);

  const update = (patch) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setSp(next, { replace: true });
  };

  return (
    <div>
      <Hero items={hero} />
      <div className="container browse">
        <div className="browse-head">
          <h1>{cfg.title}</h1>
          <div className="browse-controls">
            <select className="select" value={decade} onChange={(e) => update({ decade: e.target.value })} aria-label="Decade">
              <option value="">All decades</option>
              {decades.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select className="select" value={sort} onChange={(e) => update({ sort: e.target.value === 'top' ? '' : e.target.value })} aria-label="Sort">
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="chips">
          <button className={`chip ${!genre ? 'active' : ''}`} onClick={() => update({ genre: '' })}>
            All
          </button>
          {genres.map((g) => (
            <button key={g} className={`chip ${g === genre ? 'active' : ''}`} onClick={() => update({ genre: g === genre ? '' : g })}>
              {g}
            </button>
          ))}
        </div>

        <div className="grid">
          {(items || []).map((it) => (
            <PosterCard key={it.id} item={it} />
          ))}
          {!items &&
            Array.from({ length: 12 }, (_, i) => (
              <div className="card" key={`s${i}`}>
                <div className="card-poster skeleton" />
              </div>
            ))}
        </div>
        {items && items.length === 0 && <p className="empty">Nothing found.</p>}
      </div>
    </div>
  );
}
