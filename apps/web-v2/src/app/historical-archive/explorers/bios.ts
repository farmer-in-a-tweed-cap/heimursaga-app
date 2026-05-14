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
      'HUMBOLDT, FRIEDRICH HEINRICH ALEXANDER, Baron von (1769–1859), German naturalist and traveller, was born at Berlin, on the 14th of September 1769. By his delineation (in 1817) of “isothermal lines,” he at once suggested the idea and devised the means of comparing the climatic conditions of various countries. His essay on the geography of plants was based on the then novel idea of studying the distribution of organic life as affected by varying physical conditions.',
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
      'DARWIN, CHARLES ROBERT (1809–1882), English naturalist, author of the Origin of Species, was born at Shrewsbury on the 12th of February 1809. The voyage of HMS Beagle, lasting until the 2nd of October 1836, crystallized his observations on the relation between animals in islands and those of the nearest continental areas, near akin and yet not the same. In October 1838 he read Malthus on Population, and his observations having long since convinced him of the struggle for existence, it at once struck him “that under these circumstances favourable variations would tend to be preserved, and unfavourable ones to be destroyed.”',
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
      'LIVINGSTONE, DAVID (1813–1873), Scottish missionary and explorer in Africa, was born on the 19th of March 1813, at the village of Blantyre Works, in Lanarkshire, Scotland. With the aid and in the company of two English sportsmen, William C. Oswell and Mungo Murray, he was able to undertake a journey to Lake Ngami, which had never yet been seen by a white man. A fortnight afterwards he discovered the famous “Victoria” falls of the Zambezi, and on the 18th of July 1868 discovered Lake Bangweulu in his search for the sources of the Nile.',
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
      'NANSEN, FRIDTJOF (1861–), Norwegian scientist, explorer and statesman, was born at Fröen near Christiania on the 10th of October 1861. On the 22nd of September the “Fram” was made fast to a floe in 78° 50′ N., 133° 37′ E.; shortly afterwards she was frozen in, and the long drift began. On the 8th of April they turned back from 86° 14′ N., the highest latitude then reached by man.',
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
    slug: 'james-cook',
    displayName: 'James Cook',
    shortName: 'James Cook',
    lifespan: '1728–1779',
    knownFor: 'English naval captain and explorer',
    prose:
      'COOK, JAMES (1728–1779), English naval captain and explorer, was born on the 28th of October 1728, at Marton village, Cleveland, Yorkshire, where his father was first an agricultural labourer and then a farm bailiff. At twelve years of age he was apprenticed to a haberdasher at Staithes, near Whitby, and afterwards to Messrs Walker, shipowners, of Whitby, whom he served for years in the Norway, Baltic and Newcastle trades. In 1768 Cook was appointed to conduct an expedition, suggested by the revival of geographical interest now noticeable, and resolved on by the English admiralty at the instance of the Royal Society, for observing the impending transit of Venus, and prosecuting geographical researches in the South Pacific Ocean.',
    source: 'britannica-11',
    sourceUrl:
      'https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Cook,_James',
    sourceTitle: '“Cook, James”',
  },
  {
    slug: 'mary-kingsley',
    displayName: 'Mary Kingsley',
    shortName: 'Mary Kingsley',
    lifespan: '1862–1900',
    knownFor: 'English traveller, ethnologist and author',
    prose:
      'KINGSLEY, MARY HENRIETTA (1862–1900), English traveller, ethnologist and author, daughter of George Henry Kingsley (1827–1892), was born in Islington, London, on the 13th of October 1862. She started for the West Coast in August 1893; and at Kabinda, at Old Calabar, Fernando Po and on the Lower Congo she pursued her investigations, returning to England in June 1894. The story of her adventures and her investigations in fetish is vividly told in her Travels in West Africa (1897).',
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
      'PARK, MUNGO (1771–1806?), Scottish explorer of the Niger, was born in Selkirkshire, Scotland, on the 20th of September 1771, at Foulshiels on the Yarrow—the farm which his father rented from the duke of Buccleuch. On the 21st of July 1796 he reached the long-sought Niger at Segu, being the first European to gaze on its waters. On his second expedition the boat struck on a rock at the Bussa rapids, not far below Yauri, and Park and the two soldiers who still survived sprang into the river and were drowned.',
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
      'Roald Engelbregt Gravning Amundsen (16 July 1872 – c. 18 June 1928) was a Norwegian explorer of polar regions and a key figure of the period known as the Heroic Age of Antarctic Exploration. From 1903 to 1906, he led the first expedition to successfully traverse the Northwest Passage on the sloop Gjøa. The party of five, led by Amundsen, became the first to reach the South Pole on 14 December 1911. On 12 May 1926, Amundsen and 15 other men in the airship Norge became the first explorers verified to have reached the North Pole.',
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
      'Captain Robert Falcon Scott (6 June 1868 – c. 29 March 1912) was a British Royal Navy officer and explorer who led two expeditions to Antarctica. On the first expedition, Scott set a new southern record by marching to latitude 82°S and discovered the Antarctic Plateau, on which the South Pole is located. On the second venture, Scott led a party of five which reached the South Pole on 17 January 1912, less than five weeks after Amundsen\'s South Pole expedition.',
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
      'PEARY, ROBERT EDWIN (1856–), American Arctic explorer, was born at Cresson, Pennsylvania, on the 6th of May 1856. In 1902 Peary with Henson and an Eskimo advanced as far north as lat. 84° 17′ 27″, the highest point then reached in the western hemisphere. On the 6th of April 1909 they reached the North Pole, remained some thirty hours, took observations, and on sounding a few miles from the pole found no bottom at 1500 fathoms.',
    source: 'britannica-11',
    sourceUrl:
      'https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Peary,_Robert_Edwin',
    sourceTitle: '“Peary, Robert Edwin”',
  },
];

export function bioBySlug(slug: string): ExplorerBio | undefined {
  return EXPLORER_BIOS.find((b) => b.slug === slug);
}
