import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Setup from './components/Setup.jsx';
import Home from './pages/Home.jsx';
import Browse from './pages/Browse.jsx';
import Search from './pages/Search.jsx';
import Details from './pages/Details.jsx';
import Watch from './pages/Watch.jsx';
import MyList from './pages/MyList.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';
import { initTmdb } from './lib/tmdb.js';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const [mode, setMode] = useState(null);
  const location = useLocation();
  const watching = location.pathname.startsWith('/watch/');

  useEffect(() => {
    initTmdb().then(setMode);
  }, []);

  if (mode === null) return <div className="boot"><span className="spinner" /></div>;
  if (mode === 'none') return <Setup onDone={() => initTmdb().then(setMode)} />;

  return (
    <>
      <ScrollToTop />
      {!watching && <Navbar />}
      <main className={watching ? '' : 'main'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Browse kind="movie" key="movie" />} />
          <Route path="/tv" element={<Browse kind="tv" key="tv" />} />
          <Route path="/anime" element={<Browse kind="anime" key="anime" />} />
          <Route path="/search" element={<Search />} />
          <Route path="/list" element={<MyList />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/movie/:id" element={<Details type="movie" />} />
          <Route path="/tv/:id" element={<Details type="tv" />} />
          <Route path="/watch/movie/:id" element={<Watch type="movie" />} />
          <Route path="/watch/tv/:id/:season/:episode" element={<Watch type="tv" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!watching && <Footer />}
    </>
  );
}
