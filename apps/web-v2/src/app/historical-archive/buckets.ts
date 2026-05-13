import type {
  IHistoricalArchiveEntry,
  IHistoricalArchiveExpedition,
} from '@repo/types';

/**
 * Eras pulled from the actual archive content (early 1800s through 1922).
 * The cutoffs are conventional shorthand for how the prose itself groups —
 * each era's expeditions share rhetoric, technology, and motivations.
 */
export const ERAS: ReadonlyArray<{ id: string; label: string; from: number; to: number }> = [
  {
    id: 'romantic',
    label: 'Age of Romantic Exploration',
    from: 1700,
    to: 1849,
  },
  {
    id: 'victorian',
    label: 'Victorian Era Exploration',
    from: 1850,
    to: 1899,
  },
  {
    id: 'heroic',
    label: 'Heroic Age of Exploration',
    from: 1900,
    to: 1950,
  },
];

export interface RegionDef {
  id: string;
  label: string;
}

export const REGIONS: ReadonlyArray<RegionDef> = [
  { id: 'antarctica', label: 'Antarctica & Subantarctic' },
  { id: 'arctic', label: 'Arctic & Polar Seas' },
  { id: 'africa', label: 'Africa' },
  { id: 'south-america', label: 'South America' },
  { id: 'north-america', label: 'North America' },
  { id: 'asia', label: 'Asia' },
  { id: 'europe', label: 'Europe' },
  { id: 'oceania', label: 'Oceania' },
];

const CONTINENT_BY_CC: Record<string, string> = {
  // North America
  US: 'north-america', CA: 'north-america', MX: 'north-america', GL: 'north-america',
  // South America
  AR: 'south-america', BO: 'south-america', BR: 'south-america', CL: 'south-america',
  CO: 'south-america', EC: 'south-america', GY: 'south-america', PE: 'south-america',
  PY: 'south-america', SR: 'south-america', UY: 'south-america', VE: 'south-america',
  GF: 'south-america', GS: 'south-america', FK: 'south-america',
  // Africa
  CM: 'africa', CD: 'africa', EG: 'africa', GA: 'africa', GH: 'africa', GM: 'africa',
  KE: 'africa', LY: 'africa', MA: 'africa', ML: 'africa', MZ: 'africa', NE: 'africa',
  NG: 'africa', SD: 'africa', SS: 'africa', TZ: 'africa', UG: 'africa', ZA: 'africa',
  ZM: 'africa', ZW: 'africa', CI: 'africa', SN: 'africa', BF: 'africa',
  // Asia
  CN: 'asia', HK: 'asia', IN: 'asia', JP: 'asia', LK: 'asia', MM: 'asia', NP: 'asia',
  SG: 'asia', TH: 'asia', VN: 'asia', ID: 'asia', PH: 'asia', MY: 'asia', BD: 'asia',
  IR: 'asia', AF: 'asia', PK: 'asia', YE: 'asia', SA: 'asia', AE: 'asia', OM: 'asia',
  KR: 'asia',
  // Europe
  AT: 'europe', BE: 'europe', CH: 'europe', CZ: 'europe', DE: 'europe', DK: 'europe',
  ES: 'europe', FI: 'europe', FR: 'europe', GB: 'europe', GR: 'europe', HU: 'europe',
  IE: 'europe', IS: 'europe', IT: 'europe', NL: 'europe', NO: 'europe', PL: 'europe',
  PT: 'europe', RO: 'europe', RU: 'europe', SE: 'europe', TR: 'europe',
  // Oceania
  AU: 'oceania', NZ: 'oceania', FJ: 'oceania', PG: 'oceania', SB: 'oceania',
  VU: 'oceania', WS: 'oceania', TO: 'oceania', NC: 'oceania', PF: 'oceania',
};

export function eraForYear(year: number | undefined | null): string | null {
  if (year == null || !Number.isFinite(year)) return null;
  for (const era of ERAS) {
    if (year >= era.from && year <= era.to) return era.id;
  }
  return null;
}

/**
 * Bucket an entry into a region. Polar regions take precedence by latitude
 * (most polar entries have no country code), then continent by country code.
 */
export function regionForEntry(
  entry: Pick<IHistoricalArchiveEntry, 'lat' | 'lon' | 'countryCode'>,
): string | null {
  if (typeof entry.lat === 'number') {
    if (entry.lat < -60) return 'antarctica';
    if (entry.lat > 70) return 'arctic';
  }
  if (entry.countryCode) {
    return CONTINENT_BY_CC[entry.countryCode] ?? null;
  }
  return null;
}

/**
 * Group expeditions by their majority entry region. Falls back to the
 * expedition's own country_code, then null.
 */
export function regionForExpedition(
  expedition: IHistoricalArchiveExpedition,
  entries: IHistoricalArchiveEntry[],
): string | null {
  const expEntries = entries.filter(
    (e) => e.expeditionPublicId === expedition.publicId,
  );
  if (expEntries.length > 0) {
    const counts = new Map<string, number>();
    for (const e of expEntries) {
      const r = regionForEntry(e);
      if (r) counts.set(r, (counts.get(r) || 0) + 1);
    }
    if (counts.size > 0) {
      return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
  }
  if (expedition.countryCode) {
    return CONTINENT_BY_CC[expedition.countryCode] ?? null;
  }
  return null;
}

export function expeditionYear(
  expedition: IHistoricalArchiveExpedition,
): number | null {
  const d = expedition.startDate || expedition.endDate;
  if (!d) return null;
  const year = new Date(d).getUTCFullYear();
  return Number.isFinite(year) ? year : null;
}

export function explorerSlug(explorer: string): string {
  return explorer
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]+/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
