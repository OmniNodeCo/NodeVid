import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PosterCard } from '../components/Card.jsx';
import useInfinite from '../lib/useInfinite.js';
import { catalog, searchAll } from '../lib/catalog.js';
import * as I from '../components/Icons.jsx';

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Play anything on Vidking straight from its TMDB (or IMDb) id. */
export function PlayById({ initialId = '' }) {
  const navigate = useNavigate();
  const [type, setType] = useState('movie');
  const [id, setId] = useState(initialId);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  useEffect(() => setId(initialId), [initialId]);

  const clean = id.trim().replace(/.*themoviedb\.org\/(movie|tv)\/(\d+).*/, '$2').replace(/.*imdb\.com\/title\/(tt\d+).*/, '$1');
  const valid = /^(\d+|tt\d+)$/.test(clean);

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    navigate(type === 'tv' ? `/watch/tv/${clean}/${season || 1}/${episode || 1}` : `/watch/movie/${clean}`);
  };

  // Pasting a TMDB link sets the type automatically.
  const onIdChange = (v) => {
    const m = v.match(/themoviedb\.org\/(movie|tv)\//);
    if (m) setType(m[1]);
    setId(v);
  };

  return (
    <form className="panel playid" onSubmit={submit}>
      <div className="playid-head">
        <div>
          <h2>Play by ID</h2>
          <p className="setting-desc">Paste a TMDB ID (or TMDB / IMDb link) to open it in the Vidking player directly.</p>
        </div>
        <div className="segmented">
          <button type="button" className={type === 'movie' ? 'active' : ''} onClick={() => setType('movie')}>
            Movie
          </button>
          <button type="button" className={type === 'tv' ? 'active' : ''} onClick={() => setType('tv')}>
            TV
          </button>
        </div>
      </div>
      <div className="playid-row">
        <input className="input" value={id} onChange={(e) => onIdChange(e.target.value)} placeholder="e.g. 1078605 or tt0903747" aria-label="ID" />
        {type === 'tv' && (
          <>
            <label className="mini">
              S
              <input className="input" type="number" min="0" value={season} onChange={(e) => setSeason(Number(e.target.value))} />
            </label>
            <label className="mini">
              E
              <input className="input" type="number" min="1" value={episode} onChange={(e) => setEpisode(Number(e.target.value))} />
            </label>
          </>
        )}
        <button className="btn btn-primary btn-sm" disabled={!valid}>
          <I.Play width={14} height={14} /> Play
        </button>
      </div>
    </form>
  );
}

export default function Search() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const q = sp.get('q') || '';
  const dq = useDebounced(q.trim(), 350);
  const inputRef = useRef(null);
  const [filter, setFilter] = useState('all');
  const looksLikeId = /^(\d+|tt\d+)$/.test(dq);

  useEffect(() => {
    document.title = q ? `"${q}" — NodeVid` : 'Search — NodeVid';
  }, [q]);

  useEffect(() => {
    if (window.matchMedia('(max-width: 860px)').matches) inputRef.current?.focus();
  }, []);

  const search = useInfinite(() => searchAll(dq), `s|${dq}`, { enabled: Boolean(dq) && !looksLikeId, pageable: false });
  const popular = useInfinite(
    async (skip) => {
      const [m, t] = await Promise.all([catalog('movie', { skip }), catalog('tv', { skip })]);
      return m.flatMap((x, i) => (t[i] ? [x, t[i]] : [x]));
    },
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
          placeholder="Search movies & TV shows, or paste a TMDB ID…"
        />
        {q && (
          <button onClick={() => navigate('/search', { replace: true })} aria-label="Clear">
            <I.X />
          </button>
        )}
      </label>

      {(looksLikeId || !dq) && <PlayById initialId={looksLikeId ? dq : ''} />}

      {!looksLikeId && (
        <>
          <div className="browse-head">
            <h1>{dq ? `Results for “${dq}”` : 'Popular right now'}</h1>
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
          {!src.loading && !src.error && dq && shown.length === 0 && <p className="empty">No results for “{dq}”. Try a different title.</p>}
          {src.hasMore && <div ref={src.sentinel} className="sentinel" />}
        </>
      )}
    </div>
  );
}
