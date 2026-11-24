import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isTmdbId, meta, normalize, seasonsOf } from '../lib/catalog.js';
import { SERVERS, getServer, parsePlayerMessage, vidsrcInfo } from '../lib/servers.js';
import { getResumeTime, saveProgress, settingsStore, touchProgress, useProgress, useSettings, progressKey } from '../lib/store.js';
import Img from '../components/Img.jsx';
import * as I from '../components/Icons.jsx';

function ServerMenu({ current, onPick, availability }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div className="server-menu" ref={ref}>
      <button className={`btn btn-sm ${open ? 'btn-primary' : 'btn-glass'}`} onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}>
        <I.Server width={16} height={16} />
        <span className="hide-sm">{getServer(current).name}</span>
        <I.ChevronDown width={14} height={14} />
      </button>
      {open && (
        <div className="server-pop" role="listbox">
          <div className="server-pop-title">Servers</div>
          {SERVERS.map((s, i) => {
            const a = availability[s.id];
            return (
              <button
                key={s.id}
                role="option"
                aria-selected={s.id === current}
                className={`server-opt ${s.id === current ? 'active' : ''}`}
                onClick={() => {
                  onPick(s.id);
                  setOpen(false);
                }}
              >
                <span className="server-num">{i + 1}</span>
                <span className="server-text">
                  <strong>{s.name}</strong>
                  <small>{s.note}</small>
                </span>
                {a?.available === false && <span className="badge badge-off">Unavailable</span>}
                {a?.available && a.quality && <span className="badge">{a.quality}</span>}
                {s.id === current && <I.Check width={16} height={16} />}
              </button>
            );
          })}
          <div className="server-pop-foot">Not loading? Try another server.</div>
        </div>
      )}
    </div>
  );
}

