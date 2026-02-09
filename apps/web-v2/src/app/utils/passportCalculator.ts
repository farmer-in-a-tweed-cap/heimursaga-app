/**
 * Passport & Achievement Calculator
 * Calculates passport data (countries, continents) and achievement badges
 * from entry locations and expedition data.
 */

import type { ExplorerEntry, ExplorerExpedition, ExplorerProfile } from '@/app/services/api';

// Country data with bounding boxes for coordinate lookup
// Format: [minLat, maxLat, minLon, maxLon]
const COUNTRY_BOUNDS: Record<string, { name: string; bounds: [number, number, number, number]; continent: string }> = {
  // North America
  US: { name: 'United States', bounds: [24.5, 49.5, -125, -66.5], continent: 'NA' },
  CA: { name: 'Canada', bounds: [41.7, 83.1, -141, -52.6], continent: 'NA' },
  MX: { name: 'Mexico', bounds: [14.5, 32.7, -118.4, -86.7], continent: 'NA' },
  GT: { name: 'Guatemala', bounds: [13.7, 17.8, -92.2, -88.2], continent: 'NA' },
  BZ: { name: 'Belize', bounds: [15.9, 18.5, -89.2, -87.5], continent: 'NA' },
  HN: { name: 'Honduras', bounds: [12.9, 16.5, -89.4, -83.1], continent: 'NA' },
  SV: { name: 'El Salvador', bounds: [13.1, 14.4, -90.1, -87.7], continent: 'NA' },
  NI: { name: 'Nicaragua', bounds: [10.7, 15.0, -87.7, -83.0], continent: 'NA' },
  CR: { name: 'Costa Rica', bounds: [8.0, 11.2, -85.9, -82.6], continent: 'NA' },
  PA: { name: 'Panama', bounds: [7.2, 9.6, -83.1, -77.2], continent: 'NA' },
  CU: { name: 'Cuba', bounds: [19.8, 23.3, -85.0, -74.1], continent: 'NA' },
  JM: { name: 'Jamaica', bounds: [17.7, 18.5, -78.4, -76.2], continent: 'NA' },
  HT: { name: 'Haiti', bounds: [18.0, 20.1, -74.5, -71.6], continent: 'NA' },
  DO: { name: 'Dominican Republic', bounds: [17.5, 19.9, -72.0, -68.3], continent: 'NA' },
  PR: { name: 'Puerto Rico', bounds: [17.9, 18.5, -67.3, -65.6], continent: 'NA' },

  // South America
  CO: { name: 'Colombia', bounds: [-4.2, 12.5, -79.0, -66.9], continent: 'SA' },
  VE: { name: 'Venezuela', bounds: [0.6, 12.2, -73.4, -59.8], continent: 'SA' },
  EC: { name: 'Ecuador', bounds: [-5.0, 1.4, -81.1, -75.2], continent: 'SA' },
  PE: { name: 'Peru', bounds: [-18.4, -0.0, -81.4, -68.7], continent: 'SA' },
  BR: { name: 'Brazil', bounds: [-33.8, 5.3, -73.9, -34.8], continent: 'SA' },
  BO: { name: 'Bolivia', bounds: [-22.9, -9.7, -69.6, -57.5], continent: 'SA' },
  PY: { name: 'Paraguay', bounds: [-27.6, -19.3, -62.6, -54.3], continent: 'SA' },
  CL: { name: 'Chile', bounds: [-55.9, -17.5, -75.6, -66.4], continent: 'SA' },
  AR: { name: 'Argentina', bounds: [-55.1, -21.8, -73.6, -53.6], continent: 'SA' },
  UY: { name: 'Uruguay', bounds: [-35.0, -30.1, -58.4, -53.1], continent: 'SA' },
  GY: { name: 'Guyana', bounds: [1.2, 8.6, -61.4, -56.5], continent: 'SA' },
  SR: { name: 'Suriname', bounds: [1.8, 6.0, -58.1, -54.0], continent: 'SA' },

  // Europe
  GB: { name: 'United Kingdom', bounds: [49.9, 60.9, -8.6, 1.8], continent: 'EU' },
  IE: { name: 'Ireland', bounds: [51.4, 55.4, -10.5, -6.0], continent: 'EU' },
  FR: { name: 'France', bounds: [42.3, 51.1, -5.1, 9.6], continent: 'EU' },
  ES: { name: 'Spain', bounds: [36.0, 43.8, -9.3, 4.3], continent: 'EU' },
  PT: { name: 'Portugal', bounds: [36.9, 42.2, -9.5, -6.2], continent: 'EU' },
  IT: { name: 'Italy', bounds: [36.6, 47.1, 6.6, 18.5], continent: 'EU' },
  DE: { name: 'Germany', bounds: [47.3, 55.1, 5.9, 15.0], continent: 'EU' },
  NL: { name: 'Netherlands', bounds: [50.8, 53.5, 3.4, 7.2], continent: 'EU' },
  BE: { name: 'Belgium', bounds: [49.5, 51.5, 2.5, 6.4], continent: 'EU' },
  CH: { name: 'Switzerland', bounds: [45.8, 47.8, 6.0, 10.5], continent: 'EU' },
  AT: { name: 'Austria', bounds: [46.4, 49.0, 9.5, 17.2], continent: 'EU' },
  PL: { name: 'Poland', bounds: [49.0, 54.8, 14.1, 24.1], continent: 'EU' },
  CZ: { name: 'Czech Republic', bounds: [48.6, 51.1, 12.1, 18.9], continent: 'EU' },
  SK: { name: 'Slovakia', bounds: [47.7, 49.6, 16.8, 22.6], continent: 'EU' },
  HU: { name: 'Hungary', bounds: [45.7, 48.6, 16.1, 22.9], continent: 'EU' },
  RO: { name: 'Romania', bounds: [43.6, 48.3, 20.3, 29.7], continent: 'EU' },
  BG: { name: 'Bulgaria', bounds: [41.2, 44.2, 22.4, 28.6], continent: 'EU' },
  GR: { name: 'Greece', bounds: [34.8, 41.7, 19.4, 29.6], continent: 'EU' },
  HR: { name: 'Croatia', bounds: [42.4, 46.5, 13.5, 19.4], continent: 'EU' },
  SI: { name: 'Slovenia', bounds: [45.4, 46.9, 13.4, 16.6], continent: 'EU' },
  RS: { name: 'Serbia', bounds: [42.2, 46.2, 18.8, 23.0], continent: 'EU' },
  BA: { name: 'Bosnia and Herzegovina', bounds: [42.6, 45.3, 15.7, 19.6], continent: 'EU' },
  ME: { name: 'Montenegro', bounds: [41.9, 43.6, 18.4, 20.4], continent: 'EU' },
  AL: { name: 'Albania', bounds: [39.6, 42.7, 19.3, 21.1], continent: 'EU' },
  MK: { name: 'North Macedonia', bounds: [40.9, 42.4, 20.5, 23.0], continent: 'EU' },
  SE: { name: 'Sweden', bounds: [55.3, 69.1, 11.1, 24.2], continent: 'EU' },
  NO: { name: 'Norway', bounds: [58.0, 71.2, 4.6, 31.1], continent: 'EU' },
  FI: { name: 'Finland', bounds: [59.8, 70.1, 20.6, 31.6], continent: 'EU' },
  DK: { name: 'Denmark', bounds: [54.6, 57.8, 8.1, 15.2], continent: 'EU' },
  IS: { name: 'Iceland', bounds: [63.4, 66.5, -24.5, -13.5], continent: 'EU' },
  EE: { name: 'Estonia', bounds: [57.5, 59.7, 21.8, 28.2], continent: 'EU' },
  LV: { name: 'Latvia', bounds: [55.7, 58.1, 21.0, 28.2], continent: 'EU' },
  LT: { name: 'Lithuania', bounds: [53.9, 56.5, 21.0, 26.8], continent: 'EU' },
  UA: { name: 'Ukraine', bounds: [44.4, 52.4, 22.1, 40.2], continent: 'EU' },
  BY: { name: 'Belarus', bounds: [51.3, 56.2, 23.2, 32.8], continent: 'EU' },
  MD: { name: 'Moldova', bounds: [45.5, 48.5, 26.6, 30.2], continent: 'EU' },
  RU: { name: 'Russia', bounds: [41.2, 81.9, 19.6, 180], continent: 'EU' }, // Simplified, spans EU/AS

  // Asia
  TR: { name: 'Turkey', bounds: [36.0, 42.1, 26.0, 44.8], continent: 'AS' },
  JP: { name: 'Japan', bounds: [24.4, 45.5, 122.9, 153.9], continent: 'AS' },
  KR: { name: 'South Korea', bounds: [33.1, 38.6, 124.6, 131.9], continent: 'AS' },
  CN: { name: 'China', bounds: [18.2, 53.6, 73.6, 135.1], continent: 'AS' },
  IN: { name: 'India', bounds: [6.7, 35.5, 68.2, 97.4], continent: 'AS' },
  TH: { name: 'Thailand', bounds: [5.6, 20.5, 97.3, 105.6], continent: 'AS' },
  VN: { name: 'Vietnam', bounds: [8.4, 23.4, 102.1, 109.5], continent: 'AS' },
  MY: { name: 'Malaysia', bounds: [0.9, 7.4, 99.6, 119.3], continent: 'AS' },
  SG: { name: 'Singapore', bounds: [1.2, 1.5, 103.6, 104.0], continent: 'AS' },
  ID: { name: 'Indonesia', bounds: [-11.0, 6.1, 95.0, 141.0], continent: 'AS' },
  PH: { name: 'Philippines', bounds: [4.6, 21.1, 116.9, 126.6], continent: 'AS' },
  KH: { name: 'Cambodia', bounds: [10.4, 14.7, 102.3, 107.6], continent: 'AS' },
  LA: { name: 'Laos', bounds: [13.9, 22.5, 100.1, 107.7], continent: 'AS' },
  MM: { name: 'Myanmar', bounds: [9.8, 28.5, 92.2, 101.2], continent: 'AS' },
  NP: { name: 'Nepal', bounds: [26.4, 30.4, 80.1, 88.2], continent: 'AS' },
  BD: { name: 'Bangladesh', bounds: [20.7, 26.6, 88.0, 92.7], continent: 'AS' },
  LK: { name: 'Sri Lanka', bounds: [5.9, 9.8, 79.7, 81.9], continent: 'AS' },
  PK: { name: 'Pakistan', bounds: [23.7, 37.1, 60.9, 77.8], continent: 'AS' },
  AF: { name: 'Afghanistan', bounds: [29.4, 38.5, 60.5, 75.0], continent: 'AS' },
  IR: { name: 'Iran', bounds: [25.1, 39.8, 44.0, 63.3], continent: 'AS' },
  IQ: { name: 'Iraq', bounds: [29.1, 37.4, 38.8, 48.6], continent: 'AS' },
  SA: { name: 'Saudi Arabia', bounds: [16.4, 32.2, 34.5, 55.7], continent: 'AS' },
  AE: { name: 'United Arab Emirates', bounds: [22.6, 26.1, 51.5, 56.4], continent: 'AS' },
  IL: { name: 'Israel', bounds: [29.5, 33.3, 34.3, 35.9], continent: 'AS' },
  JO: { name: 'Jordan', bounds: [29.2, 33.4, 34.9, 39.3], continent: 'AS' },
  LB: { name: 'Lebanon', bounds: [33.1, 34.7, 35.1, 36.6], continent: 'AS' },
  SY: { name: 'Syria', bounds: [32.3, 37.3, 35.7, 42.4], continent: 'AS' },
  GE: { name: 'Georgia', bounds: [41.1, 43.6, 40.0, 46.7], continent: 'AS' },
  AM: { name: 'Armenia', bounds: [38.8, 41.3, 43.4, 46.6], continent: 'AS' },
  AZ: { name: 'Azerbaijan', bounds: [38.4, 41.9, 44.8, 50.4], continent: 'AS' },
  KZ: { name: 'Kazakhstan', bounds: [40.6, 55.4, 46.5, 87.3], continent: 'AS' },
  UZ: { name: 'Uzbekistan', bounds: [37.2, 45.6, 56.0, 73.1], continent: 'AS' },
  MN: { name: 'Mongolia', bounds: [41.6, 52.1, 87.8, 119.9], continent: 'AS' },
  TW: { name: 'Taiwan', bounds: [21.9, 25.3, 120.0, 122.0], continent: 'AS' },

  // Africa
  EG: { name: 'Egypt', bounds: [22.0, 31.7, 24.7, 36.9], continent: 'AF' },
  MA: { name: 'Morocco', bounds: [27.7, 35.9, -13.2, -1.0], continent: 'AF' },
  ZA: { name: 'South Africa', bounds: [-34.8, -22.1, 16.5, 32.9], continent: 'AF' },
  KE: { name: 'Kenya', bounds: [-4.7, 5.0, 33.9, 41.9], continent: 'AF' },
  TZ: { name: 'Tanzania', bounds: [-11.7, -1.0, 29.3, 40.4], continent: 'AF' },
  NG: { name: 'Nigeria', bounds: [4.3, 13.9, 2.7, 14.7], continent: 'AF' },
  GH: { name: 'Ghana', bounds: [4.7, 11.2, -3.3, 1.2], continent: 'AF' },
  ET: { name: 'Ethiopia', bounds: [3.4, 14.9, 33.0, 48.0], continent: 'AF' },
  UG: { name: 'Uganda', bounds: [-1.5, 4.2, 29.6, 35.0], continent: 'AF' },
  RW: { name: 'Rwanda', bounds: [-2.8, -1.1, 28.9, 30.9], continent: 'AF' },
  SN: { name: 'Senegal', bounds: [12.3, 16.7, -17.5, -11.4], continent: 'AF' },
  CI: { name: 'Ivory Coast', bounds: [4.4, 10.7, -8.6, -2.5], continent: 'AF' },
  CM: { name: 'Cameroon', bounds: [1.7, 13.1, 8.5, 16.2], continent: 'AF' },
  ZW: { name: 'Zimbabwe', bounds: [-22.4, -15.6, 25.2, 33.1], continent: 'AF' },
  BW: { name: 'Botswana', bounds: [-26.9, -17.8, 20.0, 29.4], continent: 'AF' },
  NA: { name: 'Namibia', bounds: [-28.9, -17.0, 11.7, 25.3], continent: 'AF' },
  MZ: { name: 'Mozambique', bounds: [-26.9, -10.5, 30.2, 40.8], continent: 'AF' },
  MG: { name: 'Madagascar', bounds: [-25.6, -11.9, 43.2, 50.5], continent: 'AF' },
  TN: { name: 'Tunisia', bounds: [30.2, 37.5, 7.5, 11.6], continent: 'AF' },
  DZ: { name: 'Algeria', bounds: [19.0, 37.1, -9.0, 12.0], continent: 'AF' },
  LY: { name: 'Libya', bounds: [19.5, 33.2, 9.4, 25.2], continent: 'AF' },
  SD: { name: 'Sudan', bounds: [8.7, 22.2, 21.8, 38.6], continent: 'AF' },

  // Oceania
  AU: { name: 'Australia', bounds: [-43.6, -10.7, 113.2, 153.6], continent: 'OC' },
  NZ: { name: 'New Zealand', bounds: [-47.3, -34.4, 166.4, 178.6], continent: 'OC' },
  FJ: { name: 'Fiji', bounds: [-21.0, -12.5, 177.0, -179.0], continent: 'OC' },
  PG: { name: 'Papua New Guinea', bounds: [-11.7, -1.0, 141.0, 156.0], continent: 'OC' },
  NC: { name: 'New Caledonia', bounds: [-22.7, -19.5, 163.6, 168.1], continent: 'OC' },
  VU: { name: 'Vanuatu', bounds: [-20.3, -13.1, 166.5, 170.2], continent: 'OC' },
  WS: { name: 'Samoa', bounds: [-14.1, -13.4, -172.8, -171.4], continent: 'OC' },
  TO: { name: 'Tonga', bounds: [-21.5, -15.6, -175.7, -173.7], continent: 'OC' },
  PF: { name: 'French Polynesia', bounds: [-27.6, -7.9, -152.9, -134.9], continent: 'OC' },
  GU: { name: 'Guam', bounds: [13.2, 13.7, 144.6, 145.0], continent: 'OC' },

  // Antarctica (special case)
  AQ: { name: 'Antarctica', bounds: [-90, -60, -180, 180], continent: 'AN' },
};

