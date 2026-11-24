import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Hero from '../components/Hero.jsx';
import { PosterCard } from '../components/Card.jsx';
import useInfinite from '../lib/useInfinite.js';
import { tmdb, MOVIE_GENRES, TV_GENRES } from '../lib/tmdb.js';

const SORTS = [
  { id: 'popularity.desc', label: 'Most Popular' },
  { id: 'vote_average.desc', label: 'Top Rated' },
  { id: 'date.desc', label: 'Newest' },
  { id: 'revenue.desc', label: 'Box Office', movieOnly: true },
];

const CONFIG = {
  movie: { title: 'Movies', type: 'movie', heroPath: 'trending/movie/week', genres: MOVIE_GENRES },
  tv: { title: 'TV Shows', type: 'tv', heroPath: 'trending/tv/week', genres: TV_GENRES },
  anime: {
    title: 'Anime',
    type: 'tv',
    heroPath: 'discover/tv',
    heroParams: { with_genres: 16, with_original_language: 'ja', sort_by: 'popularity.desc' },
    genres: TV_GENRES.filter((g) => g.id !== 16),
    base: { with_original_language: 'ja', with_genres: '16' },
  },
};

export default function Browse({ kind }) {
  const cfg = CONFIG[kind];
  const [sp, setSp] = useSearchParams();
  const [hero, setHero] = useState(null);
  const animeFormat = kind === 'anime' ? sp.get('format') || 'tv' : null;
  const type = animeFormat === 'movie' ? 'movie' : cfg.type;
  const genre = sp.get('genre') || '';
  const sort = sp.get('sort') || 'popularity.desc';
  const genres = kind === 'anime' && type === 'movie' ? MOVIE_GENRES.filter((g) => g.id !== 16) : cfg.genres;

  useEffect(() => {
    document.title = `${cfg.title} — NodeVid`;
    setHero(null);
    tmdb(cfg.heroPath, cfg.heroParams)
      .then((d) => setHero(d.results))
      .catch(() => setHero([]));
  }, [kind]);

  const params = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const p = { include_adult: 'false' };
    const withGenres = [cfg.base?.with_genres, genre].filter(Boolean).join(',');
    if (withGenres) p.with_genres = withGenres;
    if (cfg.base?.with_original_language) p.with_original_language = cfg.base.with_original_language;
    const dateField = type === 'movie' ? 'primary_release_date' : 'first_air_date';
    if (sort === 'date.desc') {
      p.sort_by = `${dateField}.desc`;
      p[`${dateField}.lte`] = today;
      p['vote_count.gte'] = 10;
    } else {
      p.sort_by = sort;
      if (sort === 'vote_average.desc') p['vote_count.gte'] = type === 'movie' ? 500 : 200;
    }
    return p;
  }, [genre, sort, type, kind]);

  const { items, loading, error, hasMore, sentinel } = useInfinite(`discover/${type}`, params, {
    filter: (x) => x.poster_path,
  });

  const update = (k, v) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k === 'format') next.delete('genre');
    setSp(next, { replace: true });
  };

  return (
    <div>
      <Hero items={hero} type={kind === 'movie' ? 'movie' : 'tv'} />
      <div className="container browse">
        <div className="browse-head">
          <h1>{cfg.title}</h1>
          <div className="browse-controls">
            {kind === 'anime' && (
              <div className="segmented">
                <button className={type === 'tv' ? 'active' : ''} onClick={() => update('format', '')}>
                  Series
                </button>
                <button className={type === 'movie' ? 'active' : ''} onClick={() => update('format', 'movie')}>
                  Movies
                </button>
              </div>
            )}
            <select className="select" value={sort} onChange={(e) => update('sort', e.target.value === 'popularity.desc' ? '' : e.target.value)}>
              {SORTS.filter((s) => !s.movieOnly || type === 'movie').map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="chips">
          <button className={`chip ${!genre ? 'active' : ''}`} onClick={() => update('genre', '')}>
            All
          </button>
          {genres.map((g) => (
            <button key={g.id} className={`chip ${String(g.id) === genre ? 'active' : ''}`} onClick={() => update('genre', String(g.id))}>
              {g.name}
            </button>
          ))}
        </div>
        <div className="grid">
          {items.map((it) => (
            <PosterCard key={it.id} item={it} type={type} />
          ))}
          {loading &&
            Array.from({ length: 12 }, (_, i) => (
              <div className="card" key={`s${i}`}>
                <div className="card-poster skeleton" />
              </div>
            ))}
        </div>
        {error && <p className="empty">Couldn&apos;t load titles: {error}</p>}
        {!loading && !error && items.length === 0 && <p className="empty">Nothing found.</p>}
        {hasMore && <div ref={sentinel} className="sentinel" />}
      </div>
    </div>
  );
}
