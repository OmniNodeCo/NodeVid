# NodeVid

A free, **100% legal** Netflix-style streaming site for classic movies and TV. Every title is either in the **public domain in the United States** or released by its creators under a **Creative Commons** licence, and the video is streamed straight from the [Internet Archive](https://archive.org).

- No API key, no account and no backend needed. It runs fully on GitHub Pages.
- No third-party streaming embeds and no ads. Videos play in the browser's own `<video>` player.
- About 88 films and 7 series/short collections (26 episodes) in 44 categories, plus a **Coming Soon** list of films that enter the US public domain on the next Public Domain Day (January 1).

## What's in the library

The catalog is a hand-curated list in `src/lib/library.js`. Public-domain labels on the Internet Archive are set by uploaders and are sometimes wrong, so titles are only included when their status is well documented:

| Rule | Examples |
| --- | --- |
| Published before 1931: US copyright has expired | *Nosferatu*, *Metropolis*, *The General*, *Safety Last!*, *Steamboat Willie*, Chaplin shorts |
| US films from 1931–1963 whose copyright was never renewed | *His Girl Friday*, *Detour*, *Meet John Doe*, *McLintock!*, Fleischer *Superman* cartoons |
| US works published without a copyright notice (required until 1989) | *Night of the Living Dead*, *Charade*, *Carnival of Souls* |
| Open movies released under CC0 / CC BY, credited on each title | *Big Buck Bunny*, *Sintel*, *Tears of Steel*, *Sita Sings the Blues* |

Left out on purpose:

- Foreign sound films from 1931 onwards, since many had their US copyright restored in 1996 (URAA).
- Uploads with a newly added copyrighted score, and other questionable rips.

Public-domain status is country-specific: everything here is public domain *in the US*. Each title page shows its licence, credit and a link to the source item on archive.org. The **About & Legal** page (`/about`) explains this to visitors. To report a title, open an issue and it will be removed.

### Adding a title

Add an entry to `LIBRARY` in `src/lib/library.js`:

```js
{ id: 'archive-item-identifier', type: 'movie', title: 'Title', year: 1929, runtime: '80 min',
  genres: ['Drama', 'Silent'], start: 300, kids: true, desc: 'One-sentence synopsis.' }
```

- For a CC title, add `license: 'cc-by'` (or `'cc0'`) and a `credit`. Licences are defined in `LICENSES`.
- For a series, use `type: 'tv'` with either an `episodes` list (one archive item per episode) or `item` (one archive item whose video files are the episodes).
- `start` is where the muted billboard preview begins, in seconds.
- Only add something if you can confirm it's public domain or openly licensed. Check the rules above.

## How it works

| Piece | Source |
| --- | --- |
| Titles, descriptions, genres | `src/lib/library.js` (written for NodeVid) |
| Posters and backdrops | `https://archive.org/services/img/{id}` |
| Video files | `https://archive.org/metadata/{id}` lists the files. The player picks h.264/MPEG-4 first, then WebM/Ogg, and falls back to the next file if one fails |
| Most Watched / Trending / Top 10 | Download counts from the Archive's `advancedsearch` API, cached for 12 hours |

All Archive APIs used are keyless and CORS-enabled.

## Features

- **Profiles ("Who's watching?")**: up to 5 per browser, each with its own My List, history, ratings and reminders. **Kids** profiles only see family titles.
- **Billboard previews**: after a few seconds, the home hero and title pages play a muted clip of the film itself, with mute and replay buttons. You can turn this off in Settings.
- **Hover previews**, **Top 10 rows** with big numbers, 👍/❤️/👎 ratings, a "% Match" score, and **"Because you watched…"** rows.
- **New & Popular** (`/new`): Coming Soon (Public Domain Day, with **Remind Me**), Trending, Top 10 Movies / Series, and Open Movies.
- **Notifications bell**: tells you when a reminded film enters the public domain, and nudges you about the next episode of a series you're watching.
- **Watch page**: native player with quality/file menu, resume, previous/next episode, episode drawer and an "up next" countdown. CC titles show their attribution.
- **44 categories** at `/categories`, for example Film Noir, Classic Horror, The Silent Era, Buster Keaton, Charlie Chaplin, Early Hitchcock, So Bad They're Good, and Saturday Matinee Westerns.
- **Movies / Series / Animation** pages with genre and decade filters and sorting. **Search** works on titles, genres and years (press `/` to focus it).
- Everything (lists, progress, settings) is stored in `localStorage`.

## Routes

| Path | What |
| --- | --- |
| `/movie/:id`, `/tv/:id` | Details page. `id` is the Internet Archive identifier (e.g. `/movie/his_girl_friday`) |
| `/watch/movie/:id` | Player |
| `/watch/tv/:id/:season/:episode` | Episode player |
| `/new` | New & Popular (`?tab=coming|watching|top-movies|top-tv|open`) |
| `/categories`, `/category/:id` | All categories, and one category (e.g. `/category/film-noir`) |
| `/about` | About & Legal |
| `/profiles`, `/profiles/manage` | Profile picker / editor |

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

- `404.html` is a copy of `index.html`. Pages has no SPA rewrites, so this is what makes deep links like `/NodeVid/movie/his_girl_friday` load.
- To use a different base path (for example a custom domain at `/`), run `npm run build:pages -- --base /`.

---

NodeVid hosts no media and isn't affiliated with the Internet Archive. This README is general information, not legal advice.
