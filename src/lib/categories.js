// Curated categories built on top of the keyless Cinemeta catalogs.
// Simple ones map to a single catalog query; "filtered" ones fetch a few pages
// and narrow them down client-side (genre combos, country, awards, decades).
import { catalog, catalogPages, THIS_YEAR } from './catalog.js';

const has = (g) => (it) => it.genres?.includes(g);
const country = (re) => (it) => re.test(it.country || '');
const decade = (start) => Array.from({ length: 10 }, (_, i) => String(start + i));

/**
 * id: url slug · title · type: 'movie'|'tv' · group: for the Categories page
 * query: catalog query (single page, pageable)
 * pages + filter: multi-page fetch narrowed client-side
 * years: merge several year catalogs (decades)
 */
export const CATEGORIES = [
  // Popular & acclaimed
  { id: 'trending-movies', title: 'Trending Movies', type: 'movie', group: 'Popular', query: { list: 'top' } },
  { id: 'trending-series', title: 'Trending Series', type: 'tv', group: 'Popular', query: { list: 'top' } },
  { id: 'acclaimed-movies', title: 'Critically Acclaimed Movies', type: 'movie', group: 'Popular', query: { list: 'imdbRating' } },
  { id: 'binge-worthy', title: 'Binge-Worthy TV Shows', type: 'tv', group: 'Popular', query: { list: 'imdbRating' } },
  { id: 'award-winning-movies', title: 'Award-Winning Movies', type: 'movie', group: 'Popular', pages: 4, filter: (it) => /\bWon\b/i.test(it.awards) },
  { id: 'emmy-winners', title: 'Emmy-Winning Series', type: 'tv', group: 'Popular', pages: 4, filter: (it) => /Emmy/i.test(it.awards) && /\bWon\b/i.test(it.awards) },
  { id: 'new-this-year', title: `New in ${THIS_YEAR}`, type: 'movie', group: 'Popular', query: { list: 'year', genre: String(THIS_YEAR) } },
  { id: 'new-series', title: `New Series in ${THIS_YEAR}`, type: 'tv', group: 'Popular', query: { list: 'year', genre: String(THIS_YEAR) } },

  // Movie genres
  { id: 'action', title: 'Action Movies', type: 'movie', group: 'Movies', query: { genre: 'Action' } },
  { id: 'adventure', title: 'Adventure Movies', type: 'movie', group: 'Movies', query: { genre: 'Adventure' } },
  { id: 'comedy', title: 'Comedies', type: 'movie', group: 'Movies', query: { genre: 'Comedy' } },
  { id: 'romcom', title: 'Romantic Comedies', type: 'movie', group: 'Movies', pages: 4, query: { genre: 'Romance' }, filter: has('Comedy') },
  { id: 'drama', title: 'Dramas', type: 'movie', group: 'Movies', query: { genre: 'Drama' } },
  { id: 'thriller', title: 'Thrillers', type: 'movie', group: 'Movies', query: { genre: 'Thriller' } },
  { id: 'horror', title: 'Horror Movies', type: 'movie', group: 'Movies', query: { genre: 'Horror' } },
  { id: 'scifi', title: 'Sci-Fi Movies', type: 'movie', group: 'Movies', query: { genre: 'Sci-Fi' } },
  { id: 'fantasy', title: 'Fantasy Movies', type: 'movie', group: 'Movies', query: { genre: 'Fantasy' } },
  { id: 'mystery', title: 'Mystery Movies', type: 'movie', group: 'Movies', query: { genre: 'Mystery' } },
  { id: 'crime-movies', title: 'Crime Movies', type: 'movie', group: 'Movies', query: { genre: 'Crime' } },
  { id: 'romance', title: 'Romantic Movies', type: 'movie', group: 'Movies', query: { genre: 'Romance' } },
  { id: 'superhero', title: 'Action & Sci-Fi Blockbusters', type: 'movie', group: 'Movies', pages: 4, query: { genre: 'Action' }, filter: (it) => has('Sci-Fi')(it) || has('Fantasy')(it) },
  { id: 'animated-movies', title: 'Animated Movies', type: 'movie', group: 'Movies', query: { genre: 'Animation' } },
  { id: 'family', title: 'Family Movie Night', type: 'movie', group: 'Movies', query: { genre: 'Family' } },
  { id: 'documentary', title: 'Documentaries', type: 'movie', group: 'Movies', query: { genre: 'Documentary' } },
  { id: 'biography', title: 'Based on Real Life', type: 'movie', group: 'Movies', query: { genre: 'Biography' } },
  { id: 'history', title: 'Historical Movies', type: 'movie', group: 'Movies', query: { genre: 'History' } },
  { id: 'war', title: 'War Movies', type: 'movie', group: 'Movies', query: { genre: 'War' } },
  { id: 'western', title: 'Westerns', type: 'movie', group: 'Movies', query: { genre: 'Western' } },
  { id: 'sport', title: 'Sports Movies', type: 'movie', group: 'Movies', query: { genre: 'Sport' } },
  { id: 'scary-good', title: 'Top Rated Horror', type: 'movie', group: 'Movies', query: { list: 'imdbRating', genre: 'Horror' } },

  // TV
  { id: 'crime-tv', title: 'Crime TV Shows', type: 'tv', group: 'TV Shows', query: { genre: 'Crime' } },
  { id: 'drama-tv', title: 'TV Dramas', type: 'tv', group: 'TV Shows', query: { genre: 'Drama' } },
  { id: 'comedy-tv', title: 'TV Comedies', type: 'tv', group: 'TV Shows', query: { genre: 'Comedy' } },
  { id: 'scifi-tv', title: 'Sci-Fi & Fantasy TV', type: 'tv', group: 'TV Shows', query: { genre: 'Sci-Fi' } },
  { id: 'fantasy-tv', title: 'Fantasy Series', type: 'tv', group: 'TV Shows', query: { genre: 'Fantasy' } },
  { id: 'mystery-tv', title: 'Mystery Series', type: 'tv', group: 'TV Shows', query: { genre: 'Mystery' } },
  { id: 'thriller-tv', title: 'Thriller Series', type: 'tv', group: 'TV Shows', query: { genre: 'Thriller' } },
  { id: 'action-tv', title: 'Action & Adventure Series', type: 'tv', group: 'TV Shows', query: { genre: 'Action' } },
  { id: 'horror-tv', title: 'Horror Series', type: 'tv', group: 'TV Shows', query: { genre: 'Horror' } },
  { id: 'docuseries', title: 'Docuseries', type: 'tv', group: 'TV Shows', query: { genre: 'Documentary' } },
  { id: 'reality', title: 'Reality TV', type: 'tv', group: 'TV Shows', query: { genre: 'Reality-TV' } },
  { id: 'talk-shows', title: 'Talk Shows', type: 'tv', group: 'TV Shows', query: { genre: 'Talk-Show' } },
  { id: 'game-shows', title: 'Game Shows', type: 'tv', group: 'TV Shows', query: { genre: 'Game-Show' } },
  { id: 'history-tv', title: 'Historical Series', type: 'tv', group: 'TV Shows', query: { genre: 'History' } },

  // Animation & kids
  { id: 'anime', title: 'Anime Series', type: 'tv', group: 'Animation & Kids', pages: 6, query: { genre: 'Animation' }, filter: country(/Japan/) },
  { id: 'anime-movies', title: 'Anime Movies', type: 'movie', group: 'Animation & Kids', pages: 6, query: { genre: 'Animation' }, filter: country(/Japan/) },
  { id: 'cartoons', title: 'Animated Series', type: 'tv', group: 'Animation & Kids', query: { genre: 'Animation' } },
  { id: 'kids-tv', title: 'Kids TV', type: 'tv', group: 'Animation & Kids', query: { genre: 'Family' } },
  { id: 'family-adventures', title: 'Family Adventures', type: 'movie', group: 'Animation & Kids', pages: 4, query: { genre: 'Family' }, filter: has('Adventure') },
  { id: 'family-fantasy', title: 'Magical Family Movies', type: 'movie', group: 'Animation & Kids', pages: 4, query: { genre: 'Family' }, filter: has('Fantasy') },

  // Around the world
  { id: 'k-drama', title: 'K-Dramas', type: 'tv', group: 'Around the World', pages: 8, query: { genre: 'Drama' }, filter: country(/Korea/) },
  { id: 'korean-movies', title: 'Korean Movies', type: 'movie', group: 'Around the World', pages: 8, query: {}, filter: country(/Korea/) },
  { id: 'british-tv', title: 'British TV', type: 'tv', group: 'Around the World', pages: 4, query: {}, filter: country(/United Kingdom/) },
  { id: 'british-movies', title: 'British Movies', type: 'movie', group: 'Around the World', pages: 6, query: {}, filter: country(/United Kingdom/) },
  { id: 'spanish', title: 'Spanish-Language TV', type: 'tv', group: 'Around the World', pages: 8, query: {}, filter: country(/Spain|Mexico|Argentina|Colombia/) },
  { id: 'bollywood', title: 'Indian Movies', type: 'movie', group: 'Around the World', pages: 8, query: {}, filter: country(/India/) },
  { id: 'french', title: 'French Movies', type: 'movie', group: 'Around the World', pages: 8, query: {}, filter: country(/France/) },
  { id: 'japanese-movies', title: 'Japanese Movies', type: 'movie', group: 'Around the World', pages: 8, query: {}, filter: (it) => country(/Japan/)(it) && !has('Animation')(it) },

  // Decades
  { id: '2010s', title: '2010s Hits', type: 'movie', group: 'Decades', years: decade(2010) },
  { id: '2000s', title: '2000s Favorites', type: 'movie', group: 'Decades', years: decade(2000) },
  { id: '90s', title: '90s Classics', type: 'movie', group: 'Decades', years: decade(1990) },
  { id: '80s', title: 'Totally 80s', type: 'movie', group: 'Decades', years: decade(1980) },
  { id: '70s', title: '70s Cinema', type: 'movie', group: 'Decades', years: decade(1970) },
  { id: '90s-tv', title: '90s TV', type: 'tv', group: 'Decades', years: decade(1990) },
  { id: '2000s-tv', title: '2000s TV', type: 'tv', group: 'Decades', years: decade(2000) },
];

