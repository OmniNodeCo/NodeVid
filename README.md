# NodeVid

A Cineby-style streaming site for movies, TV shows and animation. Playback uses the [Vidking](https://www.vidking.net/) embed player.

**You don't need an API key.** The catalog (posters, descriptions, episode lists) comes from the public [Cinemeta](https://v3-cinemeta.strem.io/manifest.json) API. Cinemeta gives every title's TMDB id, which is the id Vidking needs:

```
https://www.vidking.net/embed/movie/{tmdbId}
https://www.vidking.net/embed/tv/{tmdbId}/{season}/{episode}
```

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

## Run

```bash
npm install
npm run build
npm start          # http://localhost:3000
```

`npm run dev` starts the Vite dev server. The app is fully static, so you can also deploy `dist/` to any static host. If you do, configure a SPA fallback to `index.html`.

---

NodeVid does not host any media. Streams come from third-party providers.
