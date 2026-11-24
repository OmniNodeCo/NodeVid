import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { isTmdbId, isUpcoming, matchScore, meta, normalize, releaseLabel, seasonsOf, sized } from '../lib/catalog.js';
import { vidsrcInfo } from '../lib/servers.js';
import { inList, likedGenres, progressKey, toggleList, useList, useProgress, useRatings, useSettings } from '../lib/store.js';
import { RateButtons, RemindButton } from '../components/Preview.jsx';
import Row from '../components/Row.jsx';
import Img from '../components/Img.jsx';
import { TitleLogo, TrailerBackdrop } from '../components/Hero.jsx';
import * as I from '../components/Icons.jsx';

function TrailerModal({ ytId, onClose }) {
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
          src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`}
          title="Trailer"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  );
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '');

function Episodes({ item, seasons, season, setSeason, entry }) {
  const now = Date.now();
  const current = seasons.find((s) => s.season === season) || seasons[0];
  if (!current) return null;
  return (
    <section className="section">
      <div className="section-head">
        <h2>Episodes</h2>
        <select className="select" value={current.season} onChange={(e) => setSeason(Number(e.target.value))}>
          {seasons.map((s) => (
            <option key={s.season} value={s.season}>
              {s.season === 0 ? 'Specials' : `Season ${s.season}`} ({s.episodes.length})
            </option>
          ))}
        </select>
      </div>
      <div className="episodes">
        {current.episodes.map((ep) => {
          const p = entry?.episodes?.[`${current.season}:${ep.episode}`];
          const isLast = entry?.season === current.season && entry?.episode === ep.episode;
          const date = ep.released || ep.firstAired;
          const upcoming = date && new Date(date).getTime() > now;
          const content = (
            <>
              <div className="episode-still">
                <Img
                  srcs={[ep.thumbnail, ...sized(item.background, 'medium')]}
                  alt=""
                  loading="lazy"
                  className={ep.thumbnail ? '' : 'dim'}
                />
                {!upcoming && (
                  <span className="episode-play">
                    <I.Play width={18} height={18} />
                  </span>
                )}
                <span className="episode-num">E{ep.episode}</span>
                {p && (
                  <div className="ccard-bar">
                    <span style={{ width: `${Math.min(100, p.progress)}%` }} />
                  </div>
                )}
              </div>
              <div className="episode-info">
                <div className="episode-title">
                  {ep.episode}. {ep.name || ep.title || `Episode ${ep.episode}`}
                  {isLast && <span className="tag">Last watched</span>}
                </div>
                <div className="episode-sub">
                  {upcoming ? `Airs ${fmtDate(date)}` : fmtDate(date)}
                  {parseFloat(ep.rating) > 0 && (
                    <span className="episode-rating">
                      <I.Star width={11} height={11} /> {parseFloat(ep.rating).toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="episode-overview">{ep.overview || ep.description || 'No description available.'}</p>
              </div>
            </>
          );
          return upcoming ? (
            <div key={ep.id || ep.episode} className="episode upcoming">
              {content}
            </div>
          ) : (
            <Link
              key={ep.id || ep.episode}
              to={`/watch/tv/${item.id}/${current.season}/${ep.episode}`}
              className={`episode ${isLast ? 'current' : ''}`}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function Details({ type }) {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const [m, setM] = useState(null);
  const [error, setError] = useState(null);
  const [trailer, setTrailer] = useState(false);
  const [vs, setVs] = useState(null);
  const [bgTrailer, setBgTrailer] = useState(false);
  const [muted, setMuted] = useState(true);
  const settings = useSettings();
  const ratings = useRatings();
  const list = useList();
  const progress = useProgress();
  const entry = progress[progressKey(type, id)];

  useEffect(() => {
    setM(null);
    setError(null);
    window.scrollTo(0, 0);
    if (isTmdbId(id)) return;
    meta(type, id)
      .then((data) => {
        setM(data);
        document.title = `${data.name} — NodeVid`;
      })
      .catch((e) => setError(e.message));
    setVs(null);
    setBgTrailer(false);
    vidsrcInfo(type, id).then(setVs);
  }, [type, id]);

  // Netflix-style: the backdrop turns into a muted trailer after a moment.
  useEffect(() => {
    if (!m || !settings.previews || window.innerWidth < 700 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => setBgTrailer(true), 3500);
    return () => clearTimeout(t);
  }, [m, settings.previews]);

  const item = useMemo(() => (m ? { ...normalize(m, type), id } : null), [m, type, id]);
  const seasons = useMemo(() => (type === 'tv' && m ? seasonsOf(m) : []), [m, type]);
  const firstSeason = seasons.find((s) => s.season > 0)?.season ?? seasons[0]?.season ?? 1;
  const season = sp.has('season') ? Number(sp.get('season')) : entry?.season ?? firstSeason;
  const setSeason = (n) => setSp({ season: String(n) }, { replace: true });

  // Bare TMDB ids have no catalog metadata — offer to play directly.
  if (isTmdbId(id)) {
    return (
      <div className="container page-pad empty-state">
        <h1>TMDB #{id}</h1>
        <p>This title was opened by ID, so there&apos;s no catalog info — but it can still be played.</p>
        <Link to={type === 'tv' ? `/watch/tv/${id}/1/1` : `/watch/movie/${id}`} className="btn btn-primary">
          <I.Play width={18} height={18} /> Play
        </Link>
      </div>
    );
  }
  if (error)
    return (
      <div className="container page-pad">
        <p className="empty">Couldn&apos;t load this title: {error}</p>
      </div>
    );
  if (!item) return <div className="hero hero-skeleton skeleton" />;

  const saved = inList(list, id, type);
  const ytId = m.trailers?.find((t) => t.type === 'Trailer')?.source || m.trailers?.[0]?.source || m.trailerStreams?.[0]?.ytId;
  const directors = Array.isArray(m.director) ? m.director.join(', ') : m.director;
  const writers = Array.isArray(m.writer) ? m.writer.slice(0, 3).join(', ') : m.writer;
  const cast = m.cast || [];
  const nSeasons = seasons.filter((s) => s.season > 0).length;
  const upcoming = isUpcoming(item);
  const match = matchScore(item, likedGenres(ratings));
  const remindItem = { ...item, date: upcoming ? item.released : item.nextEp?.date, kind: upcoming ? (type === 'tv' ? 'series' : 'movie') : item.nextEp ? 'season' : null, season: item.nextEp?.season };

  let playHref, playLabel;
  if (type === 'movie') {
    playHref = `/watch/movie/${id}`;
    playLabel = entry && entry.progress > 1 && entry.progress < 95 ? 'Resume' : 'Watch Now';
  } else if (entry) {
    playHref = `/watch/tv/${id}/${entry.season}/${entry.episode}`;
    playLabel = `Resume S${entry.season} E${entry.episode}`;
  } else {
    playHref = `/watch/tv/${id}/${firstSeason}/1`;
    playLabel = `Play S${firstSeason} E1`;
  }

  return (
    <div className="details">
      <section className="details-hero">
        <div className="hero-bg active">
          <Img srcs={sized(item.background, 'large')} alt="" />
        </div>
        {bgTrailer && ytId && !trailer && <TrailerBackdrop ytId={ytId} muted={muted} visible onEnded={() => setBgTrailer(false)} />}
        <div className="hero-shade" />
        {bgTrailer && ytId && !trailer && (
          <div className="hero-side">
            <button className="round-btn round-btn-lg" onClick={() => setMuted((v) => !v)} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? <I.VolumeX width={20} height={20} /> : <I.Volume width={20} height={20} />}
            </button>
          </div>
        )}
        <div className="details-content">
          <Img className="details-poster" srcs={sized(item.poster, 'medium')} alt={item.title} />
          <div className="details-main">
            <TitleLogo item={item} />
            <div className="meta-line">
              {upcoming ? <span className="coming">Coming {releaseLabel(item.released)}</span> : match && <span className="match">{match}% Match</span>}
              {item.rating > 0 && (
                <span className="pill pill-rating">
                  <I.Star width={12} height={12} /> {item.rating.toFixed(1)}
                </span>
              )}
              {item.yearRange && <span>{item.yearRange}</span>}
              {type === 'movie' && item.runtime && <span className="dot-sep">{item.runtime}</span>}
              {type === 'tv' && nSeasons > 0 && (
                <span className="dot-sep">
                  {nSeasons} Season{nSeasons > 1 ? 's' : ''}
                </span>
              )}
              {m.status && type === 'tv' && <span className="dot-sep">{m.status}</span>}
              {vs?.available && vs.quality && <span className="badge">{vs.quality}</span>}
            </div>
            <div className="genres">
              {item.genres.map((g) => (
                <Link key={g} to={`/${type === 'movie' ? 'movies' : 'tv'}?genre=${encodeURIComponent(g)}`} className="chip chip-sm">
                  {g}
                </Link>
              ))}
            </div>
            {item.nextEp && !upcoming && (
              <div className="next-ep">
                <I.Calendar width={16} height={16} />
                {item.nextEp.episode === 1 ? `Season ${item.nextEp.season} premieres` : `New episode S${item.nextEp.season} E${item.nextEp.episode}`}{' '}
                {new Date(item.nextEp.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            )}
            <p className="hero-overview full">{item.description}</p>
            <div className="hero-actions">
              {upcoming ? (
                <RemindButton item={remindItem} className="btn btn-light" label />
              ) : (
                <Link to={playHref} className="btn btn-light">
                  <I.Play width={20} height={20} /> {playLabel}
                </Link>
              )}
              {!upcoming && item.nextEp && <RemindButton item={remindItem} className="btn btn-glass" label />}
              {ytId && (
                <button className="btn btn-glass" onClick={() => setTrailer(true)}>
                  <I.Youtube width={18} height={18} /> Trailer
                </button>
              )}
              <button className="btn btn-glass" onClick={() => toggleList(item, type)}>
                {saved ? <I.Check width={18} height={18} /> : <I.Plus width={18} height={18} />} {saved ? 'In My List' : 'My List'}
              </button>
              <RateButtons item={item} />
            </div>
            <dl className="facts">
              {cast.length > 0 && (
                <>
                  <dt>Starring</dt>
                  <dd>{cast.slice(0, 5).join(', ')}</dd>
                </>
              )}
              {directors && (
                <>
                  <dt>Director</dt>
                  <dd>{directors}</dd>
                </>
              )}
              {writers && (
                <>
                  <dt>Writers</dt>
                  <dd>{writers}</dd>
                </>
              )}
              {m.country && (
                <>
                  <dt>Country</dt>
                  <dd>{m.country}</dd>
                </>
              )}
              {m.awards && (
                <>
                  <dt>Awards</dt>
                  <dd>{m.awards}</dd>
                </>
              )}
            </dl>
          </div>
        </div>
      </section>

      <div className="rows details-rows">
        {type === 'tv' && seasons.length > 0 && <Episodes item={item} seasons={seasons} season={season} setSeason={setSeason} entry={entry} />}
        {item.genres.length > 1 && (
          <Row
            key={`like-${id}`}
            title="More Like This"
            type={type}
            query={{ genre: item.genres[1] }}
            filter={(x) => x.genres?.includes(item.genres[0])}
            exclude={id}
          />
        )}
        {item.genres[0] && (
          <Row
            key={`g1-${id}`}
            title={`More ${item.genres[0]} ${type === 'tv' ? 'Series' : 'Movies'}`}
            type={type}
            query={{ genre: item.genres[0] }}
            exclude={id}
            more={`/${type === 'movie' ? 'movies' : 'tv'}?genre=${encodeURIComponent(item.genres[0])}`}
          />
        )}
        {item.genres[1] && (
          <Row
            key={`g2-${id}`}
            title={`Top Rated ${item.genres[1]}`}
            type={type}
            query={{ list: 'imdbRating', genre: item.genres[1] }}
            exclude={id}
          />
        )}
      </div>

      {trailer && ytId && <TrailerModal ytId={ytId} onClose={() => setTrailer(false)} />}
    </div>
  );
}
