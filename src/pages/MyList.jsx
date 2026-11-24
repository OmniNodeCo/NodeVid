import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PosterCard } from '../components/Card.jsx';
import { ContinueRow } from './Home.jsx';
import { listStore, useList } from '../lib/store.js';
import * as I from '../components/Icons.jsx';

export default function MyList() {
  const list = useList();
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    document.title = 'My List — NodeVid';
  }, []);
  const shown = list.filter((x) => filter === 'all' || x.type === filter);

  return (
    <div className="page-pad">
      <div className="rows rows-flat">
        <ContinueRow />
      </div>
      <div className="container">
        <div className="browse-head">
          <h1>My List</h1>
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
              <PosterCard key={`${it.type}-${it.id}`} item={it} type={it.type} />
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
