import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_SETTINGS, activeProfile, listStore, progressStore, ratingStore, remindStore, settingsStore, useProfiles, useSettings } from '../lib/store.js';
import Avatar from '../components/Avatar.jsx';
import { COUNTS } from '../lib/catalog.js';

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
          desc="Play a muted clip of the film on the home billboard and title pages while you browse."
          checked={s.previews}
          onChange={(v) => set({ previews: v })}
        />
      </section>

      <section className="panel">
        <h2>Player</h2>
        <label className="setting">
          <div>
            <div className="setting-label">Video quality</div>
            <div className="setting-desc">Most titles have several files on the Internet Archive. You can also switch while watching.</div>
          </div>
          <select className="select" value={s.quality === 'saver' ? 'saver' : 'auto'} onChange={(e) => set({ quality: e.target.value })}>
            <option value="auto">Best available</option>
            <option value="saver">Data saver (smallest file)</option>
          </select>
        </label>
        <Toggle label="Autoplay" desc="Start playback as soon as the player loads." checked={s.autoPlay} onChange={(v) => set({ autoPlay: v })} />
        <Toggle label="Auto-play next episode" desc="Continue to the next episode or short when one ends." checked={s.autoNext} onChange={(v) => set({ autoNext: v })} />
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

      <p className="fineprint">
        No account or API key needed. NodeVid&apos;s {COUNTS.movies} films and {COUNTS.series} series are public domain in the United States or released under Creative Commons licences, and stream directly from the Internet Archive. <Link to="/about">About the library</Link>
      </p>
    </div>
  );
}
