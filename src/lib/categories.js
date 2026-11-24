// Curated categories over the public-domain library (see lib/library.js).
import { catalog, decadeOf } from './catalog.js';

const g = (...names) => (it) => it.genres?.some((x) => names.includes(x));
const all = (...names) => (it) => names.every((n) => it.genres?.includes(n));
const about = (re) => (it) => re.test(`${it.title} ${it.description}`);
const decade = (d) => (it) => decadeOf(it) === d;

/**
 * id: url slug · title · group: section on the Categories page
 * type: 'movie' | 'tv' | undefined (both) · filter · sort ('top'|'week'|'oldest'|'newest'|'az')
 */
export const CATEGORIES = [
  // Popular
  { id: 'most-watched', title: 'Most Watched of All Time', group: 'Popular', sort: 'top' },
  { id: 'trending', title: 'Trending This Week', group: 'Popular', sort: 'week' },
  { id: 'movies', title: 'All Movies', group: 'Popular', type: 'movie' },
  { id: 'series', title: 'Series & Shorts Collections', group: 'Popular', type: 'tv' },
  { id: 'open-movies', title: 'Open Movies (Creative Commons)', group: 'Popular', filter: (it) => it.license !== 'pd', sort: 'newest' },

  // Genres
  { id: 'comedy', title: 'Comedies', group: 'Genres', filter: g('Comedy') },
  { id: 'screwball', title: 'Screwball & Romantic Comedies', group: 'Genres', filter: all('Comedy', 'Romance') },
  { id: 'romance', title: 'Romance', group: 'Genres', filter: g('Romance') },
  { id: 'drama', title: 'Dramas', group: 'Genres', filter: g('Drama') },
  { id: 'film-noir', title: 'Film Noir', group: 'Genres', filter: g('Film-Noir') },
  { id: 'mystery', title: 'Mystery & Crime', group: 'Genres', filter: g('Mystery', 'Crime') },
  { id: 'thriller', title: 'Thrillers', group: 'Genres', filter: g('Thriller') },
  { id: 'horror', title: 'Classic Horror', group: 'Genres', filter: g('Horror') },
  { id: 'sci-fi', title: 'Sci-Fi & Fantasy', group: 'Genres', filter: g('Sci-Fi', 'Fantasy') },
  { id: 'western', title: 'Westerns', group: 'Genres', filter: g('Western') },
  { id: 'adventure', title: 'Action & Adventure', group: 'Genres', filter: g('Adventure', 'Action') },
  { id: 'musical', title: 'Musicals', group: 'Genres', filter: g('Musical') },
  { id: 'history', title: 'History & War', group: 'Genres', filter: g('History', 'War', 'Biography', 'Documentary') },
  { id: 'animation', title: 'Animation', group: 'Genres', filter: g('Animation') },
  { id: 'shorts', title: 'Shorts', group: 'Genres', filter: g('Short') },

  // Eras
  { id: 'silent', title: 'The Silent Era', group: 'Eras', filter: g('Silent') },
  { id: 'pioneers', title: 'Film Pioneers (1900s–1910s)', group: 'Eras', filter: (it) => Number(it.year) < 1920, sort: 'oldest' },
  { id: '1920s', title: 'The Roaring Twenties', group: 'Eras', filter: decade('1920s') },
  { id: '1930s', title: '1930s Classics', group: 'Eras', filter: decade('1930s') },
  { id: '1940s', title: '1940s Classics', group: 'Eras', filter: decade('1940s') },
  { id: '1950s', title: '1950s Classics', group: 'Eras', filter: decade('1950s') },
  { id: '1960s', title: '1960s Cult & Classics', group: 'Eras', filter: decade('1960s') },
  { id: 'classic-tv', title: 'Classic TV', group: 'Eras', type: 'tv', filter: (it) => Number(it.year) >= 1950 },

  // Collections
  { id: 'keaton', title: 'Buster Keaton', group: 'Collections', filter: about(/Keaton|Buster/) },
  { id: 'chaplin', title: 'Charlie Chaplin', group: 'Collections', filter: about(/Chaplin/) },
  { id: 'fairbanks', title: 'Douglas Fairbanks Swashbucklers', group: 'Collections', filter: about(/Fairbanks/) },
  { id: 'john-wayne', title: 'John Wayne', group: 'Collections', filter: about(/John Wayne/) },
  { id: 'hitchcock', title: 'Early Hitchcock', group: 'Collections', filter: about(/Hitchcock/) },
  { id: 'sherlock', title: 'Sherlock Holmes', group: 'Collections', filter: about(/Holmes/) },
  { id: 'vincent-price', title: 'Vincent Price', group: 'Collections', filter: about(/Vincent Price/) },
  { id: 'monsters', title: 'Monsters, Vampires & Zombies', group: 'Collections', filter: about(/vampire|zombie|monster|dinosaur|Phantom|Golem|Hyde|dead/i) },
  { id: 'cult', title: 'So Bad They\u2019re Good', group: 'Collections', filter: about(/Ed Wood|lobster|bug-eyed|severed head|Santa Claus|Corman|silly/i) },
  { id: 'landmarks', title: 'Landmarks of Cinema', group: 'Collections', filter: about(/first|landmark|masterpiece|legendary|groundbreaking|Best Picture/i) },
  { id: 'holiday', title: 'Holiday Favorites', group: 'Collections', filter: about(/Christmas|Santa/i) },

  // Kids & family
  { id: 'kids-all', title: 'Kids & Family', group: 'Kids & Family', filter: (it) => it.kids },
  { id: 'cartoons', title: 'Cartoons', group: 'Kids & Family', filter: (it) => it.kids && g('Animation')(it) },
  { id: 'kids-laughs', title: 'Silent Laughs for Everyone', group: 'Kids & Family', filter: (it) => it.kids && all('Comedy', 'Silent')(it) },
  { id: 'kids-adventure', title: 'Family Adventures', group: 'Kids & Family', filter: (it) => it.kids && g('Adventure', 'Fantasy', 'Action')(it) },
  { id: 'kids-westerns', title: 'Saturday Matinee Westerns', group: 'Kids & Family', filter: (it) => it.kids && g('Western')(it) },
];

/** Ids of categories that are safe for Kids profiles. */
export const KIDS_CATEGORIES = ['kids-all', 'cartoons', 'kids-laughs', 'kids-adventure', 'kids-westerns'];
export const kidSafe = (it) => Boolean(it?.kids);

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id);

/** Load a category. The whole library is local, so it's a single page. */
export async function loadCategory(cat, page = 0) {
  if (page > 0) return { items: [], more: false };
  const items = await catalog(cat.type, { list: cat.sort || 'top', filter: cat.filter, limit: 500 });
  return { items, more: false };
}
