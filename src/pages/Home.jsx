import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero.jsx';
import Row, { CategoryRow, ComingSoonRow, Scroller, Top10Row } from '../components/Row.jsx';
import { ContinueCard, PosterCard } from '../components/Card.jsx';
import { catalog, meta, newReleases, normalize } from '../lib/catalog.js';
import { kidSafe } from '../lib/categories.js';
import { vidsrcLatest } from '../lib/servers.js';
import { activeProfile, continueList, useList, useProfiles, useProgress, useRatings } from '../lib/store.js';

export function ContinueRow({ name }) {
  const progress = useProgress();
  const items = continueList(progress);
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
  const items = filter ? list.filter(filter) : list;
  if (!items.length) return null;
  return <Row title="My List" items={items} more="/list" />;
}

/** "Because you watched X" / "Because you liked X" — top titles in the same genre. */
function BecauseRows({ kids }) {
  const progress = useProgress();
  const ratings = useRatings();
  const seeds = useMemo(() => {
    const out = [];
    const watched = Object.values(progress).sort((a, b) => b.updatedAt - a.updatedAt);
    const liked = Object.values(ratings)
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value || b.at - a.at);
    if (liked[0]) out.push({ verb: liked[0].value === 2 ? 'loved' : 'liked', item: liked[0] });
    for (const w of watched) if (out.length < 2 && !out.some((o) => o.item.id === w.id)) out.push({ verb: 'watched', item: w });
    return out;
    // Only compute on mount so rows don't jump while you watch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [genres, setGenres] = useState({});

  // Progress entries don't store genres; look them up once.
  useEffect(() => {
    seeds.forEach(({ item }) => {
      if (item.genres?.length) return setGenres((g) => ({ ...g, [item.id]: item.genres }));
      meta(item.type, item.id)
        .then((m) => setGenres((g) => ({ ...g, [item.id]: normalize(m, item.type).genres })))
        .catch(() => {});
    });
  }, [seeds]);

  const hidden = new Set([...Object.values(progress).map((p) => p.id), ...Object.values(ratings).map((r) => r.id)]);
  return seeds.map(({ verb, item }, i) => {
    const g = genres[item.id]?.[i % 2 === 0 ? 0 : 1] || genres[item.id]?.[0];
    if (!g) return null;
    return (
      <Row
        key={`because-${item.id}`}
        title={`Because you ${verb} ${item.title}`}
        type={item.type}
        query={{ list: i % 2 ? 'imdbRating' : 'top', genre: g }}
        filter={(x) => !hidden.has(x.id) && (!kids || kidSafe(x))}
      />
    );
  });
}

function MobileChips() {
  return (
    <div className="home-chips">
      <Link to="/tv" className="chip">
        TV Shows
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

const newEpisodeCard = (it) => (
  <PosterCard key={`ep-${it.id}`} item={it} href={`/watch/tv/${it.id}/${it.season}/${it.episode}`} sub={`S${it.season} E${it.episode}`} badge={it.quality} ribbon="New Episode" />
);

function KidsHome({ me }) {
  const [hero, setHero] = useState(null);
  useEffect(() => {
    Promise.all([catalog('movie', { genre: 'Family' }).catch(() => []), catalog('tv', { genre: 'Animation' }).catch(() => [])]).then(([m, t]) => {
      const mixed = [];
      const ms = m.filter(kidSafe);
      const ts = t.filter(kidSafe);
      for (let i = 0; i < 5; i++) mixed.push(ms[i], ts[i]);
      setHero(mixed.filter(Boolean));
    });
  }, []);
  const family = (x) => kidSafe(x) && x.genres?.some((g) => g === 'Family' || g === 'Animation');
  return (
    <div className="page-home">
      <MobileChips />
      <Hero items={hero} />
      <div className="rows">
        <ContinueRow name={me.name} />
        <Top10Row type="movie" title="Top 10 Family Movies Today" query={{ genre: 'Family' }} filter={kidSafe} />
        <CategoryRow id="cartoons" title="Cartoons Everyone Loves" kids />
        <ComingSoonRow filter={family} />
        <MyListRow filter={kidSafe} />
        <BecauseRows kids />
        <CategoryRow id="family" kids />
        <CategoryRow id="animated-movies" kids />
        <Top10Row type="tv" title="Top 10 Kids Shows Today" query={{ genre: 'Animation' }} filter={kidSafe} />
        <CategoryRow id="kids-tv" kids />
        <CategoryRow id="family-adventures" kids />
        <CategoryRow id="family-fantasy" kids />
        <CategoryRow id="anime-movies" title="Anime Adventures" kids />
      </div>
    </div>
  );
}

export default function Home() {
  const me = activeProfile(useProfiles());
  const [popular, setPopular] = useState(null);

  useEffect(() => {
    document.title = 'NodeVid — Watch Movies & TV Shows';
    if (me.kids) return;
    Promise.all([catalog('movie').catch(() => []), catalog('tv').catch(() => [])]).then(([m, t]) => {
      const mixed = [];
      for (let i = 0; i < 4; i++) {
        if (m[i]) mixed.push({ ...m[i], rank: i + 1 });
        if (t[i]) mixed.push({ ...t[i], rank: i + 1 });
      }
      const trending = [];
      for (let i = 10; i < 30; i++) trending.push(t[i], m[i]);
      setPopular({ mixed, trending: trending.filter(Boolean) });
    });
  }, [me.kids]);

  if (me.kids) return <KidsHome me={me} />;

  return (
    <div className="page-home">
      <MobileChips />
      <Hero items={popular?.mixed} />
      <div className="rows">
        <ContinueRow name={me.name} />
        <Top10Row type="movie" />
        <Row title="Trending Now" items={popular?.trending} />
        <ComingSoonRow />
        <Row title="New Releases" load={() => newReleases()} card={(it) => <PosterCard key={`nr-${it.id}`} item={it} ribbon={Date.now() - Date.parse(it.released) < 14 * 864e5 ? 'New' : null} />} />
        <MyListRow />
        <BecauseRows />
        <Row title="New Episodes" load={() => vidsrcLatest('episodes')} card={newEpisodeCard} more="/new?tab=episodes" />
        <Top10Row type="tv" title="Top 10 TV Shows Today" />
        <CategoryRow id="binge-worthy" />
        <CategoryRow id="acclaimed-movies" />
        <CategoryRow id="superhero" />
        <CategoryRow id="crime-tv" />
        <CategoryRow id="comedy" />
        <CategoryRow id="k-drama" />
        <CategoryRow id="thriller" />
        <CategoryRow id="anime" />
        <CategoryRow id="romcom" />
        <CategoryRow id="scifi-tv" />
        <CategoryRow id="horror" />
        <CategoryRow id="award-winning-movies" />
        <CategoryRow id="docuseries" />
        <CategoryRow id="90s" />
        <CategoryRow id="reality" />
        <CategoryRow id="british-tv" />
        <CategoryRow id="family" />
        <CategoryRow id="biography" />
        <CategoryRow id="2000s" />
        <CategoryRow id="bollywood" />
        <CategoryRow id="documentary" />
        <CategoryRow id="80s" />
        <Row
          title="Recently Added Movies"
          load={() => vidsrcLatest('movies')}
          card={(it) => <PosterCard key={`m-${it.id}`} item={it} badge={it.quality} />}
        />
        <div className="rows-foot">
          <Link to="/categories" className="btn btn-glass">
            Browse all categories
          </Link>
        </div>
      </div>
    </div>
  );
}
