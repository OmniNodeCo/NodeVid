import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PosterCard } from '../components/Card.jsx';
import useInfinite from '../lib/useInfinite.js';
import { catalog, searchAll } from '../lib/catalog.js';
import { CATEGORIES } from '../lib/categories.js';
import * as I from '../components/Icons.jsx';

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function Search() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const q = sp.get('q') || '';
  const dq = useDebounced(q.trim(), 350);
  const inputRef = useRef(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    document.title = q ? `"${q}" — NodeVid` : 'Search — NodeVid';
  }, [q]);

  useEffect(() => {
    if (window.matchMedia('(max-width: 860px)').matches) inputRef.current?.focus();
  }, []);

  const search = useInfinite(() => searchAll(dq), `s|${dq}`, { enabled: Boolean(dq), pageable: false });
  const popular = useInfinite(
    (skip) => catalog(undefined, { skip }),
    'popular',
    { enabled: !dq }
  );
  const src = dq ? search : popular;
  const shown = src.items.filter((x) => filter === 'all' || x.type === filter);

  return (
    <div className="container page-pad">
      <label className="search-big">
        <I.Search width={22} height={22} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => navigate(`/search${e.target.value ? `?q=${encodeURIComponent(e.target.value)}` : ''}`, { replace: true })}
          placeholder="Search titles, stars, genres or years…"
        />
        {q && (
          <button onClick={() => navigate('/search', { replace: true })} aria-label="Clear">
            <I.X />
          </button>
        )}
      </label>

      {!dq && (
        <div className="chips">
          {CATEGORIES.filter((c) => c.group === 'Collections' || c.group === 'Genres')
            .slice(0, 16)
            .map((c) => (
              <Link key={c.id} to={`/category/${c.id}`} className="chip">
                {c.title}
              </Link>
            ))}
        </div>
      )}

      {(
        <>
          <div className="browse-head">
            <h1>{dq ? `Results for “${dq}”` : 'Most watched'}</h1>
            <div className="segmented">
              {[
                ['all', 'All'],
                ['movie', 'Movies'],
                ['tv', 'Series'],
              ].map(([k, l]) => (
                <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="grid">
            {shown.map((it) => (
              <PosterCard key={`${it.type}-${it.id}`} item={it} />
            ))}
            {src.loading &&
              Array.from({ length: 12 }, (_, i) => (
                <div className="card" key={`s${i}`}>
                  <div className="card-poster skeleton" />
                </div>
              ))}
          </div>
          {src.error && !shown.length && <p className="empty">Search failed: {src.error}</p>}
          {!src.loading && !src.error && dq && shown.length === 0 && <p className="empty">No results for “{dq}”. NodeVid only has public-domain and openly licensed titles — try a classic like “Nosferatu” or “Keaton”.</p>}
          {src.hasMore && <div ref={src.sentinel} className="sentinel" />}
        </>
      )}
    </div>
  );
}
