import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PosterCard } from '../components/Card.jsx';
import useInfinite from '../lib/useInfinite.js';
import * as I from '../components/Icons.jsx';

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const isTitle = (x) => (x.media_type === 'movie' || x.media_type === 'tv') && x.poster_path;

export default function Search() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const q = sp.get('q') || '';
  const dq = useDebounced(q.trim(), 300);
  const inputRef = useRef(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    document.title = q ? `"${q}" — NodeVid` : 'Search — NodeVid';
  }, [q]);

  useEffect(() => {
    // Focus the page input on mobile (the nav search box is hidden there).
    if (window.matchMedia('(max-width: 860px)').matches) inputRef.current?.focus();
  }, []);

  const search = useInfinite('search/multi', { query: dq, include_adult: 'false' }, { enabled: Boolean(dq), filter: isTitle });
  const trending = useInfinite('trending/all/week', {}, { enabled: !dq, filter: isTitle });
  const src = dq ? search : trending;
  const shown = src.items.filter((x) => filter === 'all' || x.media_type === filter);

  return (
    <div className="container page-pad">
      <label className="search-big">
        <I.Search width={22} height={22} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => navigate(`/search${e.target.value ? `?q=${encodeURIComponent(e.target.value)}` : ''}`, { replace: true })}
          placeholder="Search for movies, TV shows, anime…"
        />
        {q && (
          <button onClick={() => navigate('/search', { replace: true })} aria-label="Clear">
            <I.X />
          </button>
        )}
      </label>
      <div className="browse-head">
        <h1>{dq ? `Results for “${dq}”` : 'Trending this week'}</h1>
        <div className="segmented">
          {[
            ['all', 'All'],
            ['movie', 'Movies'],
            ['tv', 'TV Shows'],
          ].map(([k, l]) => (
            <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="grid">
        {shown.map((it) => (
          <PosterCard key={`${it.media_type}-${it.id}`} item={it} type={it.media_type} />
        ))}
        {src.loading &&
          Array.from({ length: 12 }, (_, i) => (
            <div className="card" key={`s${i}`}>
              <div className="card-poster skeleton" />
            </div>
          ))}
      </div>
      {src.error && <p className="empty">Search failed: {src.error}</p>}
      {!src.loading && !src.error && dq && shown.length === 0 && <p className="empty">No results for “{dq}”. Try a different title.</p>}
      {src.hasMore && <div ref={src.sentinel} className="sentinel" />}
    </div>
  );
}
