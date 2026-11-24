import { Link } from 'react-router-dom';
import { Logo } from './Navbar.jsx';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <Logo />
          <p>Free, legal classic movies and TV. Every title is in the public domain or openly licensed. No account needed — your list and progress stay in your browser.</p>
        </div>
        <nav>
          <Link to="/movies">Movies</Link>
          <Link to="/tv">Series</Link>
          <Link to="/new">New &amp; Popular</Link>
          <Link to="/categories">Categories</Link>
          <Link to="/animation">Animation</Link>
          <Link to="/list">My List</Link>
          <Link to="/profiles">Profiles</Link>
          <Link to="/settings">Settings</Link>
          <Link to="/about">About &amp; Legal</Link>
        </nav>
      </div>
      <div className="container fineprint">
        All titles are in the public domain in the United States or released under Creative Commons licences (credited on each title). Video is streamed from the{' '}
        <a href="https://archive.org" target="_blank" rel="noreferrer">
          Internet Archive
        </a>
        ; NodeVid hosts no files and is not affiliated with it. Found a title that shouldn&apos;t be here?{' '}
        <a href="https://github.com/OmniNodeCo/NodeVid/issues" target="_blank" rel="noreferrer">
          Report it
        </a>
        .
      </div>
    </footer>
  );
}