const CONTINENT_NAMES: Record<string, string> = {
  AF: 'Africa',
  AN: 'Antarctica',
  AS: 'Asia',
  EU: 'Europe',
  NA: 'North America',
  OC: 'Oceania',
  SA: 'South America',
};

// Polar region thresholds
const ARCTIC_LATITUDE = 66.5;
const ANTARCTIC_LATITUDE = -66.5;

/**
 * Find country code from coordinates using bounding box lookup
 */
export function getCountryFromCoordinates(lat: number, lon: number): { code: string; name: string; continent: string } | null {
  // Check Antarctica first (special case for polar achievement)
  if (lat < ANTARCTIC_LATITUDE) {
    return { code: 'AQ', name: 'Antarctica', continent: 'AN' };
  }

  // Find matching country by bounding box
  for (const [code, data] of Object.entries(COUNTRY_BOUNDS)) {
    const [minLat, maxLat, minLon, maxLon] = data.bounds;
    if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) {
      return { code, name: data.name, continent: data.continent };
    }
  }

  return null;
}

/**
 * Check if coordinates are in polar regions
 */
export function isInPolarRegion(lat: number): boolean {
  return lat >= ARCTIC_LATITUDE || lat <= ANTARCTIC_LATITUDE;
}

export interface PassportCountry {
  code: string;
  name: string;
  flag: string;
  firstVisit: string;
}

