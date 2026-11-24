import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { isUpcoming, matchScore, releaseLabel, resolveStream, sized } from '../lib/catalog.js';
import { inList, likedGenres, toggleList, useList, useProgress, useRatings, useSettings, watchHref } from '../lib/store.js';
import Img from './Img.jsx';
import * as I from './Icons.jsx';
import { RemindButton } from './Preview.jsx';

export { watchHref };

export function TitleLogo({ item, size = 'medium' }) {
  return <Img className="hero-logo" srcs={sized(item.logo, size)} alt={item.title} fallback={<h1 className="hero-title">{item.title}</h1>} />;
}

const allowPreviews = () =>
  typeof window !== 'undefined' &&
  window.innerWidth >= 700 &&
  !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches &&
  !navigator.connection?.saveData;

/**
 * Muted, chrome-less clip of the film itself (streamed from archive.org),
 * used as a moving backdrop — the legal stand-in for a trailer.
 */
export function VideoBackdrop({ item, muted, visible, onEnded }) {
  const ref = useRef(null);
  const [src, setSrc] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    setSrc(null);
    setReady(false);
    resolveStream(item.type, item.id, 1, 1)
      .then((s) => {
        if (!alive) return;
        // Prefer a small file for previews.
        const small = [...s.sources].sort((a, b) => (a.height || 999) - (b.height || 999)).find((x) => x.type === 'video/mp4') || s.sources[0];
        setSrc(small?.src || null);
      })
      .catch(() => alive && onEnded?.());
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = muted;
  }, [muted, src]);
  useEffect(() => {
    const v = ref.current;
    if (!v || !ready) return;
    if (visible) v.play().catch(() => {});
    else v.pause();
  }, [visible, ready]);

  // Stop after ~45 seconds, like a trailer.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => onEnded?.(), 45000);
    return () => clearTimeout(t);
  }, [ready, onEnded]);

  if (!src) return null;
  return (
    <div className={`trailer-bg ${ready ? 'ready' : ''}`}>
      <video
        ref={ref}
        src={`${src}#t=${item.start || 0}`}
        muted
        autoPlay
        playsInline
        preload="auto"
        tabIndex={-1}
        aria-hidden="true"
        onPlaying={() => setReady(true)}
        onEnded={() => onEnded?.()}
        onError={() => onEnded?.()}
      />
    </div>
  );
}

/** Pause previews when the element scrolls mostly out of view or the tab is hidden. */
function useInView(ref) {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.intersectionRatio > 0.45), { threshold: [0, 0.45, 1] });
    io.observe(el);
    const onVis = () => setInView((v) => (document.hidden ? false : v));
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ref]);
  return inView;
}

export default function Hero({ items }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [preview, setPreview] = useState('idle'); // idle | playing | ended
  const [muted, setMuted] = useState(true);
  const list = useList();
  const progress = useProgress();
  const ratings = useRatings();
  const settings = useSettings();
  const ref = useRef(null);
  const inView = useInView(ref);

  const slides = (items || []).filter((x) => x.background).slice(0, 8);
  const endPreview = useCallback(() => setPreview('ended'), []);
  const item = slides[index];

  useEffect(() => setIndex(0), [items]);
  useEffect(() => setPreview('idle'), [index, items]);

  // Start the muted trailer after the backdrop has been on screen a moment.
  useEffect(() => {
    if (!item || item.upcoming || !settings.previews || preview !== 'idle' || !inView || !allowPreviews()) return;
    const t = setTimeout(() => setPreview('playing'), 2800);
    return () => clearTimeout(t);
  }, [item, settings.previews, preview, inView]);

  // Auto-advance (not while a trailer plays or the pointer is over the hero).
  useEffect(() => {
    if (paused || preview === 'playing' || slides.length < 2) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % slides.length), preview === 'ended' ? 6000 : 9000);
    return () => clearTimeout(t);
  }, [index, paused, preview, slides.length]);

  if (!item) return <div className="hero hero-skeleton skeleton" />;

  const saved = inList(list, item.id, item.type);
  const upcoming = isUpcoming(item);
  const match = matchScore(item, likedGenres(ratings));
  const playing = preview === 'playing';

  return (
    <section className={`hero ${playing ? 'hero-playing' : ''}`} ref={ref} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, i) => (
        <div key={s.id} className={`hero-bg ${i === index ? 'active' : ''}`} aria-hidden={i !== index}>
          {Math.abs(i - index) <= 1 || i === 0 ? <Img srcs={sized(s.background, 'large')} alt="" /> : null}
        </div>
      ))}
      {playing && <VideoBackdrop key={item.id} item={item} muted={muted} visible={inView} onEnded={endPreview} />}
      <div className="hero-shade" />
      <div className="hero-content" key={item.id}>
        <TitleLogo item={item} />
        {item.rank && (
          <div className="hero-rank">
            <span className="top10-badge">
              TOP<b>10</b>
            </span>
            #{item.rank} Most Watched {item.type === 'tv' ? 'Series' : 'Movie'}
          </div>
        )}
        <div className="meta-line">
          {upcoming ? (
            <span className="coming">Public domain {releaseLabel(item.date || item.released)}</span>
          ) : (
            match && <span className="match">{match}% Match</span>
          )}
          {item.year && <span>{item.year}</span>}
          <span className="pill">{item.type === 'tv' ? 'Series' : 'Movie'}</span>
          {item.genres.slice(0, 3).map((g) => (
            <span key={g} className="dot-sep">
              {g}
            </span>
          ))}
        </div>
        <p className="hero-overview">{item.description}</p>
        <div className="hero-actions">
          {upcoming ? (
            <RemindButton item={item} className="btn btn-light" label />
          ) : (
            <Link to={watchHref(item.type, item.id, progress)} className="btn btn-light">
              <I.Play width={20} height={20} /> Play
            </Link>
          )}
          <Link to={`/${item.type}/${item.id}`} className="btn btn-glass">
            <I.Info width={20} height={20} /> More Info
          </Link>
          <button className="btn btn-round" onClick={() => toggleList(item, item.type)} aria-label={saved ? 'Remove from My List' : 'Add to My List'} title={saved ? 'Remove from My List' : 'Add to My List'}>
            {saved ? <I.Check /> : <I.Plus />}
          </button>
        </div>
      </div>
      <div className="hero-side">
        {!item.upcoming && settings.previews && preview !== 'idle' && (
          <button
            className="round-btn round-btn-lg"
            onClick={() => (playing ? setMuted((m) => !m) : (setMuted(false), setPreview('playing')))}
            aria-label={playing ? (muted ? 'Unmute' : 'Mute') : 'Replay preview'}
          >
            {playing ? muted ? <I.VolumeX width={20} height={20} /> : <I.Volume width={20} height={20} /> : <I.Replay width={20} height={20} />}
          </button>
        )}
        {item.rating > 0 && (
          <span className="hero-tag">
            <I.Star width={12} height={12} /> {item.rating.toFixed(1)}
          </span>
        )}
      </div>
      {slides.length > 1 && (
        <div className="hero-dots">
          {slides.map((s, i) => (
            <button key={s.id} className={i === index ? 'active' : ''} onClick={() => setIndex(i)} aria-label={`Slide ${i + 1}`}>
              {i === index && !paused && !playing && <span />}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
