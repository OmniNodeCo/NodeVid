import { useEffect } from 'react';
import { DEFAULT_SETTINGS, listStore, progressStore, settingsStore, useSettings } from '../lib/store.js';
import { PlayById } from './Search.jsx';
import { SERVERS } from '../lib/servers.js';
import * as I from '../components/Icons.jsx';

const SUB_LANGS = [
  ['', 'Off / player default'],
  ['en', 'English'],
  ['es', 'Spanish'],
  ['fr', 'French'],
  ['de', 'German'],
  ['pt', 'Portuguese'],
  ['it', 'Italian'],
  ['ar', 'Arabic'],
  ['hi', 'Hindi'],
  ['ja', 'Japanese'],
  ['ko', 'Korean'],
  ['zh', 'Chinese'],
];

const COLORS = ['8b6cff', 'e50914', 'ff5c8a', 'f59e0b', '22c55e', '06b6d4', '3b82f6', 'ffffff'];

function Toggle({ label, desc, checked, onChange }) {
  return (
    <label className="setting">
      <div>
        <div className="setting-label">{label}</div>
        {desc && <div className="setting-desc">{desc}</div>}
      </div>
      <span className={`switch ${checked ? 'on' : ''}`}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span />
      </span>
    </label>
  );
}

export default function Settings() {
  const s = useSettings();
  const set = (patch) => settingsStore.set((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    document.title = 'Settings — NodeVid';
  }, []);

  return (
    <div className="container page-pad narrow">
      <h1>Settings</h1>

      <section className="panel">
        <h2>Default server</h2>
        <p className="setting-desc" style={{ marginBottom: 14 }}>
          The server the player opens with. You can switch any time from the server menu while watching.
        </p>
        <div className="server-picker">
          {SERVERS.map((sv, i) => (
            <button key={sv.id} className={`server-opt ${s.server === sv.id ? 'active' : ''}`} onClick={() => set({ server: sv.id })}>
              <span className="server-num">{i + 1}</span>
              <span className="server-text">
                <strong>{sv.name}</strong>
                <small>{sv.note}</small>
              </span>
              {s.server === sv.id && <I.Check width={16} height={16} />}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Player</h2>
        <div className="setting">
          <div>
            <div className="setting-label">Accent color</div>
            <div className="setting-desc">Used for the Vidking player controls.</div>
          </div>
          <div className="swatches">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`swatch ${s.color === c ? 'active' : ''}`}
                style={{ background: `#${c}` }}
                onClick={() => set({ color: c })}
                aria-label={`#${c}`}
              />
            ))}
            <input type="color" value={`#${s.color}`} onChange={(e) => set({ color: e.target.value.slice(1) })} aria-label="Custom color" />
          </div>
        </div>
        <label className="setting">
          <div>
            <div className="setting-label">Subtitle language</div>
            <div className="setting-desc">Default subtitles on the VidSrc server.</div>
          </div>
          <select className="select" value={s.subLang} onChange={(e) => set({ subLang: e.target.value })}>
            {SUB_LANGS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <Toggle label="Autoplay" desc="Start playback as soon as the player loads." checked={s.autoPlay} onChange={(v) => set({ autoPlay: v })} />
        <Toggle label="Next episode button" desc="Show the player's next-episode button for TV shows." checked={s.nextEpisode} onChange={(v) => set({ nextEpisode: v })} />
        <Toggle label="In-player episode menu" desc="Let the player show its own episode selector." checked={s.episodeSelector} onChange={(v) => set({ episodeSelector: v })} />
        <Toggle label="Auto-play next episode" desc="Continue to the next episode when one ends (VidSrc does this in-player)." checked={s.autoNext} onChange={(v) => set({ autoNext: v })} />
        <button className="btn btn-glass btn-sm" onClick={() => settingsStore.set(DEFAULT_SETTINGS)}>
          Reset player settings
        </button>
      </section>

      <section className="panel">
        <h2>Your data</h2>
        <p className="setting-desc">Your list and watch history are stored only in this browser.</p>
        <div className="btn-row">
          <button className="btn btn-glass btn-sm" onClick={() => confirm('Clear watch history?') && progressStore.set({})}>
            Clear watch history
          </button>
          <button className="btn btn-glass btn-sm" onClick={() => confirm('Clear My List?') && listStore.set([])}>
            Clear My List
          </button>
        </div>
      </section>

      <PlayById />

      <p className="fineprint">
        No account or API key needed. Catalog data comes from the public Cinemeta API and playback from third-party embed servers (Vidking, VidSrc); NodeVid does not host any files.
      </p>
    </div>
  );
}
