import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container page-pad empty-state">
      <h1 style={{ fontSize: 64, margin: 0 }}>404</h1>
      <p>This page wandered off set.</p>
      <Link to="/" className="btn btn-primary">
        Back home
      </Link>
    </div>
  );
}
