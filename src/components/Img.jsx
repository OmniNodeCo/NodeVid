import { useEffect, useState } from 'react';

/** <img> that walks through a list of candidate URLs, then shows `fallback`. */
export default function Img({ srcs, alt = '', fallback = null, ...rest }) {
  const list = (Array.isArray(srcs) ? srcs : [srcs]).filter(Boolean);
  const key = list.join('|');
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [key]);
  if (i >= list.length) return fallback;
  return <img src={list[i]} alt={alt} onError={() => setI((n) => n + 1)} {...rest} />;
}
