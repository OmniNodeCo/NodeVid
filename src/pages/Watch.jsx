import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isTmdbId, meta, normalize, seasonsOf, vidkingUrl } from '../lib/catalog.js';
import { getResumeTime, saveProgress, touchProgress, useProgress, useSettings, progressKey } from '../lib/store.js';
import Img from '../components/Img.jsx';
import * as I from '../components/Icons.jsx';

function parseMessage(raw) {
  let msg = raw;
  if (typeof msg === 'string') {
    try {
      msg = JSON.parse(msg);
    } catch {
      return null;
    }
  }
  if (!msg || msg.type !== 'PLAYER_EVENT' || !msg.data) return null;
  return msg.data;
}

export default function Watch({ type }) {
  const params = useParams();
  const id = params.id;
  const season = Number(params.season ?? 1);
  const episode = Number(params.episode) || 1;
  const navigate = useNavigate();
  const settings = useSettings();
  const progress = useProgress();

  // Resolve the id Vidking needs: TMDB id from the catalog, or the bare id given.
  const [m, setM] = useState(null);
  const [embedId, setEmbedId] = useState(isTmdbId(id) ? id : null);
  const [drawer, setDrawer] = useState(false);
  const [drawerSeason, setDrawerSeason] = useState(season);
  const [upNext, setUpNext] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setM(null);
    if (isTmdbId(id)) {
      setEmbedId(id);
      return;
    }
    setEmbedId(null);
    let alive = true;
    meta(type, id)
      .then((d) => {
        if (!alive) return;
        setM(d);
        setEmbedId(String(d.moviedb_id || id));
      })
      .catch(() => alive && setEmbedId(id)); // fall back to the IMDb id
    return () => {
      alive = false;
    };
  }, [type, id]);

  const item = useMemo(
    () => (m ? { ...normalize(m, type), id } : { id, type, title: isTmdbId(id) ? `TMDB #${id}` : '' }),
    [m, type, id]
  );
  const itemRef = useRef(item);
  itemRef.current = item;
  const embedRef = useRef(embedId);
  embedRef.current = embedId;

  const lastSave = useRef(0);
  const skipReload = useRef(false);
  const current = useRef({ season, episode });
  current.current = { season, episode };

  // The iframe src only changes on user navigation, not when the player
  // itself switches episodes (we just mirror that into the URL).
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!embedId) return;
    if (skipReload.current) {
      skipReload.current = false;
      return;
    }
    setSrc(
      vidkingUrl(
        { type, id: embedId, season, episode },
        { ...settings, progress: getResumeTime(type, id, season, episode) }
      )
    );
    setUpNext(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, embedId, season, episode]);

  useEffect(() => {
    if (type === 'tv' && item.title) document.title = `${item.title} S${season}E${episode} — NodeVid`;
    else if (item.title) document.title = `${item.title} — NodeVid`;
    if (embedId) touchProgress(item, season, episode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, embedId, season, episode, type]);

  useEffect(() => setDrawerSeason(season), [season, id]);

  const seasons = useMemo(() => (m ? seasonsOf(m) : []), [m]);
  const mainSeasons = seasons.filter((s) => s.season > 0);
  const epsOf = (s) => seasons.find((x) => x.season === s)?.episodes || [];

  const neighbor = (dir) => {
    if (type !== 'tv') return null;
    if (!seasons.length) {
      // No catalog data (opened by TMDB id): just step the episode number.
      if (dir > 0) return { s: season, e: episode + 1 };
      return episode > 1 ? { s: season, e: episode - 1 } : null;
    }
    const count = epsOf(season).length;
    const ordered = season === 0 ? seasons : mainSeasons;
    if (dir > 0) {
      if (episode < count) return { s: season, e: episode + 1 };
      const next = ordered.find((s) => s.season > season);
      return next ? { s: next.season, e: next.episodes[0]?.episode || 1 } : null;
    }
    if (episode > 1) return { s: season, e: episode - 1 };
    const prev = [...ordered].reverse().find((s) => s.season < season && s.season > 0);
    return prev ? { s: prev.season, e: prev.episodes[prev.episodes.length - 1]?.episode || 1 } : null;
  };
  const next = neighbor(1);
  const prev = neighbor(-1);
  const go = (n) => n && navigate(`/watch/tv/${id}/${n.s}/${n.e}`, { replace: true });

  // Player events -> progress tracking
  useEffect(() => {
    const onMessage = (e) => {
      const data = parseMessage(e.data);
      if (!data || !embedRef.current) return;
      if (data.id && String(data.id) !== String(embedRef.current)) return;
      const s = Number(data.season) || current.current.season;
      const ep = Number(data.episode) || current.current.episode;

      // The player switched episodes on its own (next button / selector).
      if (type === 'tv' && data.season && data.episode && (s !== current.current.season || ep !== current.current.episode)) {
        skipReload.current = true;
        current.current = { season: s, episode: ep };
        setUpNext(null);
        navigate(`/watch/tv/${id}/${s}/${ep}`, { replace: true });
      }

      const time = Number(data.currentTime) || 0;
      const duration = Number(data.duration) || 0;
      const t = Date.now();
      if (data.event !== 'timeupdate' || t - lastSave.current > 4000) {
        lastSave.current = t;
        saveProgress(itemRef.current, { season: s, episode: ep, time, duration });
      }
      if (data.event === 'ended' && type === 'tv' && settings.autoNext) setUpNext({ at: Date.now() + 8000 });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [type, id, navigate, settings.autoNext]);

  // Up-next countdown
  useEffect(() => {
    if (!upNext) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [upNext]);
  useEffect(() => {
    if (!upNext) return;
    if (!next) setUpNext(null);
    else if (now >= upNext.at) {
      setUpNext(null);
      go(next);
    }
  }, [now]);

  const entry = progress[progressKey(type, id)];
  const epName = epsOf(season).find((x) => x.episode === episode)?.name;
  const nextName = next && epsOf(next.s).find((x) => x.episode === next.e)?.name;

  return (
    <div className="watch">
      <div className="watch-bar">
        <button className="icon-btn" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(`/${type}/${id}`))} aria-label="Back">
          <I.ArrowLeft />
        </button>
        <div className="watch-title">
          <Link to={`/${type}/${id}`}>{item.title || 'Loading…'}</Link>
          {type === 'tv' && (
            <span>
              S{season} · E{episode}
              {epName ? ` — ${epName}` : ''}
            </span>
          )}
        </div>
        {type === 'tv' && (
          <div className="watch-actions">
            <button className="btn btn-glass btn-sm" disabled={!prev} onClick={() => go(prev)}>
              <I.ChevronLeft width={16} height={16} /> <span className="hide-sm">Prev</span>
            </button>
            <button className="btn btn-glass btn-sm" disabled={!next} onClick={() => go(next)}>
              <span className="hide-sm">Next</span> <I.ChevronRight width={16} height={16} />
            </button>
            {seasons.length > 0 && (
              <button className={`btn btn-sm ${drawer ? 'btn-primary' : 'btn-glass'}`} onClick={() => setDrawer((v) => !v)}>
                <I.List width={16} height={16} /> <span className="hide-sm">Episodes</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="watch-body">
        <div className="player">
          {src ? (
            <iframe key={src} src={src} title={item.title || 'Player'} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen />
          ) : (
            <div className="player-loading">
              <span className="spinner" />
            </div>
          )}
          {upNext && next && (
            <div className="upnext">
              <div>
                <small>Up next in {Math.max(0, Math.ceil((upNext.at - now) / 1000))}s</small>
                <strong>
                  S{next.s} E{next.e}
                  {nextName ? ` — ${nextName}` : ''}
                </strong>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => go(next)}>
                <I.Play width={14} height={14} /> Play now
              </button>
              <button className="btn btn-glass btn-sm" onClick={() => setUpNext(null)}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {type === 'tv' && drawer && seasons.length > 0 && (
          <aside className="drawer">
            <div className="drawer-head">
              <select className="select" value={drawerSeason} onChange={(e) => setDrawerSeason(Number(e.target.value))}>
                {seasons.map((s) => (
                  <option key={s.season} value={s.season}>
                    {s.season === 0 ? 'Specials' : `Season ${s.season}`}
                  </option>
                ))}
              </select>
              <button className="icon-btn" onClick={() => setDrawer(false)} aria-label="Close episodes">
                <I.X />
              </button>
            </div>
            <div className="drawer-list">
              {epsOf(drawerSeason).map((ep) => {
                const active = drawerSeason === season && ep.episode === episode;
                const p = entry?.episodes?.[`${drawerSeason}:${ep.episode}`];
                return (
                  <button key={ep.id || ep.episode} className={`drawer-ep ${active ? 'active' : ''}`} onClick={() => go({ s: drawerSeason, e: ep.episode })}>
                    <div className="drawer-still">
                      <Img srcs={[ep.thumbnail, item.background]} alt="" loading="lazy" />
                      {active && <span className="now-playing">Playing</span>}
                      {p && (
                        <div className="ccard-bar">
                          <span style={{ width: `${Math.min(100, p.progress)}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="drawer-info">
                      <strong>
                        {ep.episode}. {ep.name || `Episode ${ep.episode}`}
                      </strong>
                      <small>{(ep.released || ep.firstAired || '').slice(0, 10)}</small>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
