import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchLogo, img, mediaTypeOf, titleOf, yearOf, MOVIE_GENRES, TV_GENRES } from '../lib/tmdb.js';
import { inList, toggleList, useList, useProgress, progressKey } from '../lib/store.js';
import * as I from './Icons.jsx';

const genreName = (id) => [...MOVIE_GENRES, ...TV_GENRES].find((g) => g.id === id)?.name;

export function watchHref(type, id, progress) {
  if (type === 'movie') return `/watch/movie/${id}`;
  const p = progress?.[progressKey('tv', id)];
  return p ? `/watch/tv/${id}/${p.season}/${p.episode}` : `/watch/tv/${id}/1/1`;
}

export default function Hero({ items, type: forcedType }) {
  const [index, setIndex] = useState(0);
  const [logos, setLogos] = useState({});
  const [paused, setPaused] = useState(false);
  const list = useList();
  const progress = useProgress();

  const slides = (items || []).filter((x) => x.backdrop_path).slice(0, 8);
  const item = slides[index];

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % slides.length), 9000);
    return () => clearTimeout(t);
  }, [index, paused, slides.length]);

  useEffect(() => {
    slides.forEach((s) => {
      const t = forcedType || mediaTypeOf(s);
      const k = `${t}:${s.id}`;
      if (k in logos) return;
      fetchLogo(t, s.id).then((logo) => setLogos((l) => ({ ...l, [k]: logo })));
    });
  }, [items]);

  if (!item) return <div className="hero hero-skeleton skeleton" />;

  const type = forcedType || mediaTypeOf(item);
  const logo = logos[`${type}:${item.id}`];
  const saved = inList(list, item.id, type);
  const genres = (item.genre_ids || []).map(genreName).filter(Boolean).slice(0, 3);

  return (
    <section className="hero" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, i) => (
        <div key={s.id} className={`hero-bg ${i === index ? 'active' : ''}`} aria-hidden={i !== index}>
          <img src={img(s.backdrop_path, 'original')} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
        </div>
      ))}
      <div className="hero-shade" />
      <div className="hero-content" key={item.id}>
        {logo ? (
          <img className="hero-logo" src={img(logo.file_path, 'w500')} alt={titleOf(item)} />
        ) : (
          <h1 className="hero-title">{titleOf(item)}</h1>
        )}
        <div className="meta-line">
          {item.vote_average > 0 && (
            <span className="pill pill-rating">
              <I.Star width={12} height={12} /> {item.vote_average.toFixed(1)}
            </span>
          )}
          <span>{yearOf(item)}</span>
          <span className="pill">{type === 'tv' ? 'TV Series' : 'Movie'}</span>
          {genres.map((g) => (
            <span key={g} className="dot-sep">
              {g}
            </span>
          ))}
        </div>
        <p className="hero-overview">{item.overview}</p>
        <div className="hero-actions">
          <Link to={watchHref(type, item.id, progress)} className="btn btn-primary">
            <I.Play width={18} height={18} /> Watch Now
          </Link>
          <Link to={`/${type}/${item.id}`} className="btn btn-glass">
            <I.Info width={18} height={18} /> More Info
          </Link>
          <button className="btn btn-round" onClick={() => toggleList(item, type)} aria-label={saved ? 'Remove from My List' : 'Add to My List'}>
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
