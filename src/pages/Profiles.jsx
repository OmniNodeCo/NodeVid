import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';
import * as I from '../components/Icons.jsx';
import { AVATARS, deleteProfile, saveProfile, switchProfile, useProfiles } from '../lib/store.js';

const MAX = 5;

function EditProfile({ profile, onDone, isNew }) {
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [kids, setKids] = useState(profile.kids);
  const save = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveProfile({ ...profile, name: name.trim().slice(0, 20), avatar, kids });
    onDone();
  };
  return (
    <form className="profile-edit" onSubmit={save}>
      <h1>{isNew ? 'Add Profile' : 'Edit Profile'}</h1>
      {isNew && <p className="muted">Add a profile for another person watching NodeVid.</p>}
      <div className="profile-edit-body">
        <Avatar index={avatar} kids={kids} size={120} />
        <div className="profile-edit-fields">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" autoFocus maxLength={20} aria-label="Profile name" />
          <div className="avatar-pick" role="radiogroup" aria-label="Avatar">
            {AVATARS.map((_, i) => (
              <button type="button" key={i} role="radio" aria-checked={i === avatar} className={i === avatar ? 'active' : ''} onClick={() => setAvatar(i)}>
                <Avatar index={i} kids={kids} size={44} />
              </button>
            ))}
          </div>
          <label className="setting kids-toggle">
            <div>
              <div className="setting-label">Kids profile</div>
              <div className="setting-desc">Only shows family-friendly rows and hides horror, thrillers and crime.</div>
            </div>
            <span className={`switch ${kids ? 'on' : ''}`}>
              <input type="checkbox" checked={kids} onChange={(e) => setKids(e.target.checked)} />
              <span />
            </span>
          </label>
        </div>
      </div>
      <div className="profile-edit-actions">
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
          Save
        </button>
        <button type="button" className="btn btn-glass" onClick={onDone}>
          Cancel
        </button>
        {!isNew && profile.id !== 'main' && (
          <button
            type="button"
            className="btn btn-glass btn-danger"
            onClick={() => {
              if (confirm(`Delete ${profile.name}? Their list, history and ratings will be removed.`)) {
                deleteProfile(profile.id);
                onDone();
              }
            }}
          >
            Delete Profile
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * "Who's watching?" — used both as a full-screen gate and as the /profiles page.
 * `onPicked` is called after a profile is chosen (gate mode).
 */
export default function Profiles({ onPicked, manageInitially = false }) {
  const { list, active } = useProfiles();
  const [manage, setManage] = useState(manageInitially);
  const [editing, setEditing] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Who's watching? — NodeVid";
  }, []);

  const pick = (p) => {
    if (manage) return setEditing({ profile: p });
    switchProfile(p.id);
    if (onPicked) onPicked();
    else navigate('/');
  };

  const add = () =>
    setEditing({
      isNew: true,
      profile: { id: Math.random().toString(36).slice(2, 8), name: '', avatar: list.length % AVATARS.length, kids: false },
    });

  return (
    <div className="profiles-screen">
      {editing ? (
        <EditProfile {...editing} onDone={() => setEditing(null)} />
      ) : (
        <div className="profiles-inner">
          <h1>{manage ? 'Manage Profiles' : "Who's watching?"}</h1>
          <div className="profiles-grid">
            {list.map((p) => (
              <button key={p.id} className={`profile-tile ${p.id === active && !onPicked ? 'current' : ''}`} onClick={() => pick(p)}>
                <span className="profile-tile-img">
                  <Avatar index={p.avatar} kids={p.kids} size={140} />
                  {manage && (
                    <span className="profile-tile-edit">
                      <I.Pencil width={30} height={30} />
                    </span>
                  )}
                </span>
                <span className="profile-tile-name">{p.name}</span>
                {p.kids && <span className="kids-tag">Kids</span>}
              </button>
            ))}
            {list.length < MAX && (
              <button className="profile-tile" onClick={add}>
                <span className="profile-tile-img profile-add">
                  <I.Plus width={56} height={56} />
                </span>
                <span className="profile-tile-name">Add Profile</span>
              </button>
            )}
          </div>
          <button className={`btn ${manage ? 'btn-light' : 'btn-outline'}`} onClick={() => setManage((v) => !v)}>
            {manage ? 'Done' : 'Manage Profiles'}
          </button>
        </div>
      )}
    </div>
  );
}