export interface PassportContinent {
  code: string;
  name: string;
  firstVisit: string;
}

export interface PassportStamp {
  id: string;
  name: string;
  description: string;
  earnedDate: string;
  image?: string;
}

export interface PassportData {
  stamps: PassportStamp[];
  countries: PassportCountry[];
  continents: PassportContinent[];
}

/**
 * Get country info from code (for when API provides countryCode)
 */
function getCountryInfo(code: string): { name: string; continent: string } | null {
  const countryData = COUNTRY_BOUNDS[code];
  if (countryData) {
    return { name: countryData.name, continent: countryData.continent };
  }
  // Fallback for codes not in our bounds list
  return { name: code, continent: 'UN' }; // Unknown continent
}

/**
 * Calculate passport data from entries
 * Uses countryCode from API if available, falls back to coordinate lookup for older entries
 */
export function calculatePassportFromEntries(entries: ExplorerEntry[]): { countries: PassportCountry[]; continents: PassportContinent[] } {
  const countriesMap = new Map<string, { name: string; firstVisit: string }>();
  const continentsMap = new Map<string, string>(); // continent code -> first visit date

  // Process each entry
  for (const entry of entries) {
    let countryCode: string | null = null;
    let countryName: string | null = null;
    let continentCode: string | null = null;

    // Prefer API-provided countryCode (from reverse geocoding)
    if (entry.countryCode) {
      countryCode = entry.countryCode;
      const info = getCountryInfo(countryCode);
      if (info) {
        countryName = info.name;
        continentCode = info.continent;
      }
    }
    // Fall back to coordinate-based lookup for older entries without countryCode
    else if (entry.lat != null && entry.lon != null) {

      const country = getCountryFromCoordinates(entry.lat, entry.lon);
      if (country) {
        countryCode = country.code;
        countryName = country.name;
        continentCode = country.continent;
      }
    }

    if (!countryCode || !countryName || !continentCode) continue;

    const entryDate = entry.date || entry.createdAt || '';

    // Track country (keep earliest date)
    if (!countriesMap.has(countryCode)) {
      countriesMap.set(countryCode, { name: countryName, firstVisit: entryDate });
    } else {
      const existing = countriesMap.get(countryCode)!;
      if (entryDate && (!existing.firstVisit || entryDate < existing.firstVisit)) {
        existing.firstVisit = entryDate;
      }
    }

    // Track continent (keep earliest date)
    if (!continentsMap.has(continentCode)) {
      continentsMap.set(continentCode, entryDate);
    } else {
      const existingDate = continentsMap.get(continentCode)!;
      if (entryDate && (!existingDate || entryDate < existingDate)) {
        continentsMap.set(continentCode, entryDate);
      }
    }
  }

  // Convert to arrays and sort by first visit date (earliest first, items without dates at end)
  const countries: PassportCountry[] = Array.from(countriesMap.entries())
    .map(([code, data]) => ({
      code,
      name: data.name,
      flag: '', // Flag emoji not needed, we use CountryFlag component
      firstVisit: data.firstVisit ? data.firstVisit.split('T')[0] : '',
    }))
    .sort((a, b) => {
      if (!a.firstVisit && !b.firstVisit) return 0;
      if (!a.firstVisit) return 1; // Items without dates go to end
      if (!b.firstVisit) return -1;
      return a.firstVisit.localeCompare(b.firstVisit);
    });

  const continents: PassportContinent[] = Array.from(continentsMap.entries())
    .map(([code, firstVisit]) => ({
      code,
      name: CONTINENT_NAMES[code] || code,
      firstVisit: firstVisit ? firstVisit.split('T')[0] : '',
    }))
    .sort((a, b) => {
      if (!a.firstVisit && !b.firstVisit) return 0;
      if (!a.firstVisit) return 1;
      if (!b.firstVisit) return -1;
      return a.firstVisit.localeCompare(b.firstVisit);
    });

  return { countries, continents };
}

