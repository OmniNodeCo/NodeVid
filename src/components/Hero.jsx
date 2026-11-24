import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sized } from '../lib/catalog.js';
import { inList, toggleList, useList, useProgress, progressKey } from '../lib/store.js';
import Img from './Img.jsx';
import * as I from './Icons.jsx';

export function watchHref(type, id, progress, firstSeason = 1) {
  if (type === 'movie') return `/watch/movie/${id}`;
  const p = progress?.[progressKey('tv', id)];
  return p ? `/watch/tv/${id}/${p.season}/${p.episode}` : `/watch/tv/${id}/${firstSeason}/1`;
}

export function TitleLogo({ item, size = 'medium' }) {
  return (
    <Img
      className="hero-logo"
      srcs={sized(item.logo, size)}
      alt={item.title}
      fallback={<h1 className="hero-title">{item.title}</h1>}
    />
  );
}

export default function Hero({ items }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const list = useList();
  const progress = useProgress();

  const slides = (items || []).filter((x) => x.background).slice(0, 8);
  const item = slides[index];

  useEffect(() => setIndex(0), [items]);
  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % slides.length), 9000);
    return () => clearTimeout(t);
  }, [index, paused, slides.length]);

  if (!item) return <div className="hero hero-skeleton skeleton" />;

  const saved = inList(list, item.id, item.type);

  return (
    <section className="hero" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, i) => (
        <div key={s.id} className={`hero-bg ${i === index ? 'active' : ''}`} aria-hidden={i !== index}>
          {Math.abs(i - index) <= 1 || i === 0 ? <Img srcs={sized(s.background, 'large')} alt="" /> : null}
        </div>
      ))}
      <div className="hero-shade" />
      <div className="hero-content" key={item.id}>
        <TitleLogo item={item} />
        <div className="meta-line">
          {item.rating > 0 && (
            <span className="pill pill-rating">
              <I.Star width={12} height={12} /> {item.rating.toFixed(1)}
            </span>
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
          <Link to={watchHref(item.type, item.id, progress)} className="btn btn-primary">
            <I.Play width={18} height={18} /> Watch Now
          </Link>
          <Link to={`/${item.type}/${item.id}`} className="btn btn-glass">
            <I.Info width={18} height={18} /> More Info
          </Link>
          <button className="btn btn-round" onClick={() => toggleList(item, item.type)} aria-label={saved ? 'Remove from My List' : 'Add to My List'}>
            {saved ? <I.Check /> : <I.Plus />}
          </button>
        </div>
      </div>
      {slides.length > 1 && (
        <div className="hero-dots">
          {slides.map((s, i) => (
            <button key={s.id} className={i === index ? 'active' : ''} onClick={() => setIndex(i)} aria-label={`Slide ${i + 1}`}>
              {i === index && !paused && <span />}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
