import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero.jsx';
import Row, { CategoryRow, ComingSoonRow, Scroller, Top10Row } from '../components/Row.jsx';
import { ContinueCard } from '../components/Card.jsx';
import { catalog, COUNTS, getItem } from '../lib/catalog.js';
import { kidSafe } from '../lib/categories.js';
import { activeProfile, continueList, useList, useProfiles, useProgress, useRatings } from '../lib/store.js';

export function ContinueRow({ name }) {
  const progress = useProgress();
  const items = continueList(progress).filter((e) => getItem(e.id));
  if (!items.length) return null;
  return (
    <section className="row">
      <div className="row-head">
        <h2>Continue Watching{name ? ` for ${name}` : ''}</h2>
      </div>
      <Scroller className="scroller-wide">
        {items.map((e) => (
          <ContinueCard key={`${e.type}-${e.id}`} entry={e} />
        ))}
      </Scroller>
    </section>
  );
}

function MyListRow({ filter }) {
  const list = useList();
  const items = list.filter((x) => getItem(x.id) && (!filter || filter(x)));
  if (!items.length) return null;
  return <Row title="My List" items={items.map((x) => getItem(x.id))} more="/list" />;
}

/** "Because you watched X" / "Because you liked X" — more in the same genre. */
function BecauseRows({ kids }) {
  const progress = useProgress();
  const ratings = useRatings();
  const seeds = useMemo(() => {
    const out = [];
    const watched = Object.values(progress).sort((a, b) => b.updatedAt - a.updatedAt);
    const liked = Object.values(ratings)
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value || b.at - a.at);
    if (liked[0]) out.push({ verb: liked[0].value === 2 ? 'loved' : 'liked', id: liked[0].id });
    for (const w of watched) if (out.length < 2 && !out.some((o) => o.id === w.id)) out.push({ verb: 'watched', id: w.id });
    return out.map((o) => ({ ...o, item: getItem(o.id) })).filter((o) => o.item);
    // Only compute on mount so rows don't jump while you watch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hidden = new Set([...Object.values(progress).map((p) => p.id), ...Object.values(ratings).map((r) => r.id)]);
  return seeds.map(({ verb, item }, i) => {
    const g = item.genres.filter((x) => x !== 'Silent' && x !== 'Short')[i % 2] || item.genres[0];
    if (!g) return null;
    return (
      <Row
        key={`because-${item.id}`}
        title={`Because you ${verb} ${item.title}`}
        load={() => catalog(undefined, { genre: g, filter: (x) => !hidden.has(x.id) && (!kids || kidSafe(x)) })}
      />
    );
  });
}

function MobileChips() {
  return (
    <div className="home-chips">
      <Link to="/tv" className="chip">
        Series
      </Link>
      <Link to="/movies" className="chip">
        Movies
      </Link>
      <Link to="/categories" className="chip">
        Categories ▾
      </Link>
    </div>
  );
}

function LegalBanner() {
  return (
    <div className="legal-banner">
      <strong>100% legal streaming.</strong> {COUNTS.movies} films and {COUNTS.series} series, all in the public domain or openly licensed, streamed free from the{' '}
      <a href="https://archive.org" target="_blank" rel="noreferrer">
        Internet Archive
      </a>
      . <Link to="/about">How we choose titles</Link>
    </div>
  );
}

function KidsHome({ me }) {
  const [hero, setHero] = useState(null);
  useEffect(() => {
    catalog(undefined, { filter: kidSafe }).then((x) => setHero(x.filter((i) => !i.genres.includes('Short')).slice(0, 8)));
  }, []);
  return (
    <div className="page-home">
      <MobileChips />
      <Hero items={hero} />
      <div className="rows">
        <ContinueRow name={me.name} />
        <Top10Row type="movie" title="Top 10 Family Favorites" filter={kidSafe} />
        <CategoryRow id="cartoons" title="Cartoons Everyone Loves" kids />
        <MyListRow filter={(x) => getItem(x.id)?.kids} />
        <BecauseRows kids />
        <CategoryRow id="kids-laughs" kids />
        <CategoryRow id="kids-adventure" kids />
        <CategoryRow id="kids-westerns" kids />
        <CategoryRow id="kids-all" kids />
      </div>
    </div>
  );
}

export default function Home() {
  const me = activeProfile(useProfiles());
  const [popular, setPopular] = useState(null);

  useEffect(() => {
    document.title = 'NodeVid — Free, Legal Classic Movies & TV';
    if (me.kids) return;
    Promise.all([catalog('movie', { filter: (x) => !x.genres.includes('Short') }), catalog('tv')]).then(([m, t]) => {
      const mixed = [];
      for (let i = 0; i < 4; i++) {
        if (m[i]) mixed.push({ ...m[i], rank: i + 1 });
        if (i < 2 && t[i]) mixed.push({ ...t[i], rank: i + 1 });
      }
      setPopular({ mixed });
    });
  }, [me.kids]);

  if (me.kids) return <KidsHome me={me} />;

  return (
    <div className="page-home">
      <MobileChips />
      <Hero items={popular?.mixed} />
      <div className="rows">
        <LegalBanner />
        <ContinueRow name={me.name} />
        <Top10Row type="movie" />
        <CategoryRow id="trending" />
        <ComingSoonRow />
        <MyListRow />
        <BecauseRows />
        <CategoryRow id="series" title="Series & Classic Shorts" />
        <CategoryRow id="film-noir" />
        <CategoryRow id="horror" />
        <CategoryRow id="screwball" />
        <CategoryRow id="silent" />
        <CategoryRow id="keaton" />
        <CategoryRow id="sci-fi" />
        <CategoryRow id="western" />
        <CategoryRow id="open-movies" />
        <CategoryRow id="adventure" />
        <CategoryRow id="cult" />
        <CategoryRow id="landmarks" />
        <CategoryRow id="mystery" />
        <CategoryRow id="kids-all" title="Kids & Family" />
        <div className="rows-foot">
          <Link to="/categories" className="btn btn-glass">
            Browse all categories
          </Link>
        </div>
      </div>
    </div>
  );
}