/**
 * Achievement definitions based on platform documentation
 * See DocumentationPage.tsx for full criteria descriptions
 */
interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  image: string;
  check: (data: AchievementCheckData) => { earned: boolean; earnedDate?: string };
}

interface AchievementCheckData {
  entries: ExplorerEntry[];
  expeditions: ExplorerExpedition[];
  profile: ExplorerProfile;
  countries: PassportCountry[];
  continents: PassportContinent[];
}

/**
 * Check if coordinates are in international waters (ocean)
 * Simple heuristic: if no country is found from coordinates
 */
function isInOcean(lat: number, lon: number): boolean {
  return getCountryFromCoordinates(lat, lon) === null && lat > ANTARCTIC_LATITUDE;
}

/**
 * Get longitude zone (0-3) for circumnavigation check
 * Divides the world into 4 major longitude zones
 */
function getLongitudeZone(lon: number): number {
  if (lon >= -180 && lon < -90) return 0; // Americas West
  if (lon >= -90 && lon < 0) return 1;    // Americas East / Atlantic
  if (lon >= 0 && lon < 90) return 2;     // Europe / Africa
  return 3;                                // Asia / Pacific
}

const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'pioneer',
    name: 'Pioneer',
    description: 'One of the first 100 Heimursaga explorers (exclusive)',
    image: '/assets/badges/Pioneer.svg',
    check: ({ profile }) => {
      // First 100 explorers - check if member date is before cutoff
      // This is exclusive and no longer available after the first 100
      const cutoffDate = '2025-06-01'; // Adjust based on when 100th user joined
      if (profile.memberDate && profile.memberDate < cutoffDate) {
        return { earned: true, earnedDate: profile.memberDate.split('T')[0] };
      }
      return { earned: false };
    },
  },
  {
    id: 'journeys-end',
    name: "Journey's End",
    description: 'Complete an expedition lasting 30+ days with 15+ entries',
    image: '/assets/badges/JourneysEnd.svg',
    check: ({ expeditions, entries }) => {
      // Find completed expeditions that meet the criteria (case-insensitive status check)
      const completed = expeditions.filter(e => e.status?.toLowerCase() === 'completed');

      for (const expedition of completed) {
        // Calculate duration
        if (!expedition.startDate || !expedition.endDate) continue;
        const start = new Date(expedition.startDate);
        const end = new Date(expedition.endDate);
        const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        if (durationDays < 30) continue;

        // Count entries for this expedition (match by publicId)
        const expeditionEntries = entries.filter(e =>
          e.expedition?.id === expedition.publicId ||
          e.expedition?.publicId === expedition.publicId ||
          (e.expedition as any)?.publicId === expedition.publicId
        );

        if (expeditionEntries.length >= 15) {
          return { earned: true, earnedDate: expedition.endDate.split('T')[0] };
        }
      }
      return { earned: false };
    },
  },
  {
    id: 'globetrotter',
    name: 'Globetrotter',
    description: 'Log entries from 5 or more different countries',
    image: '/assets/badges/Globetrotter.svg',
    check: ({ countries }) => {
      if (countries.length >= 5) {
        // Earned when 5th country was visited
        const fifthCountry = countries[4];
        return { earned: true, earnedDate: fifthCountry?.firstVisit || '' };
      }
      return { earned: false };
    },
  },
  {
    id: 'benefactor',
    name: 'Benefactor',
    description: 'Give $1,000 or more in combined sponsorships',
    image: '/assets/badges/Benefactor.svg',
    check: ({ profile }) => {
      // Check total sponsorship given (needs API field: totalSponsorshipGiven)
      const totalGiven = (profile as any).totalSponsorshipGiven || 0;
      if (totalGiven >= 1000) {
        // Date when threshold was crossed - would need API support
        return { earned: true, earnedDate: '' };
      }
      return { earned: false };
    },
  },
  {
    id: 'expeditionist',
    name: 'Expeditionist',
    description: 'Complete an expedition with entries in 3+ countries',
    image: '/assets/badges/Expeditionist.svg',
    check: ({ expeditions, entries }) => {
      // Find completed expeditions (case-insensitive status check)
      const completed = expeditions.filter(e => e.status?.toLowerCase() === 'completed');

      for (const expedition of completed) {
        // Get entries for this expedition (match by publicId)
        const expeditionEntries = entries.filter(e => {
          const entryExpId = e.expedition?.id || e.expedition?.publicId || (e.expedition as any)?.publicId;
          return entryExpId === expedition.publicId;
        });

        // Need at least 3 entries to have 3 countries
        if (expeditionEntries.length < 3) continue;

        // Count unique countries in expedition entries
        const countriesInExpedition = new Set<string>();
        for (const entry of expeditionEntries) {
          if (entry.lat != null && entry.lon != null) {
            const country = getCountryFromCoordinates(entry.lat, entry.lon);
            if (country) {
              countriesInExpedition.add(country.code);
            }
          }
        }

        if (countriesInExpedition.size >= 3) {
          return { earned: true, earnedDate: expedition.endDate?.split('T')[0] || '' };
        }
      }
      return { earned: false };
    },
  },
  {
    id: 'seven-summits',
    name: 'Seven Summits',
    description: 'Log at least one entry from each of the 7 continents',
    image: '/assets/badges/SevenSummits.svg',
    check: ({ continents }) => {
      if (continents.length >= 7) {
        // Earned when 7th continent was visited
        const seventhContinent = continents[6];
        return { earned: true, earnedDate: seventhContinent?.firstVisit || '' };
      }
      return { earned: false };
    },
  },
  {
    id: 'polar-explorer',
    name: 'Polar Explorer',
    description: 'Log entries from Arctic (>66.5°N) or Antarctic (<66.5°S)',
    image: '/assets/badges/PolarExplorer.svg',
    check: ({ entries }) => {
      // Find first entry in polar regions
      const polarEntries = entries
        .filter(e => e.lat != null && isInPolarRegion(e.lat))
        .sort((a, b) => (a.date || a.createdAt || '').localeCompare(b.date || b.createdAt || ''));

      if (polarEntries.length > 0) {
        const firstPolar = polarEntries[0];
        return { earned: true, earnedDate: (firstPolar.date || firstPolar.createdAt || '').split('T')[0] };
      }
      return { earned: false };
    },
  },
  {
    id: 'seafarer',
    name: 'Seafarer',
    description: 'Log 3+ entries at ocean coordinates (international waters)',
    image: '/assets/badges/Seafarer.svg',
    check: ({ entries }) => {
      // Find entries in international waters (no country match)
      const oceanEntries = entries
        .filter(e => e.lat != null && e.lon != null && isInOcean(e.lat, e.lon))
        .sort((a, b) => (a.date || a.createdAt || '').localeCompare(b.date || b.createdAt || ''));

      if (oceanEntries.length >= 3) {
        const thirdOcean = oceanEntries[2];
        return { earned: true, earnedDate: (thirdOcean.date || thirdOcean.createdAt || '').split('T')[0] };
      }
      return { earned: false };
    },
  },
  {
    id: 'circumnavigator',
    name: 'Circumnavigator',
    description: 'Complete a round-trip expedition spanning all major longitude zones',
    image: '/assets/badges/Circumnavigator.svg',
    check: ({ expeditions, entries }) => {
      // Find completed expeditions (case-insensitive status check)
      const completed = expeditions.filter(e => e.status?.toLowerCase() === 'completed');

      for (const expedition of completed) {
        // Get entries for this expedition (match by publicId)
        const expeditionEntries = entries.filter(e =>
          e.expedition?.id === expedition.publicId ||
          e.expedition?.publicId === expedition.publicId ||
          (e.expedition as any)?.publicId === expedition.publicId
        );

        // Check if entries span all 4 longitude zones
        const zonesVisited = new Set<number>();
        for (const entry of expeditionEntries) {
          if (entry.lon != null) {
            zonesVisited.add(getLongitudeZone(entry.lon));
          }
        }

        if (zonesVisited.size >= 4) {
          return { earned: true, earnedDate: expedition.endDate?.split('T')[0] || '' };
        }
      }
      return { earned: false };
    },
  },
];

