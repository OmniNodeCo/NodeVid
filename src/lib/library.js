// NodeVid's catalog: a hand-curated list of films and TV episodes that are in
// the public domain in the United States, plus a few openly licensed
// (Creative Commons) films. Everything streams straight from the Internet
// Archive (archive.org), which hosts these works for free.
//
// Why a curated list instead of "everything archive.org marks as public
// domain"? Public-domain labels on archive.org are set by uploaders, and some
// are wrong. Each title here was picked because its US public-domain status is
// well documented, for example:
//   • published before 1931 (US copyright on those has expired), or
//   • a US work from 1931–1963 whose copyright was never renewed, or
//   • a US work from 1931–1977 published without a copyright notice.
// Foreign sound films from 1931 on were left out: many had their US copyright
// restored in 1996 (URAA). Open movies carry their licence and credit.
//
// Spotted a mistake? Open an issue and the title will be removed promptly.
//
// Fields
//   id       archive.org identifier (movies, and series stored as one item)
//   type     'movie' | 'tv'
//   genres   used for rows, categories and kids filtering
//   kids     true if suitable for Kids profiles
//   license  'pd' (public domain) | 'cc0' | 'cc-by'
//   credit   attribution required by the licence (CC BY)
//   start    seconds into the film for muted previews
//   item     (series) one archive item holding every episode as a file
//   skip     (series) regex of episode files to leave out
//   episodes (series) [{ id, title, year }] — one archive item per episode

export const PD_US = 'Public domain (United States)';

