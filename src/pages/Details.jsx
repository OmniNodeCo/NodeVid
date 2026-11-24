import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { certificationOf, formatRuntime, img, pickLogo, pickTrailer, tmdb, titleOf, yearOf } from '../lib/tmdb.js';
import { inList, progressKey, toggleList, useList, useProgress } from '../lib/store.js';
import Row, { Scroller } from '../components/Row.jsx';
import * as I from '../components/Icons.jsx';

function TrailerModal({ video, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-body" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <I.X />
        </button>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.key}?autoplay=1&rel=0`}
          title={video.name}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  );
}

function Episodes({ show, season, setSeason, entry }) {
  const [data, setData] = useState(null);
  const seasons = (show.seasons || []).filter((s) => s.episode_count > 0);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setData(null);
    tmdb(`tv/${show.id}/season/${season}`)
      .then(setData)
      .catch(() => setData({ episodes: [] }));
  }, [show.id, season]);

  return (
    <section className="section">
      <div className="section-head">
        <h2>Episodes</h2>
        <select className="select" value={season} onChange={(e) => setSeason(Number(e.target.value))}>
          {seasons.map((s) => (
            <option key={s.id} value={s.season_number}>
              {s.name || `Season ${s.season_number}`} ({s.episode_count})
            </option>
          ))}
        </select>
      </div>
      <div className="episodes">
        {!data &&
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="episode">
              <div className="episode-still skeleton" />
              <div className="episode-info">
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line short" />
              </div>
            </div>
          ))}
        {data?.episodes?.map((ep) => {
          const p = entry?.episodes?.[`${season}:${ep.episode_number}`];
          const current = entry?.season === season && entry?.episode === ep.episode_number;
          const upcoming = ep.air_date && ep.air_date > today;
          const content = (
            <>
              <div className="episode-still">
                {ep.still_path ? (
                  <img src={img(ep.still_path, 'w300')} alt="" loading="lazy" />
                ) : (
                  <img src={img(show.backdrop_path, 'w300')} alt="" loading="lazy" className="dim" />
                )}
                {!upcoming && (
                  <span className="episode-play">
                    <I.Play width={18} height={18} />
                  </span>
                )}
                <span className="episode-num">E{ep.episode_number}</span>
                {p && (
                  <div className="ccard-bar">
                    <span style={{ width: `${Math.min(100, p.progress)}%` }} />
                  </div>
                )}
              </div>
              <div className="episode-info">
                <div className="episode-title">
                  {ep.episode_number}. {ep.name}
                  {current && <span className="tag">Last watched</span>}
                </div>
                <div className="episode-sub">
                  {upcoming ? `Airs ${new Date(ep.air_date).toLocaleDateString()}` : [formatRuntime(ep.runtime), ep.air_date && new Date(ep.air_date).toLocaleDateString()].filter(Boolean).join(' • ')}
                  {ep.vote_average > 0 && (
                    <span className="episode-rating">
                      <I.Star width={11} height={11} /> {ep.vote_average.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="episode-overview">{ep.overview || 'No description available.'}</p>
              </div>
            </>
          );
          return upcoming ? (
            <div key={ep.id} className="episode upcoming">
              {content}
            </div>
          ) : (
            <Link key={ep.id} to={`/watch/tv/${show.id}/${season}/${ep.episode_number}`} className={`episode ${current ? 'current' : ''}`}>
              {content}
            </Link>
          );
        })}
        {data && !data.episodes?.length && <p className="empty">No episodes listed for this season.</p>}
      </div>
    </section>
  );
}

export default function Details({ type }) {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [trailer, setTrailer] = useState(false);
  const list = useList();
  const progress = useProgress();
  const entry = progress[progressKey(type, id)];

  useEffect(() => {
    setD(null);
    setError(null);
    window.scrollTo(0, 0);
    tmdb(`${type}/${id}`, {
      append_to_response: `videos,images,credits,external_ids,${type === 'movie' ? 'release_dates' : 'content_ratings'}`,
      include_image_language: 'en,null',
    })
      .then((data) => {
        setD(data);
        document.title = `${titleOf(data)} — NodeVid`;
      })
      .catch((e) => setError(e.message));
  }, [type, id]);

  const firstSeason = d?.seasons?.find((s) => s.season_number > 0 && s.episode_count > 0)?.season_number ?? d?.seasons?.[0]?.season_number ?? 1;
  const season = Number(sp.get('season')) || entry?.season || firstSeason;
  const setSeason = (n) => setSp({ season: String(n) }, { replace: true });

  if (error)
    return (
      <div className="container page-pad">
        <p className="empty">Couldn&apos;t load this title: {error}</p>
      </div>
    );
  if (!d) return <div className="hero hero-skeleton skeleton" />;

  const logo = pickLogo(d.images);
  const video = pickTrailer(d.videos);
  const cert = certificationOf(d, type);
  const saved = inList(list, d.id, type);
  const runtime = type === 'movie' ? formatRuntime(d.runtime) : d.number_of_seasons ? `${d.number_of_seasons} Season${d.number_of_seasons > 1 ? 's' : ''}` : '';
  const director = d.credits?.crew?.find((c) => c.job === 'Director');
  const creators = d.created_by?.map((c) => c.name).join(', ');
  const cast = (d.credits?.cast || []).slice(0, 20);

  let playHref, playLabel;
  if (type === 'movie') {
    playHref = `/watch/movie/${d.id}`;
    playLabel = entry && entry.progress > 1 && entry.progress < 95 ? 'Resume' : 'Watch Now';
  } else if (entry) {
    playHref = `/watch/tv/${d.id}/${entry.season}/${entry.episode}`;
    playLabel = `Resume S${entry.season} E${entry.episode}`;
  } else {
    playHref = `/watch/tv/${d.id}/${firstSeason}/1`;
    playLabel = `Play S${firstSeason} E1`;
  }

  return (
    <div className="details">
      <section className="details-hero">
        <div className="hero-bg active">{d.backdrop_path && <img src={img(d.backdrop_path, 'original')} alt="" />}</div>
        <div className="hero-shade" />
        <div className="details-content">
          {d.poster_path && <img className="details-poster" src={img(d.poster_path, 'w500')} alt={titleOf(d)} />}
          <div className="details-main">
            {logo ? <img className="hero-logo" src={img(logo.file_path, 'w500')} alt={titleOf(d)} /> : <h1 className="hero-title">{titleOf(d)}</h1>}
            <div className="meta-line">
              {d.vote_average > 0 && (
                <span className="pill pill-rating">
                  <I.Star width={12} height={12} /> {d.vote_average.toFixed(1)}
                </span>
              )}
              {cert && <span className="pill pill-outline">{cert}</span>}
              <span>{yearOf(d)}</span>
              {runtime && <span className="dot-sep">{runtime}</span>}
              {type === 'tv' && d.status && <span className="dot-sep">{d.status}</span>}
            </div>
            <div className="genres">
              {d.genres?.map((g) => (
                <Link key={g.id} to={`/${type === 'movie' ? 'movies' : 'tv'}?genre=${g.id}`} className="chip chip-sm">
                  {g.name}
                </Link>
              ))}
            </div>
            {d.tagline && <p className="tagline">“{d.tagline}”</p>}
            <p className="hero-overview full">{d.overview}</p>
            <div className="hero-actions">
              <Link to={playHref} className="btn btn-primary">
                <I.Play width={18} height={18} /> {playLabel}
              </Link>
              {video && (
                <button className="btn btn-glass" onClick={() => setTrailer(true)}>
                  <I.Youtube width={18} height={18} /> Trailer
                </button>
              )}
              <button className="btn btn-glass" onClick={() => toggleList(d, type)}>
                {saved ? <I.Check width={18} height={18} /> : <I.Plus width={18} height={18} />} {saved ? 'In My List' : 'My List'}
              </button>
            </div>
            <dl className="facts">
              {director && (
                <>
                  <dt>Director</dt>
                  <dd>{director.name}</dd>
                </>
              )}
              {creators && (
                <>
                  <dt>Created by</dt>
                  <dd>{creators}</dd>
                </>
              )}
              {cast.length > 0 && (
                <>
                  <dt>Starring</dt>
                  <dd>
                    {cast
                      .slice(0, 4)
                      .map((c) => c.name)
                      .join(', ')}
                  </dd>
                </>
              )}
              {d.networks?.length > 0 && (
                <>
                  <dt>Network</dt>
                  <dd>{d.networks.map((n) => n.name).join(', ')}</dd>
                </>
              )}
            </dl>
          </div>
        </div>
      </section>

      <div className="rows details-rows">
        {type === 'tv' && <Episodes show={d} season={season} setSeason={setSeason} entry={entry} />}

        {cast.length > 0 && (
          <section className="row">
            <div className="row-head">
              <h2>Cast</h2>
            </div>
            <Scroller>
              {cast.map((c) => (
                <div className="person" key={c.credit_id}>
                  <div className="person-img">
                    {c.profile_path ? <img src={img(c.profile_path, 'w185')} alt={c.name} loading="lazy" /> : <span>{c.name.slice(0, 1)}</span>}
                  </div>
                  <div className="person-name">{c.name}</div>
                  <div className="person-role">{c.character || c.roles?.[0]?.character}</div>
                </div>
              ))}
            </Scroller>
          </section>
        )}

        <Row title="More Like This" path={`${type}/${d.id}/recommendations`} type={type} key={`rec-${d.id}`} />
        <Row title="Similar Titles" path={`${type}/${d.id}/similar`} type={type} key={`sim-${d.id}`} />
      </div>

      {trailer && video && <TrailerModal video={video} onClose={() => setTrailer(false)} />}
    </div>
  );
}
