import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PosterCard, WideCard } from '../components/Card.jsx';
import { Scroller } from '../components/Row.jsx';
import { ContinueRow } from './Home.jsx';
import { releaseLabel } from '../lib/catalog.js';
import { activeProfile, listStore, useList, useProfiles, useReminders } from '../lib/store.js';
import * as I from '../components/Icons.jsx';

export default function MyList() {
  const list = useList();
  const reminders = useReminders();
  const me = activeProfile(useProfiles());
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    document.title = 'My List — NodeVid';
  }, []);
  const shown = list.filter((x) => filter === 'all' || x.type === filter);

  return (
    <div className="page-pad">
      <div className="rows rows-flat">
        <ContinueRow name={me.name} />
        {reminders.length > 0 && (
          <section className="row">
            <div className="row-head">
              <h2>Your Reminders</h2>
              <Link to="/new" className="row-more">
                Coming Soon <I.ChevronRight width={16} height={16} />
              </Link>
            </div>
            <Scroller className="scroller-wide">
              {reminders.map((r) => {
                const out = r.date && Date.parse(r.date) <= Date.now();
                return (
                  <WideCard
                    key={`r-${r.id}`}
                    item={r}
                    label={out ? 'Available now' : r.date ? releaseLabel(r.date) : 'Coming soon'}
                    sub={r.kind === 'season' && r.season ? `Season ${r.season}` : r.type === 'tv' ? 'Series' : 'Movie'}
                  />
                );
              })}
            </Scroller>
          </section>
        )}
      </div>
      <div className="container">
        <div className="browse-head">
          <h1>{me.name === 'You' ? 'My List' : `${me.name}'s List`}</h1>
          <div className="browse-controls">
            <div className="segmented">
              {[
                ['all', 'All'],
                ['movie', 'Movies'],
                ['tv', 'TV Shows'],
              ].map(([k, l]) => (
                <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>
                  {l}
                </button>
              ))}
            </div>
            {list.length > 0 && (
              <button className="btn btn-glass btn-sm" onClick={() => confirm('Clear your entire list?') && listStore.set([])}>
                Clear
              </button>
            )}
          </div>
        </div>
        {shown.length ? (
          <div className="grid">
            {shown.map((it) => (
              <PosterCard key={`${it.type}-${it.id}`} item={it} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <I.Bookmark width={40} height={40} />
            <h3>Your list is empty</h3>
            <p>Tap “My List” on any movie or show to save it here for later.</p>
            <Link to="/" className="btn btn-primary">
              Browse titles
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
