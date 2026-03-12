/**
 * UN M49 geoscheme sub-regions, grouped by macro region.
 * Used for standardized expedition region selection.
 * https://unstats.un.org/unsd/methodology/m49/
 */

export interface GeoRegionGroup {
  label: string;
  regions: string[];
}

export const GEO_REGION_GROUPS: GeoRegionGroup[] = [
  {
    label: 'Africa',
    regions: [
      'Northern Africa',
      'Western Africa',
      'Middle Africa',
      'Eastern Africa',
      'Southern Africa',
    ],
  },
  {
    label: 'Americas',
    regions: [
      'Northern America',
      'Central America',
      'Caribbean',
      'South America',
    ],
  },
  {
    label: 'Asia',
    regions: [
      'Central Asia',
      'Eastern Asia',
      'Southern Asia',
      'Southeast Asia',
      'Western Asia',
    ],
  },
  {
    label: 'Europe',
    regions: [
      'Northern Europe',
      'Western Europe',
      'Southern Europe',
      'Eastern Europe',
    ],
  },
  {
    label: 'Oceania',
    regions: [
      'Australia & New Zealand',
      'Melanesia',
      'Micronesia',
      'Polynesia',
    ],
  },
  {
    label: 'Polar',
    regions: [
      'Arctic',
      'Antarctica',
    ],
  },
];

/** Flat list of all valid region values */
export const GEO_REGIONS: string[] = GEO_REGION_GROUPS.flatMap(g => g.regions);

/** Expedition categories matching the web app */
export const EXPEDITION_CATEGORIES = [
  'Culture & Photography',
  'Scientific Research',
  'Documentary',
  'Adventure & Exploration',
  'Environmental',
  'Historical Documentation',
  'Other',
];
