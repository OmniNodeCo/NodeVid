import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CATEGORIES, getCategory, KIDS_CATEGORIES, kidSafe, loadCategory } from '../lib/categories.js';
import { sized } from '../lib/catalog.js';
import { activeProfile, useProfiles } from '../lib/store.js';
import Img from '../components/Img.jsx';
import { PosterCard } from '../components/Card.jsx';
import * as I from '../components/Icons.jsx';

/** Tile that lazily borrows a backdrop from the category's first title. */
function CategoryTile({ cat }) {
  const ref = useRef(null);
  const [bg, setBg] = useState(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        loadCategory(cat)
          .then((r) => {
            const pick = r.items.filter((x) => x.background)[Math.floor(Math.random() * Math.min(4, r.items.length))] || r.items[0];
            setBg(pick?.background || null);
          })
          .catch(() => {});
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cat]);
  return (
    <Link to={`/category/${cat.id}`} className="cat-tile" ref={ref}>
      {bg && <Img srcs={sized(bg, 'medium')} alt="" loading="lazy" />}
      <span className="cat-tile-shade" />
      <span className="cat-tile-title">{cat.title}</span>
      <span className="cat-tile-type">{cat.type === 'tv' ? 'Series' : 'Movies'}</span>
    </Link>
  );
}

export function CategoriesIndex() {
  const me = activeProfile(useProfiles());
  const cats = me.kids ? CATEGORIES.filter((c) => KIDS_CATEGORIES.includes(c.id)) : CATEGORIES;
  const groups = [...new Set(cats.map((c) => c.group))];
  useEffect(() => {
    document.title = 'Categories — NodeVid';
  }, []);
  return (
    <div className="container page-pad">
      <h1 className="page-title">Browse by Category</h1>
      <p className="muted page-sub">{cats.length} hand-picked collections across movies and TV.</p>
      {groups.map((g) => (
        <section key={g} className="cat-group">
          <h2>{g}</h2>
          <div className="cat-grid">
            {cats
              .filter((c) => c.group === g)
              .map((c) => (
                <CategoryTile key={c.id} cat={c} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function CategoryPage() {
  const { id } = useParams();
  return <CategoryGrid key={id} id={id} />;
}

function CategoryGrid({ id }) {
  const cat = getCategory(id);
  const me = activeProfile(useProfiles());
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef(null);
  const busy = useRef(false);

  useEffect(() => {
    if (cat) document.title = `${cat.title} — NodeVid`;
  }, [cat]);

  // Load the current page.
  useEffect(() => {
    if (!cat || !more || busy.current) return;
    let alive = true;
    busy.current = true;
    setLoading(true);
    loadCategory(cat, page)
      .then((r) => {
        if (!alive) return;
        setItems((prev) => {
          const seen = new Set(prev.map((x) => x.id));
          const fresh = r.items.filter((x) => !seen.has(x.id) && seen.add(x.id) && (!me.kids || kidSafe(x)));
          return [...prev, ...fresh];
        });
        setMore(r.more && page < 12);
      })
      .catch(() => alive && setMore(false))
      .finally(() => {
        busy.current = false;
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      busy.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, page]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !more || loading) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && !busy.current && setPage((p) => p + 1), { rootMargin: '800px' });
    io.observe(el);
    return () => io.disconnect();
  }, [more, loading, items.length]);

  if (!cat)
    return (
      <div className="container page-pad">
        <p className="empty">Category not found.</p>
        <Link to="/categories" className="btn btn-glass">
          All categories
        </Link>
      </div>
    );

  const related = CATEGORIES.filter((c) => c.group === cat.group && c.id !== cat.id && (!me.kids || KIDS_CATEGORIES.includes(c.id))).slice(0, 10);

  return (
    <div className="container page-pad">
      <Link to="/categories" className="back-link">
        <I.ChevronLeft width={16} height={16} /> Categories
      </Link>
      <h1 className="page-title">{cat.title}</h1>
      <div className="chips">
        {related.map((c) => (
          <Link key={c.id} to={`/category/${c.id}`} className="chip">
            {c.title}
          </Link>
        ))}
      </div>
      <div className="grid">
        {items.map((it) => (
          <PosterCard key={it.id} item={it} />
        ))}
        {loading &&
          Array.from({ length: 12 }, (_, i) => (
            <div className="card" key={`s${i}`}>
              <div className="card-poster skeleton" />
            </div>
          ))}
      </div>
      {!loading && items.length === 0 && <p className="empty">Nothing found.</p>}
      {more && <div ref={sentinel} className="sentinel" />}
    </div>
  );
}