/** Ids of categories that are safe for Kids profiles. */
export const KIDS_CATEGORIES = ['cartoons', 'kids-tv', 'family', 'animated-movies', 'family-adventures', 'family-fantasy', 'anime', 'anime-movies'];
const KIDS_BLOCK = /Horror|Thriller|Crime|War/;
export const kidSafe = (it) => !it.genres?.some((g) => KIDS_BLOCK.test(g));

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id);

/**
 * Load one "page" of a category. `page` is 0-based; returns { items, more }.
 * Filtered categories walk several catalog pages per call.
 */
export async function loadCategory(cat, page = 0) {
  if (cat.years) {
    // A decade: interleave the year catalogs, best rated first.
    const res = await Promise.all(cat.years.map((y) => catalog(cat.type, { list: 'year', genre: y, skip: page * 50 }).catch(() => [])));
    const seen = new Set();
    const items = res
      .flat()
      .filter((x) => x.background && !seen.has(x.id) && seen.add(x.id))
      .sort((a, b) => b.rating - a.rating);
    return { items, more: res.some((r) => r.length >= 40) };
  }
  if (cat.filter) {
    const pages = cat.pages || 3;
    const raw = await catalogPages(cat.type, { ...(cat.query || {}), skip: page * pages * 50 }, pages);
    return { items: raw.filter(cat.filter), more: raw.length >= pages * 40 };
  }
  const items = await catalog(cat.type, { ...(cat.query || {}), skip: page * 50 });
  return { items, more: items.length >= 40 };
}
