import { useCallback, useEffect, useRef, useState } from 'react';
import { tmdb } from './tmdb.js';

/** Paginated TMDB list with de-duplication + a sentinel ref for infinite scroll. */
export default function useInfinite(path, params, { enabled = true, filter } = {}) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const key = `${path}?${JSON.stringify(params)}`;
  const keyRef = useRef(key);
  const sentinel = useRef(null);

  const load = useCallback(
    async (p, k) => {
      setLoading(true);
      try {
        const d = await tmdb(path, { ...params, page: p });
        if (keyRef.current !== k) return;
        const results = (d.results || []).filter(filter || (() => true));
        setItems((prev) => {
          const seen = new Set(prev.map((x) => `${x.media_type}-${x.id}`));
          return [...(p === 1 ? [] : prev), ...results.filter((x) => !seen.has(`${x.media_type}-${x.id}`) || p === 1)];
        });
        setTotalPages(Math.min(d.total_pages || 1, 500));
        setPage(p);
        setError(null);
      } catch (e) {
        if (keyRef.current === k) setError(e.message);
      } finally {
        if (keyRef.current === k) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );

  useEffect(() => {
    keyRef.current = key;
    setItems([]);
    setPage(0);
    setTotalPages(1);
    if (enabled) load(1, key);
  }, [key, enabled]);

  const hasMore = page < totalPages;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !enabled) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !loading && hasMore && page > 0) load(page + 1, keyRef.current);
      },
      { rootMargin: '800px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loading, hasMore, page, enabled, load]);

  return { items, loading, error, hasMore, sentinel };
}
