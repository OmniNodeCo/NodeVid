import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_SETTINGS, activeProfile, listStore, progressStore, ratingStore, remindStore, settingsStore, useProfiles, useSettings } from '../lib/store.js';
import Avatar from '../components/Avatar.jsx';
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

const COLORS = ['e50914', '8b6cff', 'ff5c8a', 'f59e0b', '22c55e', '06b6d4', '3b82f6', 'ffffff'];

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
  const profiles = useProfiles();
  const me = activeProfile(profiles);
  const set = (patch) => settingsStore.set((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    document.title = 'Settings — NodeVid';
  }, []);

  return (
    <div className="container page-pad narrow">
      <h1>Settings</h1>

      <section className="panel">
        <h2>Profile</h2>
        <div className="setting">
          <div className="profile-row">
            <Avatar index={me.avatar} kids={me.kids} size={48} />
            <div>
              <div className="setting-label">
                {me.name} {me.kids && <span className="kids-tag">Kids</span>}
              </div>
              <div className="setting-desc">
                {profiles.list.length} profile{profiles.list.length > 1 ? 's' : ''} on this browser. Each profile has its own My List, history, ratings and reminders.
              </div>
            </div>
          </div>
          <div className="btn-row">
            <Link to="/profiles" className="btn btn-glass btn-sm">
              Switch
            </Link>
            <Link to="/profiles/manage" className="btn btn-glass btn-sm">
              Manage
            </Link>
          </div>
        </div>
        <Toggle
          label="Autoplay previews"
          desc="Play muted trailers on the home billboard and title pages while you browse."
          checked={s.previews}
          onChange={(v) => set({ previews: v })}
        />
      </section>

      <section className="panel">
        <h2>Default server</h2>
        <p className="setting-desc" style={{ marginBottom: 14 }}>
          Your preferred server. You can switch any time from the server menu while watching — picking one by hand turns off auto-switching for that title.
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
        <div style={{ marginTop: 10 }}>
          <Toggle
            label="Auto-switch servers"
            desc="Automatically move to another server if the site is down, doesn't have the title, or the player doesn't load."
            checked={s.autoServer}
            onChange={(v) => set({ autoServer: v })}
          />
          <Toggle
            label="Require 1080p"
            desc="Also switch when a server only has lower quality (720p, SD, CAM) and another server can do better."
            checked={s.minHD}
            onChange={(v) => set({ minHD: v })}
          />
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
        <p className="setting-desc">Your list, history, ratings and reminders are stored only in this browser, separately for each profile ({me.name}).</p>
        <div className="btn-row">
          <button className="btn btn-glass btn-sm" onClick={() => confirm('Clear watch history?') && progressStore.set({})}>
            Clear watch history
          </button>
          <button className="btn btn-glass btn-sm" onClick={() => confirm('Clear My List?') && listStore.set([])}>
            Clear My List
          </button>
          <button className="btn btn-glass btn-sm" onClick={() => confirm('Clear ratings and reminders?') && (ratingStore.set({}), remindStore.set([]))}>
            Clear ratings &amp; reminders
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
