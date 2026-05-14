/**
 * Per-explorer biographical metadata for /historical-archive/explorers/[slug].
 *
 * `prose` is verbatim opening text from the cited source. Two source
 * categories are used:
 *  - "britannica-11": Encyclopædia Britannica, 11th Edition (1910–1911),
 *    fully in the public domain, via Wikisource.
 *  - "wikipedia": English Wikipedia, licensed CC-BY-SA. Used for figures
 *    that post-date or are absent from the 11th Edition.
 *
 * To swap a Wikipedia bio for a different public-domain source later,
 * replace `prose`, `source`, `sourceUrl`, and `sourceTitle` for the entry.
 * Do NOT paraphrase the prose; keep the source's exact wording so the
 * citation remains accurate.
 */

export type BioSource = 'britannica-11' | 'wikipedia';

export interface ExplorerBio {
  /** Matches the slug produced by `explorerSlug()` in ../buckets.ts. */
  slug: string;
  /** Canonical name shown in H1 + breadcrumb. May be a duo. */
  displayName: string;
  /** Search-friendly short label for OG/meta titles (e.g. "Ernest Shackleton"). */
  shortName: string;
  /** "1869–1959" or "1769–1859". From the source where given; otherwise factual. */
  lifespan?: string;
  /** Nationality / role short-line: "Norwegian polar explorer". */
  knownFor?: string;
  /** Verbatim opening prose from the cited source. */
  prose: string;
  source: BioSource;
  sourceUrl: string;
  sourceTitle: string;
}

const SOURCE_LABEL: Record<BioSource, string> = {
  'britannica-11': 'Encyclopædia Britannica, 11th Edition (1911)',
  wikipedia: 'Wikipedia (CC-BY-SA)',
};

export function citationLabelFor(source: BioSource): string {
  return SOURCE_LABEL[source];
}

