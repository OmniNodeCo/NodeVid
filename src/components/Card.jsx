import { Link } from 'react-router-dom';
import { sized } from '../lib/catalog.js';
import { removeProgress } from '../lib/store.js';
import Img from './Img.jsx';
import * as I from './Icons.jsx';
import { usePreview } from './Preview.jsx';

/** Hover-preview handlers for any card element. */
export function usePreviewHandlers(item, extra) {
  const pv = usePreview();
  if (!pv) return {};
  return {
    onMouseEnter: (e) => pv.hover(item, e.currentTarget, extra),
    onMouseLeave: () => pv.leave(),
  };
}

export function PosterCard({ item, href, sub, badge, ribbon }) {
  const { type, title, year } = item;
  const hover = usePreviewHandlers(item, { href, sub, badge });
  return (
    <Link to={href || `/${type}/${item.id}`} className="card" aria-label={title} {...hover}>
      <div className="card-poster">
        <Img srcs={sized(item.poster, 'medium')} alt={title} loading="lazy" fallback={<div className="card-fallback">{title}</div>} />
        <div className="card-overlay">
          <span className="card-play">
            <I.Play width={18} height={18} />
          </span>
        </div>
        {badge && <span className="card-badge">{badge}</span>}
        {ribbon && <span className="card-ribbon">{ribbon}</span>}
        {item.rating > 0 && (
          <span className="card-rating">
            <I.Star width={11} height={11} /> {item.rating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="card-meta">
        <div className="card-title">{title}</div>
        <div className="card-sub">
          {sub || (
            <>
              {year}
              {year && ' • '}
              {type === 'tv' ? 'Series' : 'Movie'}
            </>
          )}
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

/** Big-number "Top 10" card. */
export function Top10Card({ item, rank }) {
  const hover = usePreviewHandlers(item);
  return (
    <Link to={`/${item.type}/${item.id}`} className="top10-card" aria-label={`#${rank} ${item.title}`} {...hover}>
      <span className="top10-num" aria-hidden="true">
        {rank}
      </span>
      <span className="top10-poster">
        <Img srcs={sized(item.poster, 'medium')} alt={item.title} loading="lazy" fallback={<div className="card-fallback">{item.title}</div>} />
        {rank <= 3 && <span className="top10-badge">TOP<b>10</b></span>}
      </span>
    </Link>
  );
}

/** Wide backdrop card (used for "Coming Soon" and category tiles). */
export function WideCard({ item, href, label, sub }) {
  const hover = usePreviewHandlers(item, { sub });
  return (
    <Link to={href || `/${item.type}/${item.id}`} className="wcard" aria-label={item.title} {...hover}>
      <span className="wcard-img">
        <Img
          srcs={[...sized(item.background, 'medium'), ...sized(item.poster, 'medium')]}
          alt=""
          loading="lazy"
          fallback={<div className="card-fallback">{item.title}</div>}
        />
        <span className="wcard-shade" />
        {item.logo ? (
          <Img className="wcard-logo" srcs={sized(item.logo, 'medium')} alt={item.title} loading="lazy" fallback={<span className="wcard-title">{item.title}</span>} />
        ) : (
          <span className="wcard-title">{item.title}</span>
        )}
        {label && <span className="wcard-label">{label}</span>}
      </span>
      {sub && <span className="wcard-sub">{sub}</span>}
    </Link>
  );
}
