import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isTmdbId, meta, normalize, seasonsOf } from '../lib/catalog.js';
import { HD_SCORE, SERVERS, autoPickServer, checkServer, getServer, parsePlayerMessage } from '../lib/servers.js';
import { getResumeTime, saveProgress, settingsStore, touchProgress, useProgress, useSettings, progressKey } from '../lib/store.js';
import Img from '../components/Img.jsx';
import * as I from '../components/Icons.jsx';

const LOAD_TIMEOUT = 20000;
const host = (origin) => (origin ? new URL(origin).host.replace(/^www\./, '') : '');

function StatusBadge({ r, isDefaultOrigin }) {
  if (!r) return <span className="badge badge-muted">Checking…</span>;
  if (r.up === false) return <span className="badge badge-off">Down</span>;
  if (r.available === false) return <span className="badge badge-off">Unavailable</span>;
  return (
    <>
      {!isDefaultOrigin && r.origin && <span className="badge badge-muted">{host(r.origin)}</span>}
      {r.quality ? (
        <span className={`badge ${r.score != null && r.score < HD_SCORE ? 'badge-warn' : ''}`}>{r.quality}</span>
      ) : (
        r.up && <span className="badge badge-muted">Online</span>
      )}
    </>
  );
}

function ServerMenu({ current, onPick, results, auto, minHD }) {
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
          <div className="server-pop-title">
            Servers {auto && <span className="auto-pill">Auto</span>}
          </div>
          {SERVERS.map((s, i) => {
            const r = results[s.id];
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
                <StatusBadge r={r} isDefaultOrigin={!r?.origin || r.origin === s.origins[0]} />
                {s.id === current && <I.Check width={16} height={16} />}
              </button>
            );
          })}
          <div className="server-pop-foot">
            {auto ? `Auto-switching skips servers that are down or missing the title${minHD ? ', and prefers 1080p+' : ''}.` : 'Not loading? Try another server.'}
          </div>
        </div>
      )}
    </div>
  );
}

