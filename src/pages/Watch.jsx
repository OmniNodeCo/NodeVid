import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { archiveUrl, getEntry, meta, normalize, resolveStream, seasonsOf } from '../lib/catalog.js';
import { LICENSES } from '../lib/library.js';
import { getResumeTime, saveProgress, settingsStore, touchProgress, useProgress, useSettings, progressKey } from '../lib/store.js';
import Img from '../components/Img.jsx';
import * as I from '../components/Icons.jsx';

const qualityLabel = (s) => (s.height ? `${s.height}p` : s.format === 'Ogg Video' ? 'Ogg' : 'SD');

/** Order files by the quality preference: best first, or smallest first. */
function orderSources(sources, pref) {
  if (pref !== 'saver') return sources;
  return [...sources].sort((a, b) => (a.height || 9999) - (b.height || 9999));
}

function SourceMenu({ sources, current, onPick, archiveId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);
  const cur = sources[current];
  return (
    <div className="server-menu" ref={ref}>
      <button className={`btn btn-sm ${open ? 'btn-primary' : 'btn-glass'}`} onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}>
        <I.Server width={16} height={16} />
        <span className="hide-sm">{cur ? qualityLabel(cur) : 'Quality'}</span>
        <I.ChevronDown width={14} height={14} />
      </button>
      {open && (
        <div className="server-pop" role="listbox">
          <div className="server-pop-title">Video files</div>
          {sources.map((s, i) => (
            <button
              key={s.src}
              role="option"
              aria-selected={i === current}
              className={`server-opt ${i === current ? 'active' : ''}`}
              onClick={() => {
                onPick(i);
                setOpen(false);
              }}
            >
              <span className="server-num">{i + 1}</span>
              <span className="server-text">
                <strong>{qualityLabel(s)}</strong>
                <small>{s.format}</small>
              </span>
              {i === current && <I.Check width={16} height={16} />}
            </button>
          ))}
          <div className="server-pop-foot">
            Streaming from the Internet Archive.{' '}
            <a href={archiveUrl(archiveId)} target="_blank" rel="noreferrer">
              View on archive.org
            </a>
          </div>
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
  const entryDef = getEntry(id);

  const [m, setM] = useState(null);
  const [stream, setStream] = useState(null); // { archiveId, sources, length, title }
  const [error, setError] = useState(null);
  const [srcIndex, setSrcIndex] = useState(0);
  const [notice, setNotice] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [drawerSeason, setDrawerSeason] = useState(season);
  const [upNext, setUpNext] = useState(null);
  const [now, setNow] = useState(Date.now());
  const videoRef = useRef(null);
  const lastSave = useRef(0);
  const resumeAt = useRef(0);

  const item = useMemo(() => (entryDef ? normalize(entryDef) : { id, type, title: '' }), [entryDef, id, type]);
  const itemRef = useRef(item);
  itemRef.current = item;

  // Series metadata (episode list).
  useEffect(() => {
    setM(null);
    if (!entryDef) return;
    let alive = true;
    meta(type, id)
      .then((d) => alive && setM(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [type, id, entryDef]);

  // Resolve the video file for this movie / episode.
  useEffect(() => {
    setStream(null);
    setError(null);
    setUpNext(null);
    if (!entryDef) {
      setError('This title isn\u2019t in the NodeVid library.');
      return;
    }
    let alive = true;
    resolveStream(type, id, season, episode)
      .then((s) => {
        if (!alive) return;
        const sources = orderSources(s.sources, settingsStore.get().quality);
        resumeAt.current = getResumeTime(type, id, season, episode);
        setSrcIndex(0);
        setStream({ ...s, sources });
        const lic = item.license !== 'pd' ? item.credit || LICENSES[item.license]?.label : null;
        if (lic) setNotice({ text: `${item.title} — ${lic}` });
      })
      .catch((e) => alive && setError(e.message || 'Could not load this video.'));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id, season, episode, entryDef]);

  useEffect(() => {
    if (type === 'tv' && item.title) document.title = `${item.title} S${season}E${episode} — NodeVid`;
    else if (item.title) document.title = `${item.title} — NodeVid`;
    if (entryDef) touchProgress(item, season, episode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, season, episode, type]);

  useEffect(() => setDrawerSeason(season), [season, id]);

  // Auto-hide notices
  useEffect(() => {
    if (!notice || notice.tone === 'warn') return;
    const t = setTimeout(() => setNotice(null), 9000);
    return () => clearTimeout(t);
  }, [notice]);

  const seasons = useMemo(() => (m ? seasonsOf(m) : []), [m]);
  const epsOf = (s) => seasons.find((x) => x.season === s)?.episodes || [];
  const flat = seasons.flatMap((s) => s.episodes.map((e) => ({ s: s.season, e: e.episode })));
  const pos = flat.findIndex((x) => x.s === season && x.e === episode);
  const next = type === 'tv' && pos >= 0 ? flat[pos + 1] || null : null;
  const prev = type === 'tv' && pos > 0 ? flat[pos - 1] : null;
  const go = (n) => n && navigate(`/watch/tv/${id}/${n.s}/${n.e}`, { replace: true });

  // ---------- <video> events ----------
  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (v && resumeAt.current > 0 && resumeAt.current < v.duration - 10) {
      v.currentTime = resumeAt.current;
      setNotice({ text: `Resuming from ${fmt(resumeAt.current)}` });
    }
    resumeAt.current = 0;
  };
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const t = Date.now();
    if (t - lastSave.current > 4000) {
      lastSave.current = t;
      saveProgress(itemRef.current, { season, episode, time: v.currentTime, duration: v.duration });
    }
  };
  const onPause = () => {
    const v = videoRef.current;
    if (v) saveProgress(itemRef.current, { season, episode, time: v.currentTime, duration: v.duration });
  };
  const onEnded = () => {
    onPause();
    if (type === 'tv' && settings.autoNext && next) setUpNext({ at: Date.now() + 8000 });
  };
  const onError = () => {
    // Try the next file (e.g. a lower-quality MP4 or the Ogg version).
    const v = videoRef.current;
    if (v) resumeAt.current = v.currentTime || resumeAt.current;
    if (stream && srcIndex < stream.sources.length - 1) {
      setNotice({ text: `${qualityLabel(stream.sources[srcIndex])} file didn\u2019t load — trying ${qualityLabel(stream.sources[srcIndex + 1])}.` });
      setSrcIndex((i) => i + 1);
    } else {
      setError('The video couldn\u2019t be played. archive.org may be busy — try again in a moment.');
    }
  };

  const pickSource = (i) => {
    const v = videoRef.current;
    resumeAt.current = v?.currentTime || 0;
    setSrcIndex(i);
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  const entry = progress[progressKey(type, id)];
  const epName = epsOf(season).find((x) => x.episode === episode)?.name;
  const nextName = next && epsOf(next.s).find((x) => x.episode === next.e)?.name;
  const src = stream?.sources[srcIndex];

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
          {stream && <SourceMenu sources={stream.sources} current={srcIndex} onPick={pickSource} archiveId={stream.archiveId} />}
          {type === 'tv' && seasons.length > 0 && (
            <button className={`btn btn-sm ${drawer ? 'btn-primary' : 'btn-glass'}`} onClick={() => setDrawer((v) => !v)} aria-label="Episodes">
              <I.List width={16} height={16} /> <span className="hide-sm">Episodes</span>
            </button>
          )}
        </div>
      </div>

      <div className="watch-body">
        <div className="player">
          {error ? (
            <div className="player-loading">
              <I.Info width={28} height={28} />
              <small>{error}</small>
              <div className="player-error-actions">
                <button className="btn btn-glass btn-sm" onClick={() => navigate(0)}>
                  Try again
                </button>
                {stream && (
                  <a className="btn btn-glass btn-sm" href={archiveUrl(stream.archiveId)} target="_blank" rel="noreferrer">
                    Open on archive.org
                  </a>
                )}
              </div>
            </div>
          ) : src ? (
            <video
              key={src.src}
              ref={videoRef}
              src={src.src}
              poster={item.background || undefined}
              controls
              autoPlay={settings.autoPlay}
              playsInline
              preload="metadata"
              onLoadedMetadata={onLoadedMetadata}
              onTimeUpdate={onTimeUpdate}
              onPause={onPause}
              onEnded={onEnded}
              onError={onError}
            >
              Your browser can&apos;t play this video.
            </video>
          ) : (
            <div className="player-loading">
              <span className="spinner" />
              <small>Loading from the Internet Archive…</small>
            </div>
          )}
          {notice && (
            <div className={`server-notice ${notice.tone === 'warn' ? 'warn' : ''}`} role="status">
              <I.Info width={16} height={16} />
              <span>{notice.text}</span>
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
                    {seasons.length === 1 ? 'All episodes' : `Season ${s.season}`}
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
                  <button key={`${ep.id}-${ep.file || ''}-${ep.episode}`} className={`drawer-ep ${active ? 'active' : ''}`} onClick={() => go({ s: drawerSeason, e: ep.episode })}>
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
                      <small>{ep.runtime || (ep.released || '').slice(0, 4)}</small>
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

function fmt(sec) {
  const s = Math.floor(sec % 60);
  const mm = Math.floor(sec / 60) % 60;
  const h = Math.floor(sec / 3600);
  return `${h ? `${h}:` : ''}${h ? String(mm).padStart(2, '0') : mm}:${String(s).padStart(2, '0')}`;
}