export default function Watch({ type }) {
  const params = useParams();
  const id = params.id;
  const season = Number(params.season ?? 1);
  const episode = Number(params.episode) || 1;
  const navigate = useNavigate();
  const settings = useSettings();
  const progress = useProgress();

  const [m, setM] = useState(null);
  const [ready, setReady] = useState(isTmdbId(id));
  const [serverId, setServerId] = useState(() => getServer(settings.server).id);
  const [availability, setAvailability] = useState({});
  const [drawer, setDrawer] = useState(false);
  const [drawerSeason, setDrawerSeason] = useState(season);
  const [upNext, setUpNext] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Load catalog metadata (title, episodes, TMDB id for Vidking).
  useEffect(() => {
    setM(null);
    if (isTmdbId(id)) {
      setReady(true);
      return;
    }
    setReady(false);
    let alive = true;
    meta(type, id)
      .then((d) => alive && setM(d))
      .catch(() => {})
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [type, id]);

  const ids = useMemo(
    () => ({
      imdbId: isTmdbId(id) ? m?.imdb_id || null : id,
      tmdbId: isTmdbId(id) ? id : m?.moviedb_id ? String(m.moviedb_id) : null,
    }),
    [id, m]
  );

  const item = useMemo(
    () => (m ? { ...normalize(m, type), id } : { id, type, title: isTmdbId(id) ? `TMDB #${id}` : '' }),
    [m, type, id]
  );

  const itemRef = useRef(item);
  itemRef.current = item;
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const lastSave = useRef(0);
  const skipReload = useRef(false);
  const current = useRef({ season, episode });
  current.current = { season, episode };
  const server = getServer(serverId);

  // The iframe src only changes on user navigation / server switch, not when
  // the player itself moves to another episode (we just mirror that in the URL).
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!ready) return;
    if (skipReload.current) {
      skipReload.current = false;
      return;
    }
    setSrc(
      server.url({
        type,
        ...ids,
        season,
        episode,
        settings,
        progress: getResumeTime(type, id, season, episode),
      })
    );
    setUpNext(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, serverId, type, season, episode]);

  const pickServer = (sid) => {
    skipReload.current = false;
    setServerId(sid);
    settingsStore.set((s) => ({ ...s, server: sid }));
  };

  // VidSrc availability / quality for the server menu
  useEffect(() => {
    const vid = ids.imdbId || ids.tmdbId;
    if (!ready || !vid) return;
    let alive = true;
    vidsrcInfo(type, vid, type === 'tv' ? season : null, type === 'tv' ? episode : null).then((a) => alive && setAvailability((x) => ({ ...x, vidsrc: a })));
    return () => {
      alive = false;
    };
  }, [ready, ids, type, season, episode]);

  useEffect(() => {
    if (type === 'tv' && item.title) document.title = `${item.title} S${season}E${episode} — NodeVid`;
    else if (item.title) document.title = `${item.title} — NodeVid`;
    if (ready) touchProgress(item, season, episode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, ready, season, episode, type]);

  useEffect(() => setDrawerSeason(season), [season, id]);

  const seasons = useMemo(() => (m ? seasonsOf(m) : []), [m]);
  const mainSeasons = seasons.filter((s) => s.season > 0);
  const epsOf = (s) => seasons.find((x) => x.season === s)?.episodes || [];

  const neighbor = (dir) => {
    if (type !== 'tv') return null;
    if (!seasons.length) {
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

  // Player events (any server) -> progress tracking
  useEffect(() => {
    const onMessage = (e) => {
      const ev = parsePlayerMessage(e.data);
      if (!ev) return;
      const known = [idsRef.current.imdbId, idsRef.current.tmdbId, id].filter(Boolean).map(String);
      if (ev.ids.length && !ev.ids.some((x) => known.includes(x))) return;

      const s = ev.season || current.current.season;
      const ep = ev.episode || current.current.episode;

      // The player switched episodes on its own (next button / selector / autonext).
      if (type === 'tv' && ev.season && ev.episode && (s !== current.current.season || ep !== current.current.episode)) {
        skipReload.current = true;
        current.current = { season: s, episode: ep };
        setUpNext(null);
        navigate(`/watch/tv/${id}/${s}/${ep}`, { replace: true });
      }

      const t = Date.now();
      if (ev.event !== 'timeupdate' || t - lastSave.current > 4000) {
        lastSave.current = t;
        saveProgress(itemRef.current, { season: s, episode: ep, time: ev.time, duration: ev.duration });
      }
      const playerAutoNext = getServer(ev.server).handlesAutoNext;
      if (ev.event === 'ended' && type === 'tv' && settings.autoNext && !playerAutoNext) setUpNext({ at: Date.now() + 8000 });
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
  const curAvail = availability[serverId];

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
        <div className="watch-actions">
          {type === 'tv' && (
            <>
              <button className="btn btn-glass btn-sm" disabled={!prev} onClick={() => go(prev)} aria-label="Previous episode">
                <I.ChevronLeft width={16} height={16} /> <span className="hide-sm">Prev</span>
              </button>
              <button className="btn btn-glass btn-sm" disabled={!next} onClick={() => go(next)} aria-label="Next episode">
                <span className="hide-sm">Next</span> <I.ChevronRight width={16} height={16} />
              </button>
            </>
          )}
          <ServerMenu current={serverId} onPick={pickServer} availability={availability} />
          {type === 'tv' && seasons.length > 0 && (
            <button className={`btn btn-sm ${drawer ? 'btn-primary' : 'btn-glass'}`} onClick={() => setDrawer((v) => !v)} aria-label="Episodes">
              <I.List width={16} height={16} /> <span className="hide-sm">Episodes</span>
            </button>
          )}
        </div>
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
          {curAvail?.available === false && (
            <div className="server-warn">
              <span>
                This {type === 'tv' ? 'episode' : 'title'} isn&apos;t available on {server.name}.
              </span>
              {SERVERS.filter((s) => s.id !== serverId).map((s) => (
                <button key={s.id} className="btn btn-primary btn-sm" onClick={() => pickServer(s.id)}>
                  Try {s.name}
                </button>
              ))}
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
