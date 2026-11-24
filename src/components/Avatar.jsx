import { AVATARS } from '../lib/store.js';

/** Netflix-style smiley avatar. `face` varies the expression a little per index. */
export default function Avatar({ index = 0, size = 32, kids = false, className = '' }) {
  const color = AVATARS[index % AVATARS.length];
  const face = index % 4;
  return (
    <svg className={`avatar ${className}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={`av${index}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.72" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="12" fill={`url(#av${index})`} />
      {kids ? (
        <>
          <circle cx="34" cy="40" r="8" fill="#fff" />
          <circle cx="66" cy="40" r="8" fill="#fff" />
          <circle cx="36" cy="42" r="3.5" fill="#111" />
          <circle cx="68" cy="42" r="3.5" fill="#111" />
          <path d="M30 62 Q50 82 70 62" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          {face === 1 ? (
            <>
              <path d="M27 40 Q34 33 41 40" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" />
              <path d="M59 40 Q66 33 73 40" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <rect x="29" y="30" width="9" height={face === 2 ? 9 : 16} rx="4.5" fill="#fff" />
              <rect x="62" y="30" width="9" height={face === 2 ? 9 : 16} rx="4.5" fill="#fff" />
            </>
          )}
          <path
            d={face === 3 ? 'M30 62 Q50 74 70 62' : 'M26 58 Q50 84 74 58'}
            stroke="#fff"
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