export const LICENSES = {
  pd: { label: 'Public Domain', short: 'PD', url: 'https://creativecommons.org/publicdomain/mark/1.0/' },
  cc0: { label: 'CC0 · Public Domain Dedication', short: 'CC0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  'cc-by': { label: 'Creative Commons Attribution', short: 'CC BY', url: 'https://creativecommons.org/licenses/by/3.0/' },
};

const BLENDER = '© Blender Foundation · blender.org · licensed CC BY';

/** @type {Array<Record<string, any>>} */
export const LIBRARY = [
  // ───────────── Screwball, romance & drama ─────────────
  { id: 'his_girl_friday', type: 'movie', title: 'His Girl Friday', year: 1940, runtime: '92 min', genres: ['Comedy', 'Romance'], start: 600,
    desc: 'A fast-talking newspaper editor will stop at nothing — including sabotaging her engagement — to win back his star reporter and ex-wife for one last big story.' },
  { id: 'charade-1963-cary-grant-audrey-hepburn-comedy-mystery-romance-thriller-full-movie', type: 'movie', title: 'Charade', year: 1963, runtime: '113 min', genres: ['Mystery', 'Romance', 'Thriller'], start: 900,
    desc: 'Cary Grant and Audrey Hepburn trade quips across Paris as a young widow is hunted by her late husband\u2019s accomplices for a fortune nobody can find.' },
  { id: 'meet_john_doe', type: 'movie', title: 'Meet John Doe', year: 1941, runtime: '122 min', genres: ['Drama', 'Comedy'], start: 700,
    desc: 'Frank Capra\u2019s fable: a reporter invents a man who will jump off city hall in protest, then hires a drifter to play him — and a movement is born.' },
  { id: 'NothingSacred', type: 'movie', title: 'Nothing Sacred', year: 1937, runtime: '77 min', genres: ['Comedy', 'Romance'], start: 500,
    desc: 'A small-town woman wrongly diagnosed with a fatal illness becomes a New York media sensation — and decides not to mention she\u2019s fine.' },
  { id: 'AStarIsBorn', type: 'movie', title: 'A Star Is Born', year: 1937, runtime: '111 min', genres: ['Drama', 'Romance'], start: 800,
    desc: 'A farm girl with Hollywood dreams rises to stardom while the fading matinee idol who discovered her slides into ruin. The original Technicolor version.' },
  { id: 'royal_wedding', type: 'movie', title: 'Royal Wedding', year: 1951, runtime: '93 min', genres: ['Musical', 'Romance', 'Comedy'], kids: true, start: 1200,
    desc: 'Fred Astaire and Jane Powell play a brother-and-sister dance act who find romance in London — featuring Astaire\u2019s famous dance on the ceiling.' },
  { id: 'humanbondage', type: 'movie', title: 'Of Human Bondage', year: 1934, runtime: '83 min', genres: ['Drama', 'Romance'], start: 600,
    desc: 'Bette Davis\u2019s breakout role as a cruel waitress who becomes the obsession of a sensitive medical student.' },
  { id: 'LifeWithFather', type: 'movie', title: 'Life with Father', year: 1947, runtime: '118 min', genres: ['Comedy', 'Family'], kids: true, start: 600,
    desc: 'William Powell rules a bustling 1880s Manhattan household — until his wife discovers he was never baptized.' },
  { id: 'TheFrontPage1931AdolpheMenjouPatOBrienLewismiles', type: 'movie', title: 'The Front Page', year: 1931, runtime: '101 min', genres: ['Comedy', 'Crime'], start: 600,
    desc: 'The original newsroom comedy: an ace reporter trying to quit and get married is dragged into the biggest story of the year by his scheming editor.' },
  { id: 'themanwiththegoldenarm1955_202001', type: 'movie', title: 'The Man with the Golden Arm', year: 1955, runtime: '119 min', genres: ['Drama', 'Crime'], start: 700,
    desc: 'Frank Sinatra is a card dealer and would-be jazz drummer fresh out of prison, fighting to stay clean in a Chicago neighborhood that won\u2019t let him go.' },

  // ───────────── Film noir & crime ─────────────
  { id: 'Detour', type: 'movie', title: 'Detour', year: 1945, runtime: '68 min', genres: ['Film-Noir', 'Crime'], start: 400,
    desc: 'A nightclub pianist hitchhiking to Los Angeles makes one fatal mistake on the road — and fate keeps punishing him for it.' },
  { id: 'ScarletStreet', type: 'movie', title: 'Scarlet Street', year: 1945, runtime: '102 min', genres: ['Film-Noir', 'Crime', 'Drama'], start: 600,
    desc: 'Fritz Lang\u2019s dark tale of a meek cashier and amateur painter who is conned by a femme fatale and her boyfriend.' },
  { id: 'TheStranger_0', type: 'movie', title: 'The Stranger', year: 1946, runtime: '95 min', genres: ['Film-Noir', 'Thriller'], start: 600,
    desc: 'Orson Welles directs and stars as a Nazi war criminal hiding as a teacher in a quiet Connecticut town — and Edward G. Robinson is closing in.' },
  { id: 'kansascityconfidencial', type: 'movie', title: 'Kansas City Confidential', year: 1952, runtime: '99 min', genres: ['Film-Noir', 'Crime'], start: 600,
    desc: 'Framed for an armored-car heist, an ex-con follows the trail of the masked robbers to a Mexican resort to clear his name.' },
  { id: 'doa_ipod', type: 'movie', title: 'D.O.A.', year: 1949, runtime: '83 min', genres: ['Film-Noir', 'Thriller'], start: 300,
    desc: 'A man walks into a police station to report a murder — his own. Poisoned and with days to live, he races to find out who killed him.' },
  { id: 'TheMostDangerousGame', type: 'movie', title: 'The Most Dangerous Game', year: 1932, runtime: '63 min', genres: ['Thriller', 'Adventure'], start: 600,
    desc: 'Shipwrecked on a remote island, a big-game hunter discovers his host hunts the most dangerous prey of all: people.' },
  { id: 'dressed_to_kill', type: 'movie', title: 'Sherlock Holmes: Dressed to Kill', year: 1946, runtime: '72 min', genres: ['Mystery', 'Crime'], start: 300,
    desc: 'Basil Rathbone and Nigel Bruce follow a trail of music boxes hiding the secret to stolen Bank of England plates.' },
  { id: 'TerrorByNight1946', type: 'movie', title: 'Sherlock Holmes: Terror by Night', year: 1946, runtime: '60 min', genres: ['Mystery', 'Crime'], start: 300,
    desc: 'Holmes and Watson guard a priceless diamond aboard an overnight train to Edinburgh — but a murderer is on board.' },
  { id: 'secret_weapon', type: 'movie', title: 'Sherlock Holmes and the Secret Weapon', year: 1942, runtime: '68 min', genres: ['Mystery', 'Thriller'], start: 300,
    desc: 'Holmes must protect a Swiss inventor and his revolutionary bombsight from Nazi spies and his old enemy, Professor Moriarty.' },

  // ───────────── Horror ─────────────
  { id: 'Night.Of.The.Living.Dead_1080p', type: 'movie', title: 'Night of the Living Dead', year: 1968, runtime: '96 min', genres: ['Horror'], start: 600,
    desc: 'George A. Romero\u2019s landmark: strangers barricade themselves in a farmhouse as the dead rise and surround them.' },
  { id: 'CarnivalofSouls', type: 'movie', title: 'Carnival of Souls', year: 1962, runtime: '78 min', genres: ['Horror', 'Mystery'], start: 400,
    desc: 'After surviving a car crash, a church organist is drawn to an abandoned lakeside pavilion and haunted by a pale, ghoulish man.' },
  { id: 'house_on_haunted_hill_ipod', type: 'movie', title: 'House on Haunted Hill', year: 1959, runtime: '75 min', genres: ['Horror', 'Mystery'], start: 300,
    desc: 'Vincent Price offers five guests $10,000 each to survive one night in a haunted mansion. The doors lock at midnight.' },
  { id: 'white_zombie', type: 'movie', title: 'White Zombie', year: 1932, runtime: '67 min', genres: ['Horror'], start: 400,
    desc: 'Bela Lugosi is a sinister Haitian plantation owner who turns people into zombie slaves — the first feature-length zombie film.' },
  { id: 'The_Little_Shop_of_Horrors.mpeg', type: 'movie', title: 'The Little Shop of Horrors', year: 1960, runtime: '72 min', genres: ['Comedy', 'Horror'], start: 300,
    desc: 'Roger Corman\u2019s cult comedy about a clumsy florist\u2019s assistant whose new plant has a taste for human blood. With a young Jack Nicholson.' },
  { id: 'TheLastManOnEarth1964_201808', type: 'movie', title: 'The Last Man on Earth', year: 1964, runtime: '86 min', genres: ['Horror', 'Sci-Fi'], start: 600,
    desc: 'Vincent Price is the lone survivor of a plague that turned humanity into vampires, hunting them by day and hiding by night.' },
  { id: 'dementia-13-1963_202312', type: 'movie', title: 'Dementia 13', year: 1963, runtime: '75 min', genres: ['Horror', 'Thriller'], start: 400,
    desc: 'Francis Ford Coppola\u2019s first feature: an axe murderer stalks a family gathered at their Irish castle.' },
  { id: 'brain_that_wouldnt_die', type: 'movie', title: 'The Brain That Wouldn\u2019t Die', year: 1962, runtime: '82 min', genres: ['Horror', 'Sci-Fi'], start: 500,
    desc: 'A reckless surgeon keeps his fianc\u00e9e\u2019s severed head alive while he searches for a new body — and something in the closet is listening.' },

  // ───────────── Sci-fi B-movies ─────────────
  { id: 'plan-9-from-outer-space', type: 'movie', title: 'Plan 9 from Outer Space', year: 1957, runtime: '79 min', genres: ['Sci-Fi', 'Horror', 'Comedy'], start: 300,
    desc: 'Ed Wood\u2019s legendary so-bad-it\u2019s-good epic: aliens resurrect the dead to stop humanity from building a doomsday weapon.' },
  { id: 'Killers_from_space', type: 'movie', title: 'Killers from Space', year: 1954, runtime: '71 min', genres: ['Sci-Fi'], start: 300,
    desc: 'A nuclear scientist survives a plane crash and returns with a scar, a missing memory and a terrifying story about bug-eyed invaders.' },
  { id: 'teenagers_from_outerspace', type: 'movie', title: 'Teenagers from Outer Space', year: 1959, runtime: '86 min', genres: ['Sci-Fi'], start: 300,
    desc: 'Alien youths land in a small town to raise giant lobster-monsters as cattle — but one of them falls for an Earth girl.' },
  { id: 'Phantom_Planet', type: 'movie', title: 'The Phantom Planet', year: 1961, runtime: '82 min', genres: ['Sci-Fi', 'Adventure'], start: 300,
    desc: 'An astronaut crash-lands on a tiny wandering asteroid whose people shrink him to their size.' },
  { id: 'SantaClausConquerstheMartians1964', type: 'movie', title: 'Santa Claus Conquers the Martians', year: 1964, runtime: '81 min', genres: ['Sci-Fi', 'Family', 'Comedy', 'Holiday'], kids: true, start: 300,
    desc: 'Martian kids are glued to Earth TV, so their leaders kidnap Santa Claus to bring Christmas to Mars. Gloriously silly holiday cult classic.' },

  // ───────────── Westerns ─────────────
  { id: 'mclintok_widescreen', type: 'movie', title: 'McLintock!', year: 1963, runtime: '127 min', genres: ['Western', 'Comedy'], start: 900,
    desc: 'John Wayne and Maureen O\u2019Hara brawl, bicker and splash through a mud slide in this rowdy Western take on The Taming of the Shrew.' },
  { id: 'angel_and_the_badman', type: 'movie', title: 'Angel and the Badman', year: 1947, runtime: '100 min', genres: ['Western', 'Romance'], start: 600,
    desc: 'A wounded gunslinger (John Wayne) is nursed back to health by a Quaker family and starts to question his violent ways.' },
  { id: 'the-big-trail_1930', type: 'movie', title: 'The Big Trail', year: 1930, runtime: '108 min', genres: ['Western', 'Adventure'], start: 900,
    desc: 'John Wayne\u2019s first starring role: a young scout leads a wagon train across the Oregon Trail while hunting his friend\u2019s killers.' },
  { id: 'SagebrushTrail', type: 'movie', title: 'Sagebrush Trail', year: 1933, runtime: '54 min', genres: ['Western'], kids: true, start: 300,
    desc: 'Wrongly convicted of murder, John Wayne escapes and joins an outlaw gang to find the real killer.' },
  { id: 'TheLuckyTexan', type: 'movie', title: 'The Lucky Texan', year: 1934, runtime: '55 min', genres: ['Western'], kids: true, start: 300,
    desc: 'John Wayne and Gabby Hayes strike gold — and outlaws try to steal their claim.' },
  { id: 'RidersofDestiny_', type: 'movie', title: 'Riders of Destiny', year: 1933, runtime: '53 min', genres: ['Western'], kids: true, start: 300,
    desc: 'Singin\u2019 Sandy Saunders (John Wayne) is an undercover agent sent to stop a crook from controlling a valley\u2019s water.' },
  { id: 'The_Star_Packer', type: 'movie', title: 'The Star Packer', year: 1934, runtime: '53 min', genres: ['Western'], kids: true, start: 300,
    desc: 'A new marshal (John Wayne) cleans up a town terrorized by a mysterious masked outlaw called The Shadow.' },
  { id: 'TheManFromUtah', type: 'movie', title: 'The Man from Utah', year: 1934, runtime: '55 min', genres: ['Western'], kids: true, start: 300,
    desc: 'John Wayne goes undercover on the rodeo circuit to bust a crooked promoter whose riders keep dying.' },

  // ───────────── Animation & family ─────────────
  { id: 'gullivers_travels1939', type: 'movie', title: 'Gulliver\u2019s Travels', year: 1939, runtime: '76 min', genres: ['Animation', 'Family', 'Adventure'], kids: true, start: 300,
    desc: 'The Fleischer Studios\u2019 Technicolor feature: a shipwrecked sailor washes up in Lilliput on the eve of a royal wedding — and a war.' },
  { id: 'JungleBook', type: 'movie', title: 'Jungle Book', year: 1942, runtime: '108 min', genres: ['Adventure', 'Family'], kids: true, start: 600,
    desc: 'Sabu is Mowgli, the boy raised by wolves, in this lush Technicolor adaptation of Kipling\u2019s stories.' },
  { id: 'Sita_Sings_the_Blues', type: 'movie', title: 'Sita Sings the Blues', year: 2008, runtime: '82 min', genres: ['Animation', 'Musical', 'Comedy'], license: 'cc0', start: 300,
    desc: 'Nina Paley\u2019s animated retelling of the Ramayana, set to 1920s jazz recordings by Annette Hanshaw and intertwined with a modern breakup.' },

  // ───────────── Open movies (Creative Commons) ─────────────
  { id: 'BigBuckBunny_124', type: 'movie', title: 'Big Buck Bunny', year: 2008, runtime: '10 min', genres: ['Animation', 'Comedy', 'Family', 'Short'], kids: true, license: 'cc-by', credit: BLENDER, start: 60,
    desc: 'A giant, gentle rabbit takes sweet revenge on three bullying rodents. The Blender Foundation\u2019s beloved open movie.' },
  { id: 'Sintel', type: 'movie', title: 'Sintel', year: 2010, runtime: '15 min', genres: ['Animation', 'Fantasy', 'Adventure', 'Short'], license: 'cc-by', credit: BLENDER, start: 60,
    desc: 'A lonely girl searches a harsh world for the baby dragon she raised. An epic in fifteen minutes.' },
  { id: 'Tears-of-Steel', type: 'movie', title: 'Tears of Steel', year: 2012, runtime: '12 min', genres: ['Sci-Fi', 'Action', 'Short'], license: 'cc-by', credit: BLENDER, start: 60,
    desc: 'In a future Amsterdam, a group of scientists tries to save the world from robots by reliving a painful breakup.' },
  { id: 'ElephantsDream', type: 'movie', title: 'Elephants Dream', year: 2006, runtime: '11 min', genres: ['Animation', 'Sci-Fi', 'Short'], license: 'cc-by', credit: '© Blender Foundation / Netherlands Media Art Institute · licensed CC BY', start: 60,
    desc: 'Two men explore a vast, surreal machine with a mind of its own. The world\u2019s first open movie.' },
  { id: 'CosmosLaundromatFirstCycle', type: 'movie', title: 'Cosmos Laundromat', year: 2015, runtime: '12 min', genres: ['Animation', 'Comedy', 'Fantasy', 'Short'], license: 'cc-by', credit: BLENDER, start: 60,
    desc: 'On a desolate island, a suicidal sheep named Franck meets a quirky salesman who offers him the gift of a lifetime.' },
  { id: 'Caminandes1LlamaDrama', type: 'movie', title: 'Caminandes: Llama Drama', year: 2013, runtime: '2 min', genres: ['Animation', 'Comedy', 'Family', 'Short'], kids: true, license: 'cc-by', credit: '© Pablo V\u00e1zquez / Blender Foundation · licensed CC BY', start: 0,
    desc: 'Koro the llama really, really wants to get to the other side of a road in Patagonia.' },

  // ───────────── The silent era (all pre-1931) ─────────────
  { id: 'The_General_Buster_Keaton', type: 'movie', title: 'The General', year: 1926, runtime: '78 min', genres: ['Comedy', 'Action', 'Silent'], kids: true, start: 900,
    desc: 'Buster Keaton\u2019s masterpiece: a Southern engineer chases Union spies who stole his beloved locomotive — and his girl.' },
  { id: 'MyMovie_20190318', type: 'movie', title: 'Sherlock Jr.', year: 1924, runtime: '45 min', genres: ['Comedy', 'Silent'], kids: true, start: 600,
    desc: 'A projectionist who dreams of being a detective falls asleep and walks right into the movie on screen.' },
  { id: 'MyMovie_201801', type: 'movie', title: 'Our Hospitality', year: 1923, runtime: '74 min', genres: ['Comedy', 'Silent'], kids: true, start: 900,
    desc: 'Buster Keaton falls for a girl whose family has sworn to kill him — but they can\u2019t while he\u2019s a guest in their house.' },
  { id: 'mymovie_202004', type: 'movie', title: 'The Navigator', year: 1924, runtime: '59 min', genres: ['Comedy', 'Silent'], kids: true, start: 600,
    desc: 'A spoiled millionaire and his would-be fianc\u00e9e are set adrift alone on an empty ocean liner.' },
  { id: 'SteamboatBillJr', type: 'movie', title: 'Steamboat Bill, Jr.', year: 1928, runtime: '70 min', genres: ['Comedy', 'Silent'], kids: true, start: 1200,
    desc: 'A college boy disappoints his riverboat-captain father — until a cyclone hits. Includes Keaton\u2019s famous falling-house stunt.' },
  { id: 'college', type: 'movie', title: 'College', year: 1927, runtime: '66 min', genres: ['Comedy', 'Silent'], kids: true, start: 600,
    desc: 'A bookish student tries every sport on campus to win the girl who only likes athletes.' },
  { id: 'Silent_ThreeAges_1923', type: 'movie', title: 'Three Ages', year: 1923, runtime: '63 min', genres: ['Comedy', 'Silent'], kids: true, start: 600,
    desc: 'Buster Keaton\u2019s first feature spoofs the same love story told in the Stone Age, ancient Rome and the Jazz Age.' },
  { id: 'silent-safety-last', type: 'movie', title: 'Safety Last!', year: 1923, runtime: '73 min', genres: ['Comedy', 'Silent'], kids: true, start: 2700,
    desc: 'Harold Lloyd climbs a department-store skyscraper and ends up dangling from the hands of a giant clock.' },
  { id: 'ThePhantomoftheOpera', type: 'movie', title: 'The Phantom of the Opera', year: 1925, runtime: '93 min', genres: ['Horror', 'Romance', 'Silent'], start: 1500,
    desc: 'Lon Chaney is the masked, disfigured genius haunting the Paris Opera House and the young soprano he loves.' },
  { id: 'Nosferatu_most_complete_version_93_mins.', type: 'movie', title: 'Nosferatu', year: 1922, runtime: '93 min', genres: ['Horror', 'Silent'], start: 1200,
    desc: 'F. W. Murnau\u2019s shadowy symphony of horror: the vampire Count Orlok brings plague and death to a German port town.' },
  { id: 'DasKabinettdesDoktorCaligariTheCabinetofDrCaligari', type: 'movie', title: 'The Cabinet of Dr. Caligari', year: 1920, runtime: '71 min', genres: ['Horror', 'Mystery', 'Silent'], start: 600,
    desc: 'A sinister showman and his sleepwalking servant terrorize a town in this jagged, painted nightmare of German Expressionism.' },
  { id: 'TheGolem_893', type: 'movie', title: 'The Golem', year: 1920, runtime: '76 min', genres: ['Horror', 'Fantasy', 'Silent'], start: 600,
    desc: 'In 16th-century Prague a rabbi brings a giant clay figure to life to protect his people — until it turns against its creators.' },
  { id: 'DrJekyllandMrHyde', type: 'movie', title: 'Dr. Jekyll and Mr. Hyde', year: 1920, runtime: '79 min', genres: ['Horror', 'Silent'], start: 900,
    desc: 'John Barrymore transforms — with almost no makeup — into Robert Louis Stevenson\u2019s monstrous Mr. Hyde.' },
  { id: 'The_Hunchback_of_Notre_Dame', type: 'movie', title: 'The Hunchback of Notre Dame', year: 1923, runtime: '107 min', genres: ['Drama', 'Romance', 'Silent'], start: 1200,
    desc: 'Lon Chaney\u2019s Quasimodo, the bell-ringer of Notre Dame, risks everything for the gypsy girl Esmeralda.' },
  { id: 'lost_world', type: 'movie', title: 'The Lost World', year: 1925, runtime: '93 min', genres: ['Adventure', 'Sci-Fi', 'Silent'], kids: true, start: 1800,
    desc: 'Professor Challenger leads an expedition to a South American plateau where dinosaurs still live — and brings one back to London.' },
  { id: '20000LeaguesUndertheSea', type: 'movie', title: '20,000 Leagues Under the Sea', year: 1916, runtime: '85 min', genres: ['Adventure', 'Sci-Fi', 'Silent'], kids: true, start: 900,
    desc: 'Captain Nemo and the Nautilus, filmed with pioneering real underwater photography.' },
  { id: 'markofzorro-1920', type: 'movie', title: 'The Mark of Zorro', year: 1920, runtime: '90 min', genres: ['Adventure', 'Action', 'Silent'], kids: true, start: 900,
    desc: 'Douglas Fairbanks is the foppish Don Diego by day and the masked swordsman Zorro by night.' },
  { id: 'FairbanksRobinHood1922', type: 'movie', title: 'Robin Hood', year: 1922, runtime: '143 min', genres: ['Adventure', 'Action', 'Silent'], kids: true, start: 1800,
    desc: 'Douglas Fairbanks swings through enormous castle sets as the outlaw of Sherwood Forest.' },
  { id: 'ThiefOfBagdad1924', type: 'movie', title: 'The Thief of Bagdad', year: 1924, runtime: '140 min', genres: ['Adventure', 'Fantasy', 'Silent'], kids: true, start: 1800,
    desc: 'A thief falls for a princess and must win her with flying carpets, magic ropes and a winged horse.' },
  { id: 'TheBlackPirate1926DouglasFairbanksSRAndy', type: 'movie', title: 'The Black Pirate', year: 1926, runtime: '94 min', genres: ['Adventure', 'Action', 'Silent'], kids: true, start: 900,
    desc: 'Douglas Fairbanks joins a pirate crew to avenge his father, in early two-strip Technicolor.' },
  { id: 'The_Three_Musketeers', type: 'movie', title: 'The Three Musketeers', year: 1921, runtime: '120 min', genres: ['Adventure', 'Action', 'Silent'], kids: true, start: 1200,
    desc: 'Douglas Fairbanks is d\u2019Artagnan, the hot-headed young swordsman who joins Athos, Porthos and Aramis.' },
  { id: 'iron_mask', type: 'movie', title: 'The Iron Mask', year: 1929, runtime: '95 min', genres: ['Adventure', 'Silent'], kids: true, start: 900,
    desc: 'Fairbanks returns as d\u2019Artagnan to rescue the young king of France from a twin brother\u2019s plot.' },
  { id: 'BattleshipPotemkin', type: 'movie', title: 'Battleship Potemkin', year: 1925, runtime: '75 min', genres: ['Drama', 'History', 'Silent'], start: 2400,
    desc: 'Sergei Eisenstein\u2019s revolutionary epic of a 1905 naval mutiny, with the legendary Odessa Steps sequence.' },
  { id: 'ChelovekskinoapparatomManWithAMovieCamera', type: 'movie', title: 'Man with a Movie Camera', year: 1929, runtime: '68 min', genres: ['Documentary', 'Silent'], start: 600,
    desc: 'Dziga Vertov\u2019s dazzling city symphony — a day in Soviet life told entirely through bold camera tricks and editing.' },
  { id: 'Intolerance', type: 'movie', title: 'Intolerance', year: 1916, runtime: '163 min', genres: ['Drama', 'History', 'Silent'], start: 2400,
    desc: 'D. W. Griffith\u2019s colossal epic weaves four stories of injustice across 2,500 years, from Babylon to modern America.' },
  { id: 'The_Four_Horsemen_of_the_Apocalypse', type: 'movie', title: 'The Four Horsemen of the Apocalypse', year: 1921, runtime: '134 min', genres: ['Drama', 'War', 'Romance', 'Silent'], start: 1200,
    desc: 'The film that made Rudolph Valentino a star: an Argentine family torn apart when World War I divides it.' },
  { id: 'sunrise_1927', type: 'movie', title: 'Sunrise: A Song of Two Humans', year: 1927, runtime: '94 min', genres: ['Drama', 'Romance', 'Silent'], start: 1200,
    desc: 'F. W. Murnau\u2019s luminous fable of a farmer tempted to murder his wife — and the day in the city that rekindles their love.' },
  { id: 'the-lodger-a-story-of-the-london-fog-1927', type: 'movie', title: 'The Lodger', year: 1927, runtime: '90 min', genres: ['Thriller', 'Mystery', 'Silent'], start: 900,
    desc: 'Alfred Hitchcock\u2019s first true thriller: a London family suspects their mysterious new lodger is a serial killer.' },
  { id: 'blackmail_1929', type: 'movie', title: 'Blackmail', year: 1929, runtime: '85 min', genres: ['Thriller', 'Crime'], start: 900,
    desc: 'Hitchcock\u2019s first sound film: a woman kills an attacker in self-defense, and a blackmailer saw everything.' },
  { id: 'pandoras-box-1929-by-georg-wilhelm-pabst', type: 'movie', title: 'Pandora\u2019s Box', year: 1929, runtime: '133 min', genres: ['Drama', 'Silent'], start: 1200,
    desc: 'Louise Brooks is Lulu, a carefree showgirl who brings ruin to everyone who loves her.' },
  { id: 'the-jazz-singer_1927', type: 'movie', title: 'The Jazz Singer', year: 1927, runtime: '89 min', genres: ['Drama', 'Musical'], start: 900,
    desc: 'The first feature with synchronized dialogue: a cantor\u2019s son defies his father to sing jazz. (Contains a blackface performance typical of its era.)' },
  { id: 'All.Quiet.on.the.Western.Front.1930_201605', type: 'movie', title: 'All Quiet on the Western Front', year: 1930, runtime: '133 min', genres: ['War', 'Drama'], start: 1500,
    desc: 'Best Picture winner: German schoolboys rush to enlist in World War I and discover the horror of the trenches.' },
  { id: 'animal-crackers_1930', type: 'movie', title: 'Animal Crackers', year: 1930, runtime: '97 min', genres: ['Comedy', 'Musical'], kids: true, start: 600,
    desc: 'The Marx Brothers crash a society party where a priceless painting goes missing. Hooray for Captain Spaulding!' },
  { id: 'abraham_lincoln', type: 'movie', title: 'Abraham Lincoln', year: 1930, runtime: '96 min', genres: ['Drama', 'History', 'Biography'], start: 900,
    desc: 'D. W. Griffith\u2019s sound-era biography of Lincoln, from his log-cabin birth to Ford\u2019s Theatre, starring Walter Huston.' },
  { id: 'ATripToTheMoonGeorgeMelies', type: 'movie', title: 'A Trip to the Moon', year: 1902, runtime: '13 min', genres: ['Sci-Fi', 'Fantasy', 'Silent', 'Short'], kids: true, start: 0,
    desc: 'Georges M\u00e9li\u00e8s fires astronomers into the eye of the Man in the Moon in cinema\u2019s first great sci-fi fantasy.' },
  { id: 'TheGreatTrainRobbery_555', type: 'movie', title: 'The Great Train Robbery', year: 1903, runtime: '12 min', genres: ['Western', 'Action', 'Silent', 'Short'], start: 0,
    desc: 'The first Western: bandits hold up a train, and a posse rides after them. Ends with the famous gunshot at the audience.' },
  { id: 'The_Wonderful_Wizard_of_Oz', type: 'movie', title: 'The Wonderful Wizard of Oz', year: 1910, runtime: '13 min', genres: ['Fantasy', 'Family', 'Silent', 'Short'], kids: true, start: 0,
    desc: 'The earliest surviving film of L. Frank Baum\u2019s story — Dorothy, the Scarecrow and a very theatrical cyclone.' },
  { id: 'AliceInWonderland1915_503', type: 'movie', title: 'Alice in Wonderland', year: 1915, runtime: '52 min', genres: ['Fantasy', 'Family', 'Silent'], kids: true, start: 300,
    desc: 'Alice follows the White Rabbit into a world of costumed creatures in this charming early adaptation.' },
  { id: 'FrankensteinfullMovie', type: 'movie', title: 'Frankenstein', year: 1910, runtime: '13 min', genres: ['Horror', 'Silent', 'Short'], start: 0,
    desc: 'Edison Studios\u2019 one-reel Frankenstein — the very first film version of Mary Shelley\u2019s novel.' },

  // ───────────── Series (TV & shorts) ─────────────
  { id: 'fleischer-superman', type: 'tv', title: 'Superman (Fleischer Cartoons)', year: 1941, yearRange: '1941\u20131943', genres: ['Animation', 'Action', 'Sci-Fi', 'Family'], kids: true,
    item: 'superman-the-complete-collection-fleischerfamous-studios', skip: /Japoteurs/i, poster: 'superman_1941',
    desc: 'The groundbreaking Technicolor cartoons from Fleischer and Famous Studios: the Man of Steel battles mad scientists, robots and monsters.' },
  { id: 'chaplin-mutuals', type: 'tv', title: 'Charlie Chaplin: The Mutual Comedies', year: 1916, yearRange: '1916\u20131917', genres: ['Comedy', 'Silent', 'Short'], kids: true,
    episodes: [
      { id: 'CC_1916_05_15_TheFloorwalker', title: 'The Floorwalker', year: 1916 },
      { id: 'CC_1916_06_12_TheFireman', title: 'The Fireman', year: 1916 },
      { id: 'CC_1916_08_07_One_A_M', title: 'One A.M.', year: 1916 },
      { id: 'CC_1916_09_04_TheCount', title: 'The Count', year: 1916 },
      { id: 'CC_1916_10_02_ThePawnshop', title: 'The Pawnshop', year: 1916 },
      { id: 'CC_1916_11_13_BehindtheScreen', title: 'Behind the Screen', year: 1916 },
      { id: 'CC_1916_12_04_TheRink', title: 'The Rink', year: 1916 },
      { id: 'CC_1917_06_17_TheImmigrant', title: 'The Immigrant', year: 1917 },
      { id: 'CC_1917_10_22_TheAdventurer', title: 'The Adventurer', year: 1917 },
    ],
    desc: 'The Little Tramp at his peak: twelve months of two-reel comedies Chaplin later called the happiest period of his career.' },
  { id: 'keaton-shorts', type: 'tv', title: 'Buster Keaton Shorts', year: 1920, yearRange: '1920\u20131922', genres: ['Comedy', 'Silent', 'Short'], kids: true,
    episodes: [
      { id: 'OneWeek', title: 'One Week', year: 1920 },
      { id: 'BusterKeatonthescarecrow', title: 'The Scarecrow', year: 1920 },
      { id: 'Neighbors', title: 'Neighbors', year: 1920 },
      { id: 'TheGoat', title: 'The Goat', year: 1921 },
      { id: 'ThePlayhouse', title: 'The Playhouse', year: 1921 },
      { id: 'Cops1922', title: 'Cops', year: 1922 },
      { id: 'TheElectricHouse', title: 'The Electric House', year: 1922 },
    ],
    desc: 'Deadpan perfection: Buster builds a flatpack house, outruns the entire LAPD and plays every role in a theater.' },
  { id: 'mickey-1928', type: 'tv', title: 'Mickey Mouse: The First Cartoons', year: 1928, yearRange: '1928', genres: ['Animation', 'Comedy', 'Family', 'Short'], kids: true,
    episodes: [
      { id: 'PlaneCrazy_201511', title: 'Plane Crazy', year: 1928 },
      { id: 'TheGallopinGaucho', title: 'The Gallopin\u2019 Gaucho', year: 1928 },
      { id: 'steamboat-willie_1928', title: 'Steamboat Willie', year: 1928 },
    ],
    desc: 'The 1928 cartoons that introduced Mickey and Minnie — including Steamboat Willie, the first cartoon with synchronized sound.' },
  { id: 'SherlockHolmes1954', type: 'tv', title: 'Sherlock Holmes', year: 1954, yearRange: '1954\u20131955', genres: ['Mystery', 'Crime'], item: 'SherlockHolmes1954',
    desc: 'Ronald Howard and Howard Marion-Crawford are Holmes and Watson in this breezy half-hour series filmed in France.' },
  { id: 'one-step-beyond-season-1-1959', type: 'tv', title: 'One Step Beyond', year: 1959, yearRange: '1959', genres: ['Mystery', 'Drama', 'Sci-Fi'], item: 'one-step-beyond-season-1-1959', skip: /intro|promo/i,
    desc: 'Host John Newland presents dramatized stories of the paranormal — premonitions, ghosts and the unexplained — said to be true.' },
  { id: 'beverly-hillbillies', type: 'tv', title: 'The Beverly Hillbillies', year: 1962, yearRange: '1962\u20131963', genres: ['Comedy', 'Family'], kids: true,
    episodes: [
      { id: 'thebeverlyhillbilliestheclampettsstrikeoilhq', title: 'The Clampetts Strike Oil', episode: 1 },
      { id: 'thebeverlyhillbilliesgettingsettledhq', title: 'Getting Settled', episode: 2 },
      { id: 'thebeverlyhillbilliesmeanwhilebackatthecabinhq', title: 'Meanwhile, Back at the Cabin', episode: 3 },
      { id: 'thebeverlyhillbilliestheclampettsmeetmrsdrysdalehq', title: 'The Clampetts Meet Mrs. Drysdale', episode: 4 },
      { id: 'Beverly_Hillbillies_Ep06_Trick_Or_Treat', title: 'Trick or Treat', episode: 6 },
      { id: 'Beverly_Hillbillies_Ep07_The_Servants', title: 'The Servants', episode: 7 },
      { id: 'Beverly_Hillbillies_Ep13_Home_For_Christmas', title: 'Home for Christmas', episode: 13 },
    ],
    desc: 'Mountaineer Jed Clampett strikes oil and moves his family to Beverly Hills. First-season episodes whose copyrights were never renewed.' },
];

/**
 * Films entering the US public domain on January 1, 2027 (released in 1931).
 * Shown in "Coming Soon" with a reminder — they can't be streamed until then.
 */
export const PD_DAY = '2027-01-01T00:00:00';
export const COMING_PD = [
  { id: 'pd27-frankenstein', title: 'Frankenstein', year: 1931, genres: ['Horror'], desc: 'Boris Karloff becomes the Monster in James Whale\u2019s Universal classic.' },
  { id: 'pd27-dracula', title: 'Dracula', year: 1931, genres: ['Horror'], desc: 'Bela Lugosi\u2019s iconic Count travels from Transylvania to London.' },
  { id: 'pd27-city-lights', title: 'City Lights', year: 1931, genres: ['Comedy', 'Romance'], kids: true, desc: 'Chaplin\u2019s Tramp falls for a blind flower girl and schemes to restore her sight.' },
  { id: 'pd27-m', title: 'M', year: 1931, genres: ['Thriller', 'Crime'], desc: 'Fritz Lang\u2019s chilling manhunt for a child murderer, starring Peter Lorre.' },
  { id: 'pd27-public-enemy', title: 'The Public Enemy', year: 1931, genres: ['Crime', 'Drama'], desc: 'James Cagney\u2019s star-making turn as a Prohibition-era gangster.' },
  { id: 'pd27-monkey-business', title: 'Monkey Business', year: 1931, genres: ['Comedy'], kids: true, desc: 'The Marx Brothers stow away on an ocean liner and run riot.' },
  { id: 'pd27-jekyll', title: 'Dr. Jekyll and Mr. Hyde', year: 1931, genres: ['Horror'], desc: 'Fredric March\u2019s Oscar-winning transformation.' },
  { id: 'pd27-tabu', title: 'Tabu', year: 1931, genres: ['Drama', 'Romance'], desc: 'F. W. Murnau\u2019s final film, a doomed love story shot in Bora Bora.' },
];
