import { useEffect, useState } from 'react';
import Hero from '../components/Hero.jsx';
import Row, { Scroller } from '../components/Row.jsx';
import { ContinueCard, PosterCard } from '../components/Card.jsx';
import { catalog, YEARS } from '../lib/catalog.js';
import { continueList, useList, useProgress } from '../lib/store.js';

export function ContinueRow() {
  const progress = useProgress();
  const items = continueList(progress);
  if (!items.length) return null;
  return (
    <section className="row">
      <div className="row-head">
        <h2>Continue Watching</h2>
      </div>
      <Scroller className="scroller-wide">
        {items.map((e) => (
          <ContinueCard key={`${e.type}-${e.id}`} entry={e} />
        ))}
      </Scroller>
    </section>
  );
}

function MyListRow() {
  const list = useList();
  if (!list.length) return null;
  return <Row title="My List" items={list} more="/list" />;
}

export default function Home() {
  const [popular, setPopular] = useState(null);

  useEffect(() => {
    document.title = 'NodeVid — Watch Movies & TV Shows';
    Promise.all([catalog('movie').catch(() => []), catalog('tv').catch(() => [])]).then(([m, t]) => {
      const mixed = [];
      for (let i = 0; i < 6; i++) {
        if (m[i]) mixed.push(m[i]);
        if (t[i]) mixed.push(t[i]);
      }
      setPopular({ mixed, movies: m, shows: t });
    });
  }, []);

  return (
    <div className="page-home">
      <Hero items={popular?.mixed} />
      <div className="rows">
        <ContinueRow />
        <Row title="Popular Movies" items={popular?.movies.slice(0, 30)} more="/movies" />
        <Row title="Popular Series" items={popular?.shows.slice(0, 30)} more="/tv" />
        <MyListRow />
        <Row title={`New in ${YEARS[0]}`} type="movie" query={{ list: 'year', genre: YEARS[0] }} more={`/movies?sort=year&year=${YEARS[0]}`} />
        <Row title="Top Rated Movies" type="movie" query={{ list: 'imdbRating' }} more="/movies?sort=imdbRating" />
        <Row title="Top Rated Series" type="tv" query={{ list: 'imdbRating' }} more="/tv?sort=imdbRating" />
        <Row title="Animation" type="tv" query={{ genre: 'Animation' }} more="/animation" />
        <Row title="Action Movies" type="movie" query={{ genre: 'Action' }} more="/movies?genre=Action" />
        <Row title="Comedy Movies" type="movie" query={{ genre: 'Comedy' }} more="/movies?genre=Comedy" />
        <Row title="Horror Movies" type="movie" query={{ genre: 'Horror' }} more="/movies?genre=Horror" />
        <Row title="Sci-Fi Series" type="tv" query={{ genre: 'Sci-Fi' }} more="/tv?genre=Sci-Fi" />
        <Row title="Crime Series" type="tv" query={{ genre: 'Crime' }} more="/tv?genre=Crime" />
        <Row title="Animated Movies" type="movie" query={{ genre: 'Animation' }} more="/animation?format=movie" />
        <Row title="Documentaries" type="movie" query={{ genre: 'Documentary' }} more="/movies?genre=Documentary" />
      </div>
    </div>
  );
}
