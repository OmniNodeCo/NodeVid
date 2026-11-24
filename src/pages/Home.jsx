import { useEffect, useState } from 'react';
import Hero from '../components/Hero.jsx';
import Row, { Scroller } from '../components/Row.jsx';
import { ContinueCard } from '../components/Card.jsx';
import { tmdb } from '../lib/tmdb.js';
import { continueList, useList, useProgress } from '../lib/store.js';
import { PosterCard } from '../components/Card.jsx';

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
  return (
    <section className="row">
      <div className="row-head">
        <h2>My List</h2>
      </div>
      <Scroller>
        {list.map((it) => (
          <PosterCard key={`${it.type}-${it.id}`} item={it} type={it.type} />
        ))}
      </Scroller>
    </section>
  );
}

export default function Home() {
  const [trending, setTrending] = useState(null);

  useEffect(() => {
    document.title = 'NodeVid — Watch Movies & TV Shows';
    tmdb('trending/all/day')
      .then((d) => setTrending(d.results.filter((x) => x.media_type !== 'person')))
      .catch(() => setTrending([]));
  }, []);

  return (
    <div className="page-home">
      <Hero items={trending} />
      <div className="rows">
        <ContinueRow />
        <Row title="Trending Today" items={trending?.filter((x) => x.poster_path)} />
        <MyListRow />
        <Row title="Popular Movies" path="movie/popular" type="movie" more="/movies" />
        <Row title="Popular TV Shows" path="tv/popular" type="tv" more="/tv" />
        <Row title="Now Playing in Theaters" path="movie/now_playing" type="movie" />
        <Row title="Top Rated Movies" path="movie/top_rated" type="movie" more="/movies?sort=vote_average.desc" />
        <Row title="Top Rated TV Shows" path="tv/top_rated" type="tv" more="/tv?sort=vote_average.desc" />
        <Row
          title="Popular Anime"
          path="discover/tv"
          params={{ with_genres: 16, with_original_language: 'ja', sort_by: 'popularity.desc' }}
          type="tv"
          more="/anime"
        />
        <Row title="Action & Adventure" path="discover/movie" params={{ with_genres: 28, sort_by: 'popularity.desc' }} type="movie" more="/movies?genre=28" />
        <Row title="Comedy" path="discover/movie" params={{ with_genres: 35, sort_by: 'popularity.desc' }} type="movie" more="/movies?genre=35" />
        <Row title="Horror" path="discover/movie" params={{ with_genres: 27, sort_by: 'popularity.desc' }} type="movie" more="/movies?genre=27" />
        <Row title="Sci-Fi & Fantasy Series" path="discover/tv" params={{ with_genres: 10765, sort_by: 'popularity.desc' }} type="tv" more="/tv?genre=10765" />
        <Row title="Crime TV" path="discover/tv" params={{ with_genres: 80, sort_by: 'popularity.desc' }} type="tv" more="/tv?genre=80" />
        <Row title="Documentaries" path="discover/movie" params={{ with_genres: 99, sort_by: 'popularity.desc' }} type="movie" more="/movies?genre=99" />
      </div>
    </div>
  );
}
