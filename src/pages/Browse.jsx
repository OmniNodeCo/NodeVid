import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Hero from '../components/Hero.jsx';
import { PosterCard } from '../components/Card.jsx';
import useInfinite from '../lib/useInfinite.js';
import { catalog, MOVIE_GENRES, TV_GENRES, YEARS } from '../lib/catalog.js';

const SORTS = [
  { id: 'top', label: 'Most Popular' },
  { id: 'imdbRating', label: 'Top Rated' },
  { id: 'year', label: 'By Year', noFixedGenre: true },
];

const CONFIG = {
  movie: { title: 'Movies', type: 'movie' },
  tv: { title: 'TV Shows', type: 'tv' },
  animation: { title: 'Animation', type: 'tv', fixedGenre: 'Animation' },
};

export default function Browse({ kind }) {
  const cfg = CONFIG[kind];
  const [sp, setSp] = useSearchParams();
  const [hero, setHero] = useState(null);
  const type = kind === 'animation' && sp.get('format') === 'movie' ? 'movie' : cfg.type;
  const sort = sp.get('sort') || 'top';
  const year = sp.get('year') || YEARS[0];
  const genre = cfg.fixedGenre || sp.get('genre') || '';
  const genres = type === 'movie' ? MOVIE_GENRES : TV_GENRES;

  useEffect(() => {
    document.title = `${cfg.title} — NodeVid`;
  }, [kind]);

  useEffect(() => {
    setHero(null);
    catalog(type, { genre: cfg.fixedGenre })
      .then(setHero)
      .catch(() => setHero([]));
  }, [kind, type]);

  const query = sort === 'year' ? { list: 'year', genre: year } : { list: sort, genre: genre || undefined };
  const { items, loading, error, hasMore, sentinel } = useInfinite((skip) => catalog(type, { ...query, skip }), `${type}|${JSON.stringify(query)}`);

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
            {kind === 'animation' && (
              <div className="segmented">
                <button className={type === 'tv' ? 'active' : ''} onClick={() => update({ format: '' })}>
                  Series
                </button>
                <button className={type === 'movie' ? 'active' : ''} onClick={() => update({ format: 'movie' })}>
                  Movies
                </button>
              </div>
            )}
            <select className="select" value={sort} onChange={(e) => update({ sort: e.target.value === 'top' ? '' : e.target.value })}>
              {SORTS.filter((s) => !(s.noFixedGenre && cfg.fixedGenre)).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {sort === 'year' ? (
          <div className="chips">
            {YEARS.map((y) => (
              <button key={y} className={`chip ${y === year ? 'active' : ''}`} onClick={() => update({ year: y })}>
                {y}
              </button>
            ))}
          </div>
        ) : (
          !cfg.fixedGenre && (
            <div className="chips">
              <button className={`chip ${!genre ? 'active' : ''}`} onClick={() => update({ genre: '' })}>
                All
              </button>
              {genres.map((g) => (
                <button key={g} className={`chip ${g === genre ? 'active' : ''}`} onClick={() => update({ genre: g })}>
                  {g}
                </button>
              ))}
            </div>
          )
        )}

        <div className="grid">
          {items.map((it) => (
            <PosterCard key={it.id} item={it} />
          ))}
          {loading &&
            Array.from({ length: 12 }, (_, i) => (
              <div className="card" key={`s${i}`}>
                <div className="card-poster skeleton" />
              </div>
            ))}
        </div>
        {error && !items.length && <p className="empty">Couldn&apos;t load titles: {error}</p>}
        {!loading && !error && items.length === 0 && <p className="empty">Nothing found.</p>}
        {hasMore && <div ref={sentinel} className="sentinel" />}
      </div>
    </div>
  );
}
