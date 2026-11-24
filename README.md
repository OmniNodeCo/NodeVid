# NodeVid

A Cineby-style streaming site for movies, TV shows and animation. Playback comes from multiple embed servers you can switch between.

**You don't need an API key.** The catalog (posters, descriptions, episode lists) comes from the public [Cinemeta](https://v3-cinemeta.strem.io/manifest.json) API. Cinemeta gives every title's TMDB id, which is the id Vidking needs:

```
https://www.vidking.net/embed/movie/{tmdbId}
https://www.vidking.net/embed/tv/{tmdbId}/{season}/{episode}
```

## Servers

| # | Server | Embed | IDs | Extras used |
| --- | --- | --- | --- | --- |
| 1 | [Vidking](https://www.vidking.net/) | `/embed/movie/{id}`, `/embed/tv/{id}/{s}/{e}` | TMDB | `color`, `autoPlay`, `nextEpisode`, `episodeSelector`, `progress` |
| 2 | [VidSrc](https://vidsrc.sh/vidsrc/docs/) | `/embed/movie/{id}`, `/embed/tv/{id}/{s}/{e}` | IMDb or TMDB | `autoplay`, `autonext`, `startAt`, `ds_lang` |

- Pick the default server in **Settings**, or switch from the server menu on the watch page. When you switch, playback continues from where you were.
- Watch progress is read from both players' `PLAYER_EVENT` messages, which use different formats (see `src/lib/servers.js`).
- VidSrc's keyless API is also used for:
  - `/info/...json`: the quality badge, and the "unavailable on this server" warning with a one-click switch
  - `/episodes/latest`, `/movies/latest`: the **New Episodes** and **Recently Added Movies** rows on the home page
- To add another server, add an entry to `SERVERS` in `src/lib/servers.js` with its `origins`, `url()`, `check()` and `parseEvent()`.

### Automatic server switching

When you open a title or episode, NodeVid checks the servers and uses your preferred one unless there's a problem. It moves to the other server in these cases:

| Situation | How it's detected |
| --- | --- |
| **Site is down** | A quick reachability check of each server's domain, with a 5 s timeout. If VidSrc's main domain is down, its official mirrors (`vidsrc.sh`, then `vidsrc2.ru`, then `vidsrc.ir`) are tried before giving up on it |
| **Title not available** | VidSrc's `/info` API returns 404 for the title or episode |
| **Quality below 1080p** | VidSrc's `/info` reports 720p, SD, DVD or CAM. NodeVid only switches if the other server is likely to be better |
| **Player won't load** | The embed hasn't loaded and sent no player events after 20 s. That server is marked as failed and the next one is tried |

- When NodeVid switches, a notice says why (for example, "VidSrc only has 720p — switched to Vidking for better quality"). The notice has a **Use VidSrc** button to switch back.
- An automatic switch only applies to that page. It never changes your default server.
- If you pick a server from the menu yourself, NodeVid keeps it for that title and doesn't switch automatically. It still warns you if that server is down or doesn't have the title.
- The server menu shows each server's live status: Online, Down, Unavailable, or its quality, with low quality highlighted.
- Settings has two toggles, **Auto-switch servers** and **Require 1080p**. Both are on by default.
- Limitations: Vidking has no availability or quality API, so for Vidking only reachability is checked, plus the 20 s player watchdog. Its quality counts as "unknown", which ranks just below 1080p. Browsers can only tell if a domain is reachable, so a server that's online but serving an error page is only caught by the player watchdog.

## Features

- **Home page** with a rotating hero banner and lazy-loaded rows: popular, new this year, top rated, plus genre rows
- **Movies / TV Shows / Animation** pages with genre filters, sorting (popular, top rated, by year) and infinite scroll
- **Search** across movies and series (press `/` to focus it)
- **Play by ID**: paste a TMDB ID, a TMDB link or an IMDb link to open it straight in the Vidking player
- **Details pages** with logo, rating, runtime, genres, trailer, cast and crew, related rows, and a season/episode browser for series
- **Watch page** with previous/next episode buttons, an episode drawer, and an auto "up next" countdown
- **Continue Watching**: progress is saved from Vidking's player events and resumed with `?progress=`
- **My List**, player settings (accent color, autoplay, next-episode button, episode menu), and a mobile layout. Everything is stored in `localStorage`

## Routes

| Path | What |
| --- | --- |
| `/movie/:imdbId`, `/tv/:imdbId` | Details page (e.g. `/tv/tt0903747`) |
| `/watch/movie/:id` | Player. `id` is an IMDb id (resolved to TMDB) or a raw TMDB id (e.g. `/watch/movie/1078605`) |
| `/watch/tv/:id/:season/:episode` | Episode player (e.g. `/watch/tv/1396/1/1`) |

## Run locally

```bash
npm install
npm run build
npm start          # http://localhost:3000
```

`npm run dev` starts the Vite dev server. The front-end source, including its `index.html`, lives in `src/`.

## GitHub Pages

Live at **https://omninodeco.github.io/NodeVid/**

Pages for this repo is set to *Deploy from a branch → `/` (root)*, so the pre-built site is committed at the repo root (`index.html`, `404.html`, `assets/`, `.nojekyll`). After changing the code, rebuild and commit it:

```bash
npm run build:pages          # builds with base "/NodeVid/" into the repo root
git add -A && git commit -m "Rebuild Pages" && git push
```

- `404.html` is a copy of `index.html`. Pages has no SPA rewrites, so this is what makes deep links like `/NodeVid/tv/tt0903747` load.
- To use a different base path (for example a custom domain at `/`), run `npm run build:pages -- --base /`.

---

NodeVid does not host any media. Streams come from third-party providers.
