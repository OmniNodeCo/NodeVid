import { Link } from 'react-router-dom';
import { Logo } from './Navbar.jsx';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <Logo />
          <p>Watch movies and TV shows in HD. No account needed — your list and progress stay in your browser.</p>
        </div>
        <nav>
          <Link to="/movies">Movies</Link>
          <Link to="/tv">TV Shows</Link>
          <Link to="/animation">Animation</Link>
          <Link to="/list">My List</Link>
          <Link to="/settings">Settings</Link>
        </nav>
      </div>
      <div className="container fineprint">
        NodeVid does not store any files on its server. All media is provided by non-affiliated third parties via the Vidking embed player. Catalog data from Cinemeta.
      </div>
    </footer>
  );
}
