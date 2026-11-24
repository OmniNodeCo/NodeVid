import { Link } from 'react-router-dom';
import { sized } from '../lib/catalog.js';
import { removeProgress } from '../lib/store.js';
import Img from './Img.jsx';
import * as I from './Icons.jsx';

export function PosterCard({ item }) {
  const { type, title, year } = item;
  return (
    <Link to={`/${type}/${item.id}`} className="card" title={title}>
      <div className="card-poster">
        <Img srcs={sized(item.poster, 'medium')} alt={title} loading="lazy" fallback={<div className="card-fallback">{title}</div>} />
        <div className="card-overlay">
          <span className="card-play">
            <I.Play width={18} height={18} />
          </span>
        </div>
        {item.rating > 0 && (
          <span className="card-rating">
            <I.Star width={11} height={11} /> {item.rating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="card-meta">
        <div className="card-title">{title}</div>
        <div className="card-sub">
          {year}
          {year && ' • '}
          {type === 'tv' ? 'Series' : 'Movie'}
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
          <Img
            srcs={[...sized(entry.background, 'medium'), ...sized(entry.poster, 'medium')]}
            alt={entry.title}
            loading="lazy"
            fallback={<div className="card-fallback">{entry.title}</div>}
          />
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