/**
 * Calculate earned achievements/stamps
 */
export function calculateAchievements(
  entries: ExplorerEntry[],
  expeditions: ExplorerExpedition[],
  profile: ExplorerProfile,
  countries: PassportCountry[],
  continents: PassportContinent[]
): PassportStamp[] {
  const checkData: AchievementCheckData = {
    entries,
    expeditions,
    profile,
    countries,
    continents,
  };

  const earnedStamps: PassportStamp[] = [];

  for (const achievement of ACHIEVEMENT_DEFINITIONS) {
    const result = achievement.check(checkData);
    if (result.earned) {
      earnedStamps.push({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        earnedDate: result.earnedDate || '',
        image: achievement.image,
      });
    }
  }

  // Sort by earned date (earliest first, items without dates at end)
  earnedStamps.sort((a, b) => {
    if (!a.earnedDate && !b.earnedDate) return 0;
    if (!a.earnedDate) return 1;
    if (!b.earnedDate) return -1;
    return a.earnedDate.localeCompare(b.earnedDate);
  });

  return earnedStamps;
}

/**
 * Calculate complete passport data including achievements
 */
export function calculatePassport(
  entries: ExplorerEntry[],
  expeditions: ExplorerExpedition[],
  profile: ExplorerProfile
): PassportData {
  const { countries, continents } = calculatePassportFromEntries(entries);
  const stamps = calculateAchievements(entries, expeditions, profile, countries, continents);

  return {
    stamps,
    countries,
    continents,
  };
}
