import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { img, tmdb, titleOf } from '../lib/tmdb.js';
import { getResumeTime, saveProgress, touchProgress, useProgress, useSettings, progressKey } from '../lib/store.js';
import * as I from '../components/Icons.jsx';

const VIDKING = 'https://www.vidking.net';

function buildSrc({ type, id, season, episode }, settings) {
  const qs = new URLSearchParams();
  qs.set('color', (settings.color || '8b6cff').replace('#', ''));
  if (settings.autoPlay) qs.set('autoPlay', 'true');
  if (type === 'tv') {
    if (settings.nextEpisode) qs.set('nextEpisode', 'true');
    if (settings.episodeSelector) qs.set('episodeSelector', 'true');
  }
  const resume = getResumeTime(type, id, season, episode);
  if (resume > 0) qs.set('progress', String(resume));
  const path = type === 'tv' ? `/embed/tv/${id}/${season}/${episode}` : `/embed/movie/${id}`;
  return `${VIDKING}${path}?${qs}`;
}

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
  const season = Number(params.season) || 1;
  const episode = Number(params.episode) || 1;
  const navigate = useNavigate();
  const settings = useSettings();
  const progress = useProgress();

  const [details, setDetails] = useState(null);
  const [seasonData, setSeasonData] = useState({});
  const [drawer, setDrawer] = useState(false);
  const [drawerSeason, setDrawerSeason] = useState(season);
  const [upNext, setUpNext] = useState(null); // { s, e, at }
  const [now, setNow] = useState(Date.now());

  const metaRef = useRef(null);
  const lastSave = useRef(0);
  const skipReload = useRef(false);
  const current = useRef({ season, episode });
  current.current = { season, episode };

  // The iframe src only changes on user navigation, not when the player
  // itself switches episodes (we just mirror that into the URL).
  const [src, setSrc] = useState(() => buildSrc({ type, id, season, episode }, settings));
  useEffect(() => {
    if (skipReload.current) {
      skipReload.current = false;
      return;
    }
    setSrc(buildSrc({ type, id, season, episode }, settings));
    setUpNext(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id, season, episode]);

  // Title metadata
  useEffect(() => {
    let alive = true;
    tmdb(`${type}/${id}`).then((d) => {
      if (!alive) return;
      setDetails(d);
      metaRef.current = { ...d, type };
    });
    return () => {
      alive = false;
    };
  }, [type, id]);

  useEffect(() => {
    if (!details) return;
    document.title = type === 'tv' ? `${titleOf(details)} S${season}E${episode} — NodeVid` : `${titleOf(details)} — NodeVid`;
    touchProgress({ ...details, type }, season, episode);
  }, [details, season, episode, type]);

  // Season episode lists (for prev/next + drawer)
  const loadSeason = useCallback(
    (s) => {
      if (type !== 'tv' || seasonData[s]) return;
      tmdb(`tv/${id}/season/${s}`)
        .then((d) => setSeasonData((m) => ({ ...m, [s]: d.episodes || [] })))
        .catch(() => setSeasonData((m) => ({ ...m, [s]: [] })));
    },
    [type, id, seasonData]
  );
  useEffect(() => {
    loadSeason(season);
    setDrawerSeason(season);
  }, [season, id]);
  useEffect(() => {
    if (drawer) loadSeason(drawerSeason);
  }, [drawer, drawerSeason]);

  const seasons = useMemo(() => (details?.seasons || []).filter((s) => s.episode_count > 0 && s.season_number > 0), [details]);

  const neighbor = useCallback(
    (dir) => {
      if (type !== 'tv' || !details) return null;
      const eps = seasonData[season];
      const count = eps?.length || seasons.find((s) => s.season_number === season)?.episode_count || 0;
      if (dir > 0) {
        if (episode < count) return { s: season, e: episode + 1 };
        const next = seasons.find((s) => s.season_number > season);
        return next ? { s: next.season_number, e: 1 } : null;
      }
      if (episode > 1) return { s: season, e: episode - 1 };
      const prev = [...seasons].reverse().find((s) => s.season_number < season);
      return prev ? { s: prev.season_number, e: prev.episode_count } : null;
    },
    [type, details, seasonData, season, episode, seasons]
  );
  const next = neighbor(1);
  const prev = neighbor(-1);
  const go = (n) => n && navigate(`/watch/tv/${id}/${n.s}/${n.e}`, { replace: true });

  // Player events -> progress tracking
  useEffect(() => {
    const onMessage = (e) => {
      const data = parseMessage(e.data);
      if (!data || !metaRef.current) return;
      // Ignore events that clearly belong to some other title.
      if (data.id && String(data.id) !== String(id)) return;
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
      const force = data.event !== 'timeupdate';
      if (force || t - lastSave.current > 4000) {
        lastSave.current = t;
        saveProgress(metaRef.current, { season: s, episode: ep, time, duration });
      }
      if (data.event === 'ended' && type === 'tv' && settings.autoNext) {
        setUpNext({ at: Date.now() + 8000 });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [type, id, navigate, settings.autoNext]);

  // Up-next countdown
  useEffect(() => {
    if (!upNext) return;
    if (!next) {
      setUpNext(null);
      return;
    }
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [upNext, next]);
  useEffect(() => {
    if (upNext && next && now >= upNext.at) {
      setUpNext(null);
      go(next);
    }
  }, [now]);

  const entry = progress[progressKey(type, id)];
  const title = details ? titleOf(details) : '';
  const epName = seasonData[season]?.find((x) => x.episode_number === episode)?.name;

  return (
    <div className="watch">
      <div className="watch-bar">
        <button className="icon-btn" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(`/${type}/${id}`))} aria-label="Back">
          <I.ArrowLeft />
        </button>
        <div className="watch-title">
          <Link to={`/${type}/${id}`}>{title || 'Loading…'}</Link>
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
            <button className={`btn btn-sm ${drawer ? 'btn-primary' : 'btn-glass'}`} onClick={() => setDrawer((v) => !v)}>
              <I.List width={16} height={16} /> <span className="hide-sm">Episodes</span>
            </button>
          </div>
        )}
      </div>

      <div className="watch-body">
        <div className="player">
          <iframe
            key={src}
            src={src}
            title={title || 'Player'}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
          />
          {upNext && next && (
            <div className="upnext">
              <div>
                <small>Up next in {Math.max(0, Math.ceil((upNext.at - now) / 1000))}s</small>
                <strong>
                  S{next.s} E{next.e}
                  {seasonData[next.s]?.find((x) => x.episode_number === next.e)?.name ? ` — ${seasonData[next.s].find((x) => x.episode_number === next.e).name}` : ''}
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

        {type === 'tv' && drawer && (
          <aside className="drawer">
            <div className="drawer-head">
              <select className="select" value={drawerSeason} onChange={(e) => setDrawerSeason(Number(e.target.value))}>
                {seasons.map((s) => (
                  <option key={s.id} value={s.season_number}>
                    {s.name || `Season ${s.season_number}`}
                  </option>
                ))}
              </select>
              <button className="icon-btn" onClick={() => setDrawer(false)} aria-label="Close episodes">
                <I.X />
              </button>
            </div>
            <div className="drawer-list">
              {!seasonData[drawerSeason] && <div className="skeleton skeleton-line" />}
              {seasonData[drawerSeason]?.map((ep) => {
                const active = drawerSeason === season && ep.episode_number === episode;
                const p = entry?.episodes?.[`${drawerSeason}:${ep.episode_number}`];
                return (
                  <button
                    key={ep.id}
                    className={`drawer-ep ${active ? 'active' : ''}`}
                    onClick={() => go({ s: drawerSeason, e: ep.episode_number })}
                  >
                    <div className="drawer-still">
                      {ep.still_path || details?.backdrop_path ? <img src={img(ep.still_path || details.backdrop_path, 'w300')} alt="" loading="lazy" /> : null}
                      {active && <span className="now-playing">Playing</span>}
                      {p && (
                        <div className="ccard-bar">
                          <span style={{ width: `${Math.min(100, p.progress)}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="drawer-info">
                      <strong>
                        {ep.episode_number}. {ep.name}
                      </strong>
                      <small>{ep.runtime ? `${ep.runtime}m` : ep.air_date}</small>
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
