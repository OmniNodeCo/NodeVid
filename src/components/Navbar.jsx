import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import * as I from './Icons.jsx';

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
  { to: '/movies', label: 'Movies', icon: I.Film },
  { to: '/tv', label: 'TV Shows', icon: I.Tv },
  { to: '/animation', label: 'Animation', icon: I.Sparkles },
  { to: '/list', label: 'My List', icon: I.Bookmark },
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
            <NavLink to="/settings" className="icon-btn" aria-label="Settings">
              <I.Settings />
            </NavLink>
          </div>
        </div>
      </header>
      <nav className="tabbar">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="tab">
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
