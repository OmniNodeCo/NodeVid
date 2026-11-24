import { useState } from 'react';
import { setClientKey, validateKey } from '../lib/tmdb.js';
import { Logo } from './Navbar.jsx';

/** Shown when neither the server nor the browser has a TMDB key. */
export default function Setup({ onDone }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const k = key.trim();
    if (!k) return;
    setBusy(true);
    setErr('');
    try {
      if (await validateKey(k)) {
        setClientKey(k);
        onDone();
      } else setErr('TMDB rejected that key. Double-check it and try again.');
    } catch {
      setErr('Could not reach TMDB. Check your connection.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="setup">
      <div className="setup-glow" />
      <form className="setup-card" onSubmit={submit}>
        <Logo />
        <h1>One quick step</h1>
        <p>
          NodeVid gets posters, descriptions and episode lists from <strong>The Movie Database</strong>. Paste a free TMDB API key to get started — it&apos;s saved only in
          this browser.
        </p>
        <input className="input" value={key} onChange={(e) => setKey(e.target.value)} placeholder="TMDB API key or read access token" autoFocus />
        {err && <div className="setup-err">{err}</div>}
        <button className="btn btn-primary" disabled={busy || !key.trim()}>
          {busy ? 'Checking…' : 'Start watching'}
        </button>
        <ol>
          <li>
            Create a free account at{' '}
            <a href="https://www.themoviedb.org/signup" target="_blank" rel="noreferrer">
              themoviedb.org
            </a>
          </li>
          <li>
            Open{' '}
            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">
              Settings → API
            </a>{' '}
            and copy your API key
          </li>
        </ol>
        <p className="fineprint">Site owners: set TMDB_API_KEY on the server to skip this screen for everyone.</p>
      </form>
    </div>
  );
}