function noticeText(pick, type) {
  const from = getServer(pick.from).name;
  const to = getServer(pick.id).name;
  if (pick.reason === 'down') return `${from} isn't responding — switched to ${to}.`;
  if (pick.reason === 'unavailable') return `${from} doesn't have this ${type === 'tv' ? 'episode' : 'title'} — switched to ${to}.`;
  if (pick.reason === 'quality') return `${from} only has ${pick.fromQuality || 'low quality'} — switched to ${to} for better quality.`;
  return `Switched to ${to}.`;
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
  const [results, setResults] = useState({});
  const [notice, setNotice] = useState(null); // { text, undo?: serverId, tone? }
  const [resolving, setResolving] = useState(false);
  const [tick, setTick] = useState(0);
  const manualRef = useRef(null); // server picked by hand for this title
  const failedRef = useRef(new Set()); // servers whose player never loaded
  const [drawer, setDrawer] = useState(false);
  const [drawerSeason, setDrawerSeason] = useState(season);
  const [upNext, setUpNext] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Load catalog metadata (title, episodes, TMDB id for Vidking).
  useEffect(() => {
    setM(null);
    manualRef.current = null;
    failedRef.current = new Set();
    setResults({});
    setNotice(null);
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

  // Pick a server (auto-failover) and build the iframe src. Re-runs on episode
  // change, manual server pick, or when a server fails to load. It does NOT
  // re-run when the player itself moves to another episode (skipReload).
  const [src, setSrc] = useState(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!ready) return;
    if (skipReload.current) {
      skipReload.current = false;
      return;
    }
    let alive = true;
    const ctx = { type, ...ids, season, episode };
    const seen = {};
    const onResult = (sid, r) => {
      seen[sid] = r;
      if (alive) setResults((x) => ({ ...x, [sid]: r }));
    };
    setResolving(true);
    setUpNext(null);
    (async () => {
      let pick;
      const forced = manualRef.current;
      if (forced || !settings.autoServer) {
        const sid = getServer(forced || settings.server).id;
        const r = await checkServer(sid, ctx);
        onResult(sid, r);
        pick = { id: sid, origin: r.origin, reason: null };
        if (r.up === false || r.available === false) {
          const alt = SERVERS.find((sv) => sv.id !== sid && sv.canPlay(ctx));
          setNotice({
            text: r.up === false ? `${getServer(sid).name} isn't responding right now.` : `${getServer(sid).name} doesn't have this ${type === 'tv' ? 'episode' : 'title'}.`,
            undo: alt?.id,
            tone: 'warn',
          });
        }
      } else {
        pick = await autoPickServer(settings.server, ctx, { minHD: settings.minHD, exclude: [...failedRef.current], onResult });
      }
      // Fill in the remaining servers' status for the menu (non-blocking).
      SERVERS.forEach((sv) => checkServer(sv.id, ctx).then((r) => onResult(sv.id, r)));
      if (!alive) return;

      setServerId(pick.id);
      if (pick.from) setNotice({ text: noticeText(pick, type), undo: pick.from });
      else if (pick.reason === 'none' && SERVERS.every((sv) => seen[sv.id]?.up === false))
        setNotice({ text: `No server is responding right now — trying ${getServer(pick.id).name} anyway. Check your connection or try again shortly.`, tone: 'warn' });
      else if (pick.reason === 'none') setNotice({ text: `No server reports this ${type === 'tv' ? 'episode' : 'title'} as available — trying ${getServer(pick.id).name} anyway.`, tone: 'warn' });
      setLoaded(false);
      setSrc(
        getServer(pick.id).url(
          { ...ctx, settings, progress: getResumeTime(type, id, season, episode) },
          pick.origin || undefined
        )
      );
      setResolving(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, type, season, episode, ids, tick]);

  // Watchdog: if the player page never loads, treat that server as down.
  useEffect(() => {
    if (!src || loaded) return;
    const t = setTimeout(() => {
      if (manualRef.current || !settings.autoServer) {
        setNotice({ text: `${getServer(serverId).name} isn't loading. Try another server from the menu.`, tone: 'warn' });
        return;
      }
      failedRef.current.add(serverId);
      if (SERVERS.every((sv) => failedRef.current.has(sv.id))) {
        setNotice({ text: 'No server is responding right now. Check your connection and try again.', tone: 'warn' });
        return;
      }
      setResults((x) => ({ ...x, [serverId]: { ...(x[serverId] || {}), up: false } }));
      setTick((n) => n + 1);
    }, LOAD_TIMEOUT);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, loaded]);

  // Auto-hide notices
  useEffect(() => {
    if (!notice || notice.tone === 'warn') return;
    const t = setTimeout(() => setNotice(null), 9000);
    return () => clearTimeout(t);
  }, [notice]);

  const pickServer = (sid) => {
    skipReload.current = false;
    manualRef.current = sid;
    failedRef.current.delete(sid);
    setNotice(null);
    settingsStore.set((s) => ({ ...s, server: sid }));
    setTick((n) => n + 1);
  };

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
      setLoaded(true);
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
          <ServerMenu current={serverId} onPick={pickServer} results={results} auto={settings.autoServer && !manualRef.current} minHD={settings.minHD} />
          {type === 'tv' && seasons.length > 0 && (
            <button className={`btn btn-sm ${drawer ? 'btn-primary' : 'btn-glass'}`} onClick={() => setDrawer((v) => !v)} aria-label="Episodes">
              <I.List width={16} height={16} /> <span className="hide-sm">Episodes</span>
            </button>
          )}
        </div>
      </div>

      <div className="watch-body">
        <div className="player">
          {src && !resolving ? (
            <iframe
              key={src}
              src={src}
              title={item.title || 'Player'}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              onLoad={() => setLoaded(true)}
            />
          ) : (
            <div className="player-loading">
              <span className="spinner" />
              <small>{settings.autoServer && !manualRef.current ? 'Finding the best server…' : 'Loading…'}</small>
            </div>
          )}
          {notice && (
            <div className={`server-notice ${notice.tone === 'warn' ? 'warn' : ''}`} role="status">
              <I.Server width={16} height={16} />
              <span>{notice.text}</span>
              {notice.undo && (
                <button className="btn btn-glass btn-sm" onClick={() => pickServer(notice.undo)}>
                  {notice.tone === 'warn' ? 'Try' : 'Use'} {getServer(notice.undo).name}
                </button>
              )}
              <button className="icon-btn" onClick={() => setNotice(null)} aria-label="Dismiss">
                <I.X width={16} height={16} />
              </button>
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
