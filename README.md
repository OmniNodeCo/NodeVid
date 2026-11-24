# NodeVid

A Cineby-style streaming site for movies, TV shows and anime. Metadata comes from [TMDB](https://www.themoviedb.org/), and playback uses the [Vidking](https://www.vidking.net/) embed player.

## Features

- **Home page** with a rotating hero banner (title logos, backdrops) and lazy-loaded rows: trending, popular, top rated, now playing, anime and genre rows
- **Movies / TV Shows / Anime** pages with genre filters, sorting (popular, top rated, newest, box office) and infinite scroll
- **Instant search** across movies and shows (press `/` to focus it)
- **Details pages** with logo, rating, certification, runtime, genres, trailer modal, cast, recommendations, and a full **season and episode browser** for TV
- **Watch page** with the Vidking player, previous/next episode buttons, an episode drawer, and an "up next" countdown when an episode ends
- **Continue Watching**: the player's `PLAYER_EVENT` messages are saved, and playback picks up where you left off (`?progress=`)
- **My List** watchlist, plus player settings (accent color, autoplay, next-episode button, episode menu). All of this is saved in `localStorage`, so no account is needed
- Responsive layout with a bottom tab bar on mobile

## Getting started

```bash
npm install
npm run build
npm start            # http://localhost:3000
```

### TMDB key

You can provide a TMDB key in either of these ways:

1. **Server-side (recommended):** copy `.env.example` to `.env` and set `TMDB_API_KEY` (a v3 key or a v4 read token). The Express server proxies and caches TMDB requests, so the key never reaches the browser.
2. **Per browser:** if the server has no key, the site asks visitors to paste their own key. It is stored only in their browser, and requests go straight to TMDB.

### Development

```bash
npm start      # API proxy on :3000
npm run dev    # Vite dev server on :5173 (proxies /api to :3000)
```

## How playback works

| Content | Embed URL |
| --- | --- |
| Movie | `https://www.vidking.net/embed/movie/{tmdbId}` |
| Episode | `https://www.vidking.net/embed/tv/{tmdbId}/{season}/{episode}` |

Query params used: `color`, `autoPlay`, `nextEpisode`, `episodeSelector`, `progress`.

## Project structure

```
server.js            Express server: TMDB proxy + cache, serves dist/
src/lib/tmdb.js      TMDB client (server proxy or direct with browser key)
src/lib/store.js     localStorage stores: settings, My List, watch progress
src/pages/           Home, Browse, Search, Details, Watch, MyList, Settings
src/components/      Navbar, Hero, Row/Scroller, Cards, Setup, Footer
```

---

NodeVid does not host any media. Streams come from third-party providers. This product uses the TMDB API but is not endorsed or certified by TMDB.
