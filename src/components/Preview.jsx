// Netflix-style hover preview: hovering a poster for a moment pops up a larger
// card with backdrop, quick actions (play, my list, rate, remind) and details.
// Rendered through a portal so horizontal scrollers don't clip it.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isUpcoming, matchScore, releaseLabel, sized } from '../lib/catalog.js';
import {
  inList,
  isReminded,
  likedGenres,
  rate,
  ratingOf,
  toggleList,
  toggleReminder,
  useList,
  useProgress,
  useRatings,
  useReminders,
  watchHref,
} from '../lib/store.js';
import Img from './Img.jsx';
import * as I from './Icons.jsx';

const Ctx = createContext(null);
export const usePreview = () => useContext(Ctx);

const canHover = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

export function RateButtons({ item, compact = false }) {
  const ratings = useRatings();
  const v = ratingOf(ratings, item);
  return (
    <span className={`rate ${compact ? 'rate-compact' : ''}`}>
      <button className={`round-btn ${v === -1 ? 'on' : ''}`} onClick={() => rate(item, -1)} aria-label="Not for me" title="Not for me">
        <I.ThumbDown width={16} height={16} />
      </button>
      <button className={`round-btn ${v === 1 ? 'on' : ''}`} onClick={() => rate(item, 1)} aria-label="I like this" title="I like this">
        <I.ThumbUp width={16} height={16} />
      </button>
      <button className={`round-btn ${v === 2 ? 'on' : ''}`} onClick={() => rate(item, 2)} aria-label="Love this!" title="Love this!">
        <I.Heart width={16} height={16} />
      </button>
    </span>
  );
}

export function RemindButton({ item, className = 'round-btn', label = false }) {
  const reminders = useReminders();
  const on = isReminded(reminders, item.id);
  return (
    <button className={`${className} ${on ? 'on' : ''}`} onClick={() => toggleReminder(item)} aria-label={on ? 'Reminder set' : 'Remind me'} title={on ? 'Reminder set' : 'Remind me'}>
      {on ? <I.BellFill width={label ? 18 : 16} height={label ? 18 : 16} /> : <I.Bell width={label ? 18 : 16} height={label ? 18 : 16} />}
      {label && <span>{on ? 'Reminder Set' : 'Remind Me'}</span>}
    </button>
  );
}

function PreviewCard({ state, onEnter, onLeave }) {
  const { item, rect, extra } = state;
  const list = useList();
  const progress = useProgress();
  const ratings = useRatings();
  const navigate = useNavigate();
  const upcoming = isUpcoming(item);
  const saved = inList(list, item.id, item.type);
  const match = matchScore(item, likedGenres(ratings));

  const width = Math.min(380, Math.max(310, rect.width * 1.9));
  const imgH = (width * 9) / 16;
  const vw = document.documentElement.clientWidth;
  const left = Math.max(12, Math.min(vw - width - 12, rect.left + rect.width / 2 - width / 2));
  const top = Math.max(window.scrollY + 76, rect.top + window.scrollY + rect.height / 2 - imgH / 2 - 30);
  const origin = rect.left + rect.width / 2 - left;
  const playHref = extra?.href || watchHref(item.type, item.id, progress);
  const details = `/${item.type}/${item.id}`;

  return (
    <div
      className="preview"
      style={{ width, left, top, transformOrigin: `${origin}px 30%` }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      role="dialog"
      aria-label={item.title}
    >
      <Link to={details} className="preview-img" style={{ height: imgH }}>
        <Img srcs={[...sized(item.background, 'medium'), ...sized(item.poster, 'medium')]} alt="" fallback={<div className="card-fallback">{item.title}</div>} />
        <span className="preview-img-shade" />
        {item.logo ? (
          <Img className="preview-logo" srcs={sized(item.logo, 'medium')} alt={item.title} fallback={<span className="preview-name">{item.title}</span>} />
        ) : (
          <span className="preview-name">{item.title}</span>
        )}
      </Link>
      <div className="preview-body">
        <div className="preview-actions">
          {upcoming ? (
            <RemindButton item={item} className="round-btn round-btn-light" />
          ) : (
            <button className="round-btn round-btn-light" onClick={() => navigate(playHref)} aria-label="Play">
              <I.Play width={18} height={18} />
            </button>
          )}
          <button className={`round-btn ${saved ? 'on' : ''}`} onClick={() => toggleList(item, item.type)} aria-label={saved ? 'Remove from My List' : 'Add to My List'} title={saved ? 'Remove from My List' : 'Add to My List'}>
            {saved ? <I.Check width={16} height={16} /> : <I.Plus width={16} height={16} />}
          </button>
          <RateButtons item={item} compact />
          <button className="round-btn push-right" onClick={() => navigate(details)} aria-label="More info" title="More info">
            <I.ChevronDown width={18} height={18} />
          </button>
        </div>
        <div className="preview-meta">
          {upcoming ? (
            <span className="coming">Coming {releaseLabel(item.date || item.released)}</span>
          ) : (
            match && <span className="match">{match}% Match</span>
          )}
          {item.year && <span>{item.year}</span>}
          <span className="hd">{extra?.badge || 'HD'}</span>
          <span>{extra?.sub || (item.type === 'tv' ? 'Series' : item.runtime || 'Movie')}</span>
        </div>
        {item.genres?.length > 0 && (
          <div className="preview-genres">
            {item.genres.slice(0, 3).map((g) => (
              <span key={g}>{g}</span>
            ))}
          </div>
        )}
        {item.description && <p className="preview-desc">{item.description}</p>}
      </div>
    </div>
  );
}

export function PreviewProvider({ children }) {
  const [state, setState] = useState(null);
  const showT = useRef(0);
  const hideT = useRef(0);
  const location = useLocation();

  const hide = useCallback(() => {
    clearTimeout(showT.current);
    clearTimeout(hideT.current);
    setState(null);
  }, []);

  const api = useRef({
    hover(item, el, extra) {
      if (!canHover()) return;
      clearTimeout(showT.current);
      clearTimeout(hideT.current);
      showT.current = setTimeout(() => {
        if (!el.isConnected) return;
        setState({ item, rect: el.getBoundingClientRect(), extra });
      }, 550);
    },
    leave() {
      clearTimeout(showT.current);
      hideT.current = setTimeout(() => setState(null), 140);
    },
  }).current;

  useEffect(hide, [location.pathname, hide]);
  useEffect(() => {
    if (!state) return;
    const onScroll = () => hide();
    const onKey = (e) => e.key === 'Escape' && hide();
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('keydown', onKey);
    };
  }, [state, hide]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {state &&
        createPortal(
          <PreviewCard key={`${state.item.type}-${state.item.id}`} state={state} onEnter={() => clearTimeout(hideT.current)} onLeave={api.leave} />,
          document.body
        )}
    </Ctx.Provider>
  );
}
