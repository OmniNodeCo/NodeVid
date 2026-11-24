import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import * as I from './Icons.jsx';
import Avatar from './Avatar.jsx';
import Img from './Img.jsx';
import { sized } from '../lib/catalog.js';
import { useNotifications } from '../lib/notify.js';
import { activeProfile, markSeen, switchProfile, useProfiles } from '../lib/store.js';

/** Close a popover on outside click / Escape. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

function Bell() {
  const { items, unread } = useNotifications();
  const { open, setOpen, ref } = usePopover();
  const toggle = () => {
    setOpen((v) => !v);
    if (!open && unread) markSeen(items.filter((n) => n.unread).map((n) => n.key));
  };
  return (
    <div className="nav-pop-wrap" ref={ref}>
      <button className="icon-btn bell" onClick={toggle} aria-label={`Notifications${unread ? ` (${unread} new)` : ''}`} aria-expanded={open}>
        <I.Bell />
        {unread > 0 && <span className="bell-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="nav-pop notif-pop">
          <div className="nav-pop-head">Notifications</div>
          {items.length === 0 ? (
            <div className="notif-empty">
              <I.Bell width={34} height={34} />
              <p>No notifications yet.</p>
              <small>Tap “Remind Me” on upcoming titles, or add shows to My List to hear about new episodes.</small>
            </div>
          ) : (
            <ul className="notif-list">
              {items.slice(0, 20).map((n) => (
                <li key={n.key} className={n.unread ? 'unread' : ''}>
                  <Link to={n.href} onClick={() => setOpen(false)}>
                    <span className="notif-img">
                      <Img srcs={[...sized(n.item.background, 'small'), ...sized(n.item.poster, 'small')]} alt="" fallback={<span />} />
                    </span>
                    <span className="notif-text">
                      <strong>{n.title}</strong>
                      <span>{n.text}</span>
                    </span>
                    {n.unread && <span className="notif-dot" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link to="/new" className="nav-pop-foot" onClick={() => setOpen(false)}>
            See what&apos;s coming soon <I.ChevronRight width={14} height={14} />
          </Link>
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const profiles = useProfiles();
  const me = activeProfile(profiles);
  const { open, setOpen, ref } = usePopover();
  const navigate = useNavigate();
  const go = (to) => {
    setOpen(false);
    navigate(to);
  };
  return (
    <div className="nav-pop-wrap" ref={ref} onMouseLeave={() => setOpen(false)}>
      <button className="profile-btn" onClick={() => setOpen((v) => !v)} onMouseEnter={() => matchMedia('(hover: hover)').matches && setOpen(true)} aria-label="Profile menu" aria-expanded={open}>
        <Avatar index={me.avatar} kids={me.kids} size={32} />
        <I.ChevronDown width={14} height={14} className={`caret ${open ? 'up' : ''}`} />
      </button>
      {open && (
        <div className="nav-pop profile-pop">
          {profiles.list
            .filter((p) => p.id !== me.id)
            .map((p) => (
              <button key={p.id} className="profile-pop-item" onClick={() => (switchProfile(p.id), go('/'))}>
                <Avatar index={p.avatar} kids={p.kids} size={30} />
                <span>{p.name}</span>
                {p.kids && <span className="kids-tag">Kids</span>}
              </button>
            ))}
          <button className="profile-pop-item" onClick={() => go('/profiles/manage')}>
            <I.Pencil width={18} height={18} />
            <span>Manage Profiles</span>
          </button>
          <button className="profile-pop-item" onClick={() => go('/settings')}>
            <I.Settings width={18} height={18} />
            <span>Settings</span>
          </button>
          <button className="profile-pop-item" onClick={() => go('/list')}>
            <I.Bookmark width={18} height={18} />
            <span>My List</span>
          </button>
          <div className="profile-pop-sep" />
          <button className="profile-pop-item center" onClick={() => go('/profiles')}>
            Switch Profile
          </button>
        </div>
      )}
    </div>
  );
}

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="NodeVid home">
      <span className="logo-mark">
        <I.Play width={14} height={14} />
      </span>
      <span className="logo-text">
        Node<span>Vid</span>
      </span>
    </Link>
  );
}

const links = [
  { to: '/', label: 'Home', icon: I.Home, end: true },
  { to: '/tv', label: 'TV Shows', icon: I.Tv },
  { to: '/movies', label: 'Movies', icon: I.Film },
  { to: '/new', label: 'New & Popular', short: 'New & Hot', icon: I.Flame },
  { to: '/animation', label: 'Animation', icon: I.Sparkles, desktop: true },
  { to: '/categories', label: 'Categories', icon: I.Grid },
  { to: '/list', label: 'My List', icon: I.Bookmark, desktop: true },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Keep the nav search box in sync with /search?q=
  useEffect(() => {
    if (location.pathname === '/search') setQ(new URLSearchParams(location.search).get('q') || '');
    else setQ('');
  }, [location.pathname, location.search]);

  // "/" focuses search
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !/input|textarea/i.test(document.activeElement?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onChange = (e) => {
    const v = e.target.value;
    setQ(v);
    const target = `/search${v ? `?q=${encodeURIComponent(v)}` : ''}`;
    navigate(target, { replace: location.pathname === '/search' });
  };

  return (
    <>
      <header className={`nav ${scrolled ? 'nav-solid' : ''}`}>
        <div className="nav-inner">
          <Logo />
          <nav className="nav-links">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className="nav-link">
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="nav-right">
            <label className="nav-search">
              <I.Search width={18} height={18} />
              <input ref={inputRef} value={q} onChange={onChange} placeholder="Search titles or paste an ID" aria-label="Search" />
              {!q && <kbd>/</kbd>}
            </label>
            <Link to="/search" className="icon-btn nav-search-mobile" aria-label="Search">
              <I.Search />
            </Link>
            <Bell />
            <ProfileMenu />
          </div>
        </div>
      </header>
      <nav className="tabbar">
        {links
          .filter((l) => !l.desktop || l.to === '/list')
          .filter((l) => l.to !== '/categories')
          .map(({ to, label, short, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="tab">
              <Icon />
              <span>{short || label}</span>
            </NavLink>
          ))}
      </nav>
    </>
  );
}
