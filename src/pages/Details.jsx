import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { archiveUrl, catalog, getEntry, isUpcoming, matchScore, meta, normalize, releaseLabel, seasonsOf } from '../lib/catalog.js';
import { LICENSES, PD_US } from '../lib/library.js';
import { inList, likedGenres, progressKey, toggleList, useList, useProgress, useRatings, useSettings } from '../lib/store.js';
import { RateButtons, RemindButton } from '../components/Preview.jsx';
import Row from '../components/Row.jsx';
import Img from '../components/Img.jsx';
import { TitleLogo, VideoBackdrop } from '../components/Hero.jsx';
import * as I from '../components/Icons.jsx';

function Episodes({ item, seasons, season, setSeason, entry }) {
  const current = seasons.find((s) => s.season === season) || seasons[0];
  if (!current) return null;
  return (
    <section className="section">
      <div className="section-head">
        <h2>Episodes</h2>
        {seasons.length > 1 ? (
          <select className="select" value={current.season} onChange={(e) => setSeason(Number(e.target.value))}>
            {seasons.map((s) => (
              <option key={s.season} value={s.season}>
                Season {s.season} ({s.episodes.length})
              </option>
            ))}
          </select>
        ) : (
          <span className="muted">{current.episodes.length} episodes</span>
        )}
      </div>
      <div className="episodes">
        {current.episodes.map((ep) => {
          const p = entry?.episodes?.[`${current.season}:${ep.episode}`];
          const isLast = entry?.season === current.season && entry?.episode === ep.episode;
          return (
            <Link key={`${ep.id}-${ep.file || ''}-${ep.episode}`} to={`/watch/tv/${item.id}/${current.season}/${ep.episode}`} className={`episode ${isLast ? 'current' : ''}`}>
              <div className="episode-still">
                <Img srcs={[ep.thumbnail, item.background]} alt="" loading="lazy" />
                <span className="episode-play">
                  <I.Play width={18} height={18} />
                </span>
                <span className="episode-num">E{ep.episode}</span>
                {p && (
                  <div className="ccard-bar">
                    <span style={{ width: `${Math.min(100, p.progress)}%` }} />
                  </div>
                )}
              </div>
              <div className="episode-info">
                <div className="episode-title">
                  {ep.episode}. {ep.name || `Episode ${ep.episode}`}
                  {isLast && <span className="tag">Last watched</span>}
                </div>
                <div className="episode-sub">{[ep.runtime, ep.released?.slice(0, 4)].filter(Boolean).join(' · ')}</div>
              </div>
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
  const [bgVideo, setBgVideo] = useState(false);
  const [muted, setMuted] = useState(true);
  const settings = useSettings();
  const ratings = useRatings();
  const list = useList();
  const progress = useProgress();
  const entry = progress[progressKey(type, id)];
  const def = getEntry(id);

  useEffect(() => {
    setM(null);
    setError(null);
    setBgVideo(false);
    window.scrollTo(0, 0);
    if (!def) {
      document.title = 'Not available — NodeVid';
      setError('This title isn\u2019t in the NodeVid library. NodeVid only offers public-domain and openly licensed films.');
      return;
    }
    document.title = `${def.title} — NodeVid`;
    meta(type, id)
      .then(setM)
      .catch((e) => setError(e.message));
  }, [type, id, def]);

  // Netflix-style: the backdrop turns into a muted clip of the film itself.
  useEffect(() => {
    if (!m || m.upcoming || !settings.previews || window.innerWidth < 700 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => setBgVideo(true), 3000);
    return () => clearTimeout(t);
  }, [m, settings.previews]);

  const item = useMemo(() => (def ? normalize(def) : null), [def]);
  const seasons = useMemo(() => (type === 'tv' && m ? seasonsOf(m) : []), [m, type]);
  const firstSeason = seasons[0]?.season ?? 1;
  const firstEp = seasons[0]?.episodes[0]?.episode ?? 1;
  const season = sp.has('season') ? Number(sp.get('season')) : entry?.season ?? firstSeason;
  const setSeason = (n) => setSp({ season: String(n) }, { replace: true });

  if (error)
    return (
      <div className="container page-pad empty-state">
        <h1>Not available</h1>
        <p>{error}</p>
        <Link to="/" className="btn btn-primary">
          Browse the library
        </Link>
      </div>
    );
  if (!item || !m) return <div className="hero hero-skeleton skeleton" />;

  const saved = inList(list, id, type);
  const upcoming = isUpcoming(item);
  const match = matchScore(item, likedGenres(ratings));
  const lic = LICENSES[item.license] || LICENSES.pd;
  const nEps = seasons.reduce((n, s) => n + s.episodes.length, 0);

  let playHref, playLabel;
  if (type === 'movie') {
    playHref = `/watch/movie/${id}`;
    playLabel = entry && entry.progress > 1 && entry.progress < 95 ? 'Resume' : 'Play';
  } else if (entry) {
    playHref = `/watch/tv/${id}/${entry.season}/${entry.episode}`;
    playLabel = `Resume E${entry.episode}`;
  } else {
    playHref = `/watch/tv/${id}/${firstSeason}/${firstEp}`;
    playLabel = 'Play E1';
  }

  const sameGenre = (x) => x.id !== id && x.genres.some((g) => item.genres.includes(g));

  return (
    <div className="details">
      <section className="details-hero">
        <div className="hero-bg active">
          <Img srcs={[item.background]} alt="" />
        </div>
        {bgVideo && !upcoming && <VideoBackdrop item={item} muted={muted} visible onEnded={() => setBgVideo(false)} />}
        <div className="hero-shade" />
        {bgVideo && !upcoming && (
          <div className="hero-side">
            <button className="round-btn round-btn-lg" onClick={() => setMuted((v) => !v)} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? <I.VolumeX width={20} height={20} /> : <I.Volume width={20} height={20} />}
            </button>
          </div>
        )}
        <div className="details-content">
          {item.poster ? <Img className="details-poster" srcs={[item.poster]} alt={item.title} /> : <div className="details-poster card-fallback">{item.title}</div>}
          <div className="details-main">
            <TitleLogo item={item} />
            <div className="meta-line">
              {upcoming ? <span className="coming">Public domain {releaseLabel(item.date)}</span> : match && <span className="match">{match}% Match</span>}
              {item.yearRange && <span>{item.yearRange}</span>}
              {type === 'movie' && item.runtime && <span className="dot-sep">{item.runtime}</span>}
              {type === 'tv' && nEps > 0 && <span className="dot-sep">{nEps} episodes</span>}
              <a className="badge badge-license" href={lic.url} target="_blank" rel="noreferrer" title={lic.label}>
                {lic.short}
              </a>
              {item.genres.includes('Silent') && <span className="badge badge-muted">Silent</span>}
            </div>
            <div className="genres">
              {item.genres
                .filter((g) => g !== 'Silent')
                .map((g) => (
                  <Link key={g} to={`/${type === 'movie' ? 'movies' : 'tv'}?genre=${encodeURIComponent(g)}`} className="chip chip-sm">
                    {g}
                  </Link>
                ))}
            </div>
            <p className="hero-overview full">{item.description}</p>
            <div className="hero-actions">
              {upcoming ? (
                <RemindButton item={item} className="btn btn-light" label />
              ) : (
                <Link to={playHref} className="btn btn-light">
                  <I.Play width={20} height={20} /> {playLabel}
                </Link>
              )}
              <button className="btn btn-glass" onClick={() => toggleList(item, type)}>
                {saved ? <I.Check width={18} height={18} /> : <I.Plus width={18} height={18} />} {saved ? 'In My List' : 'My List'}
              </button>
              <RateButtons item={item} />
            </div>
            <dl className="facts">
              <dt>Rights</dt>
              <dd>
                {item.license === 'pd' ? PD_US : lic.label}
                {item.license !== 'pd' && (
                  <>
                    {' '}
                    ·{' '}
                    <a href={lic.url} target="_blank" rel="noreferrer">
                      licence
                    </a>
                  </>
                )}
              </dd>
              {item.credit && (
                <>
                  <dt>Credit</dt>
                  <dd>{item.credit}</dd>
                </>
              )}
              {upcoming ? (
                <>
                  <dt>Available</dt>
                  <dd>Enters the US public domain on January 1, {new Date(item.date).getFullYear()}.</dd>
                </>
              ) : (
                <>
                  <dt>Source</dt>
                  <dd>
                    <a href={archiveUrl(item.archiveId)} target="_blank" rel="noreferrer">
                      Internet Archive
                    </a>
                  </dd>
                </>
              )}
            </dl>
          </div>
        </div>
      </section>

      <div className="rows details-rows">
        {type === 'tv' && seasons.length > 0 && <Episodes item={item} seasons={seasons} season={season} setSeason={setSeason} entry={entry} />}
        <Row key={`like-${id}`} title="More Like This" load={() => catalog(undefined, { filter: sameGenre })} />
        {item.genres[0] && (
          <Row
            key={`g1-${id}`}
            title={`More ${item.genres[0]}`}
            load={() => catalog(undefined, { genre: item.genres[0] })}
            exclude={id}
            more={`/movies?genre=${encodeURIComponent(item.genres[0])}`}
          />
        )}
        <Row key={`era-${id}`} title={`More from the ${item.year ? `${item.year.slice(0, 3)}0s` : 'archive'}`} load={() => catalog(undefined, { list: 'decade', genre: item.year ? `${item.year.slice(0, 3)}0s` : undefined })} exclude={id} />
      </div>
    </div>
  );
}
