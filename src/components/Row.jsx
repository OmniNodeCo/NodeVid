import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalog } from '../lib/catalog.js';
import { PosterCard } from './Card.jsx';
import * as I from './Icons.jsx';

export function Scroller({ children, className = '' }) {
  const ref = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };

  useEffect(() => {
    update();
    const el = ref.current;
    const ro = new ResizeObserver(update);
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  const scroll = (dir) => {
    const el = ref.current;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <div className={`scroller ${className}`}>
      {!edges.start && (
        <button className="scroll-btn left" onClick={() => scroll(-1)} aria-label="Scroll left">
          <I.ChevronLeft width={26} height={26} />
        </button>
      )}
      <div className="scroller-track" ref={ref} onScroll={update}>
        {children}
      </div>
      {!edges.end && (
        <button className="scroll-btn right" onClick={() => scroll(1)} aria-label="Scroll right">
          <I.ChevronRight width={26} height={26} />
        </button>
      )}
    </div>
  );
}

/** A titled, lazily-loaded horizontal row of posters from a catalog. */
export default function Row({ title, type, query, load, items: given, more, exclude, card }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(Boolean(given));
  const [items, setItems] = useState(given || null);
  const qkey = JSON.stringify(query || {});

  useEffect(() => {
    if (given) {
      setItems(given);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '400px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [given]);

  useEffect(() => {
    if (!visible || given || (!type && !load)) return;
    let alive = true;
    (load ? load() : catalog(type, query))
      .then((d) => alive && setItems(d.filter((x) => x.id !== exclude).slice(0, 30)))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [visible, type, qkey, given, exclude]);

  if (items && items.length === 0) return null;

  return (
    <section className="row" ref={ref}>
      <div className="row-head">
        <h2>{title}</h2>
        {more && (
          <Link to={more} className="row-more">
            View all <I.ChevronRight width={16} height={16} />
          </Link>
        )}
      </div>
      <Scroller>
        {items
          ? items.map((it) => (card ? card(it) : <PosterCard key={`${it.type}-${it.id}`} item={it} />))
          : Array.from({ length: 8 }, (_, i) => (
              <div className="card skeleton-card" key={i}>
                <div className="card-poster skeleton" />
              </div>
            ))}
      </Scroller>
    </section>
  );
}
