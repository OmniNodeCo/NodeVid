import { useEffect, useRef, useState } from 'react';

/**
 * Infinite list driven by a skip-based fetcher: fetchPage(skip) => items[].
 * `key` must change whenever the query changes. Returns a sentinel ref to
 * place after the list; when it scrolls into view the next page loads.
 */
export default function useInfinite(fetchPage, key, { enabled = true, pageable = true } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const keyRef = useRef(key);
  const busy = useRef(false);
  const sentinel = useRef(null);
  const state = useRef({ items: [] });

  const load = async (k) => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const skip = state.current.items.length;
      const page = await fetchPage(skip);
      if (keyRef.current !== k) return;
      const seen = new Set(state.current.items.map((x) => `${x.type}-${x.id}`));
      const fresh = page.filter((x) => !seen.has(`${x.type}-${x.id}`));
      state.current.items = [...state.current.items, ...fresh];
      setItems(state.current.items);
      if (!pageable || fresh.length === 0) setDone(true);
      setError(null);
    } catch (e) {
      if (keyRef.current === k) {
        setError(e.message);
        setDone(true);
      }
    } finally {
      if (keyRef.current === k) {
        busy.current = false;
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    keyRef.current = key;
    busy.current = false;
    state.current.items = [];
    setItems([]);
    setDone(false);
    setError(null);
    if (enabled) load(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const hasMore = enabled && !done && items.length > 0;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !busy.current) load(keyRef.current);
      },
      { rootMargin: '800px' }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, items.length]);

  return { items, loading, error, hasMore, sentinel };
}
