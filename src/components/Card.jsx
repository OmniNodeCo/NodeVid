import { Link } from 'react-router-dom';
import { img, mediaTypeOf, titleOf, yearOf } from '../lib/tmdb.js';
import { removeProgress } from '../lib/store.js';
import * as I from './Icons.jsx';

export function PosterCard({ item, type }) {
  const t = type || mediaTypeOf(item);
  const title = titleOf(item);
  const poster = img(item.poster_path, 'w342');
  const year = yearOf(item) || (item.date || '').slice(0, 4);
  return (
    <Link to={`/${t}/${item.id}`} className="card" title={title}>
      <div className="card-poster">
        {poster ? <img src={poster} alt={title} loading="lazy" /> : <div className="card-fallback">{title}</div>}
        <div className="card-overlay">
          <span className="card-play">
            <I.Play width={18} height={18} />
          </span>
        </div>
        {item.vote_average > 0 && (
          <span className="card-rating">
            <I.Star width={11} height={11} /> {item.vote_average.toFixed(1)}
          </span>
        )}
      </div>
      <div className="card-meta">
        <div className="card-title">{title}</div>
        <div className="card-sub">
          {year}
          {year && ' • '}
          {t === 'tv' ? 'TV' : 'Movie'}
        </div>
      </div>
    </Link>
  );
}

export function ContinueCard({ entry }) {
  const isTv = entry.type === 'tv';
  const finished = entry.progress >= 95;
  const href = isTv
    ? finished
      ? `/tv/${entry.id}?season=${entry.season}`
      : `/watch/tv/${entry.id}/${entry.season}/${entry.episode}`
    : `/watch/movie/${entry.id}`;
  const left = Math.max(0, Math.round((entry.duration - entry.time) / 60));
  return (
    <div className="ccard">
      <Link to={href} className="ccard-link">
        <div className="ccard-img">
          {entry.backdrop_path ? (
            <img src={img(entry.backdrop_path, 'w780')} alt={entry.title} loading="lazy" />
          ) : (
            <div className="card-fallback">{entry.title}</div>
          )}
          <div className="ccard-shade" />
          <span className="ccard-play">
            <I.Play width={20} height={20} />
          </span>
          <div className="ccard-bar">
            <span style={{ width: `${Math.min(100, entry.progress || 0)}%` }} />
          </div>
        </div>
        <div className="ccard-meta">
          <div className="card-title">{entry.title}</div>
          <div className="card-sub">
            {isTv && `S${entry.season} E${entry.episode} • `}
            {finished ? 'Finished' : entry.duration ? `${left}m left` : 'Continue'}
          </div>
        </div>
      </Link>
      <button className="ccard-remove" aria-label="Remove from Continue Watching" onClick={() => removeProgress(entry.type, entry.id)}>
        <I.X width={14} height={14} />
      </button>
    </div>
  );
}
