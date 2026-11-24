import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Browse from './pages/Browse.jsx';
import Search from './pages/Search.jsx';
import Details from './pages/Details.jsx';
import Watch from './pages/Watch.jsx';
import MyList from './pages/MyList.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';
import NewPopular from './pages/NewPopular.jsx';
import Profiles from './pages/Profiles.jsx';
import { CategoriesIndex, CategoryPage } from './pages/Categories.jsx';
import { PreviewProvider } from './components/Preview.jsx';
import { needsProfilePick } from './lib/store.js';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const location = useLocation();
  const watching = location.pathname.startsWith('/watch/');
  const profilesPage = location.pathname.startsWith('/profiles');
  const [gate, setGate] = useState(() => needsProfilePick() && !watching);

  if (gate) return <Profiles onPicked={() => setGate(false)} />;

  return (
    <PreviewProvider>
      <ScrollToTop />
      {!watching && !profilesPage && <Navbar />}
      <main className={watching || profilesPage ? '' : 'main'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="/404.html" element={<Navigate to="/" replace />} />
          <Route path="/movies" element={<Browse kind="movie" key="movie" />} />
          <Route path="/tv" element={<Browse kind="tv" key="tv" />} />
          <Route path="/animation" element={<Browse kind="animation" key="animation" />} />
          <Route path="/anime" element={<Navigate to="/animation" replace />} />
          <Route path="/search" element={<Search />} />
          <Route path="/list" element={<MyList />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/new" element={<NewPopular />} />
          <Route path="/latest" element={<Navigate to="/new" replace />} />
          <Route path="/categories" element={<CategoriesIndex />} />
          <Route path="/category/:id" element={<CategoryPage />} />
          <Route path="/profiles" element={<Profiles key="pick" />} />
          <Route path="/profiles/manage" element={<Profiles key="manage" manageInitially />} />
          <Route path="/movie/:id" element={<Details type="movie" />} />
          <Route path="/tv/:id" element={<Details type="tv" />} />
          <Route path="/watch/movie/:id" element={<Watch type="movie" />} />
          <Route path="/watch/tv/:id/:season/:episode" element={<Watch type="tv" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!watching && !profilesPage && <Footer />}
    </PreviewProvider>
  );
}