export const EXPLORER_BIOS: ExplorerBio[] = [
  {
    slug: 'alexander-von-humboldt',
    displayName: 'Alexander von Humboldt',
    shortName: 'Alexander von Humboldt',
    lifespan: '1769–1859',
    knownFor: 'German naturalist and traveller',
    prose:
      'HUMBOLDT, FRIEDRICH HEINRICH ALEXANDER, Baron von (1769–1859), German naturalist and traveller, was born at Berlin, on the 14th of September 1769.',
    source: 'britannica-11',
    sourceUrl:
      'https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Humboldt,_Friedrich_Heinrich_Alexander_von',
    sourceTitle: '“Humboldt, Friedrich Heinrich Alexander von, Baron”',
  },
  {
    slug: 'apsley-cherry-garrard',
    displayName: 'Apsley Cherry-Garrard',
    shortName: 'Apsley Cherry-Garrard',
    lifespan: '1886–1959',
    knownFor: 'English explorer of Antarctica',
    prose:
      'Apsley George Benet Cherry-Garrard (2 January 1886 – 18 May 1959) was an English explorer of Antarctica. He was a member of the Terra Nova expedition and is acclaimed for his 1922 account of this expedition, The Worst Journey in the World.',
    source: 'wikipedia',
    sourceUrl: 'https://en.wikipedia.org/wiki/Apsley_Cherry-Garrard',
    sourceTitle: '“Apsley Cherry-Garrard”',
  },
  {
    slug: 'charles-darwin',
    displayName: 'Charles Darwin',
    shortName: 'Charles Darwin',
    lifespan: '1809–1882',
    knownFor: 'English naturalist, author of the Origin of Species',
    prose:
      'DARWIN, CHARLES ROBERT (1809–1882), English naturalist, author of the Origin of Species, was born at Shrewsbury on the 12th of February 1809.',
    source: 'britannica-11',
    sourceUrl:
      'https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Darwin,_Charles_Robert',
    sourceTitle: '“Darwin, Charles Robert”',
  },
  {
    slug: 'david-livingstone',
    displayName: 'David Livingstone',
    shortName: 'David Livingstone',
    lifespan: '1813–1873',
    knownFor: 'Scottish missionary and explorer in Africa',
    prose:
      'LIVINGSTONE, DAVID (1813–1873), Scottish missionary and explorer in Africa, was born on the 19th of March 1813, at the village of Blantyre Works, in Lanarkshire, Scotland.',
    source: 'britannica-11',
    sourceUrl:
      'https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Livingstone,_David',
    sourceTitle: '“Livingstone, David”',
  },
  {
    slug: 'ernest-shackleton',
    displayName: 'Ernest Shackleton',
    shortName: 'Ernest Shackleton',
    lifespan: '1874–1922',
    knownFor: 'Anglo-Irish Antarctic explorer',
    prose:
      'Sir Ernest Henry Shackleton (15 February 1874 – 5 January 1922) was an Anglo-Irish Antarctic explorer who led three British expeditions to the Antarctic. He was one of the principal figures of the period known as the Heroic Age of Antarctic Exploration.',
    source: 'wikipedia',
    sourceUrl: 'https://en.wikipedia.org/wiki/Ernest_Shackleton',
    sourceTitle: '“Ernest Shackleton”',
  },
  {
    slug: 'fridtjof-nansen',
    displayName: 'Fridtjof Nansen',
    shortName: 'Fridtjof Nansen',
    lifespan: '1861–1930',
    knownFor: 'Norwegian scientist, explorer and statesman',
    prose:
      'NANSEN, FRIDTJOF (1861–), Norwegian scientist, explorer and statesman, was born at Fröen near Christiania on the 10th of October 1861. His childhood was spent at this place till his fifteenth year, when his parents removed to Christiania, where he went to school.',
    source: 'britannica-11',
    sourceUrl:
      'https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Nansen,_Fridtjof',
    sourceTitle: '“Nansen, Fridtjof”',
  },
  {
    slug: 'george-mallory-charles-howard-bury',
    displayName: 'George Mallory & Charles Howard-Bury',
    shortName: 'George Mallory',
    lifespan: '1886–1924',
    knownFor: 'English mountaineer, early Mount Everest expeditions',
    prose:
      'George Herbert Leigh-Mallory (18 June 1886 – 8 or 9 June 1924) was an English mountaineer who participated in the first three British Mount Everest expeditions from the early to mid-1920s. He and his climbing partner Andrew “Sandy” Irvine were reported to be last seen ascending near Everest’s summit during the 1924 expedition, sparking debate as to whether they reached it before they died.',
    source: 'wikipedia',
    sourceUrl: 'https://en.wikipedia.org/wiki/George_Mallory',
    sourceTitle: '“George Mallory”',
  },
  {
    slug: 'mary-kingsley',
    displayName: 'Mary Kingsley',
    shortName: 'Mary Kingsley',
    lifespan: '1862–1900',
    knownFor: 'English traveller, ethnologist and author',
    prose:
      'KINGSLEY, MARY HENRIETTA (1862–1900), English traveller, ethnologist and author, daughter of George Henry Kingsley (1827–1892), was born in Islington, London, on the 13th of October 1862.',
    source: 'britannica-11',
    sourceUrl:
      'https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Kingsley,_Mary_Henrietta',
    sourceTitle: '“Kingsley, Mary Henrietta”',
  },
  {
    slug: 'meriwether-lewis-william-clark',
    displayName: 'Meriwether Lewis & William Clark',
    shortName: 'Lewis and Clark',
    lifespan: '1804–1806 (Corps of Discovery)',
    knownFor: 'Leaders of the Corps of Discovery Expedition',
    prose:
      'The Lewis and Clark Expedition, also known as the Corps of Discovery Expedition, was the United States expedition to cross the newly acquired western portion of the country after the Louisiana Purchase. The Corps of Discovery was a select group of U.S. Army and civilian volunteers under the command of Captain Meriwether Lewis and his close friend Second Lieutenant William Clark.',
    source: 'wikipedia',
    sourceUrl: 'https://en.wikipedia.org/wiki/Lewis_and_Clark_Expedition',
    sourceTitle: '“Lewis and Clark Expedition”',
  },
  {
    slug: 'mungo-park',
    displayName: 'Mungo Park',
    shortName: 'Mungo Park',
    lifespan: '1771–1806',
    knownFor: 'Scottish explorer of the Niger',
    prose:
      'PARK, MUNGO (1771–1806?), Scottish explorer of the Niger, was born in Selkirkshire, Scotland, on the 20th of September 1771, at Foulshiels on the Yarrow—the farm which his father rented from the duke of Buccleuch.',
    source: 'britannica-11',
    sourceUrl:
      'https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Park,_Mungo',
    sourceTitle: '“Park, Mungo”',
  },
  {
    slug: 'nellie-bly',
    displayName: 'Nellie Bly',
    shortName: 'Nellie Bly',
    lifespan: '1864–1922',
    knownFor: 'American journalist, record-breaking world traveler',
    prose:
      'Elizabeth Cochrane Seaman (born Elizabeth Jane Cochran; May 5, 1864 – January 27, 1922), better known by her pen name Nellie Bly, was an American journalist who was widely known for her record-breaking trip around the world in 72 days in emulation of Jules Verne’s fictional character Phileas Fogg, and for an exposé in which she worked undercover to report on a mental institution from within. She ushered in the era of stunt girl reporting and helped advance a new kind of immersion journalism.',
    source: 'wikipedia',
    sourceUrl: 'https://en.wikipedia.org/wiki/Nellie_Bly',
    sourceTitle: '“Nellie Bly”',
  },
  {
    slug: 'roald-amundsen',
    displayName: 'Roald Amundsen',
    shortName: 'Roald Amundsen',
    lifespan: '1872–1928',
    knownFor: 'Norwegian explorer of polar regions',
    prose:
      'Roald Engelbregt Gravning Amundsen (16 July 1872 – c. 18 June 1928) was a Norwegian explorer of polar regions. He was a key figure of the period known as the Heroic Age of Antarctic Exploration.',
    source: 'wikipedia',
    sourceUrl: 'https://en.wikipedia.org/wiki/Roald_Amundsen',
    sourceTitle: '“Roald Amundsen”',
  },
  {
    slug: 'robert-falcon-scott',
    displayName: 'Robert Falcon Scott',
    shortName: 'Robert Falcon Scott',
    lifespan: '1868–1912',
    knownFor: 'British Royal Navy officer, Antarctic explorer',
    prose:
      'Captain Robert Falcon Scott (6 June 1868 – c. 29 March 1912) was a British Royal Navy officer and explorer who led two expeditions to Antarctica.',
    source: 'wikipedia',
    sourceUrl: 'https://en.wikipedia.org/wiki/Robert_Falcon_Scott',
    sourceTitle: '“Robert Falcon Scott”',
  },
  {
    slug: 'robert-peary',
    displayName: 'Robert Peary',
    shortName: 'Robert Peary',
    lifespan: '1856–1920',
    knownFor: 'American Arctic explorer',
    prose:
      'PEARY, ROBERT EDWIN (1856–), American Arctic explorer, was born at Cresson, Pennsylvania, on the 6th of May 1856. He graduated at Bowdoin College in 1877, and in 1881 became a civil engineer in the U.S. navy with the rank of lieutenant.',
    source: 'britannica-11',
    sourceUrl:
      'https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Peary,_Robert_Edwin',
    sourceTitle: '“Peary, Robert Edwin”',
  },
];

export function bioBySlug(slug: string): ExplorerBio | undefined {
  return EXPLORER_BIOS.find((b) => b.slug === slug);
}
