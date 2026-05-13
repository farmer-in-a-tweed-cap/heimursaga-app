/**
 * URL slug helpers — kebab-case, ASCII, length-capped.
 *
 * Slug shape:
 *   - historical entry:   {explorer}-{title}-{yyyy-mm-dd}
 *   - user entry:         {title}-{shortId}
 *   - expedition:         {title}-{shortId}   (historical: {title} only if unique)
 *
 * A `publicId` is exactly 14 chars from base64url, so `isLikelyPublicId`
 * reliably distinguishes slug paths from legacy publicId paths in routing.
 */

const PUBLIC_ID_RE = /^[A-Za-z0-9_-]{14}$/;
const MAX_SLUG_LEN = 100;

export function isLikelyPublicId(s: string | undefined | null): boolean {
  if (!s) return false;
  return PUBLIC_ID_RE.test(s);
}

/**
 * Spread into Prisma `where` to match an entry/expedition by either its
 * legacy publicId or its slug. Lets every endpoint accept slug URLs
 * without thinking about which form the route param contains.
 */
export function idOrSlug(value: string): { OR: { public_id?: string; slug?: string }[] } {
  return { OR: [{ public_id: value }, { slug: value }] };
}

export function kebabize(input: string | undefined | null): string {
  if (!input) return '';
  // Strip diacritics, lowercase, keep [a-z0-9 -], collapse whitespace/hyphens
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, ' ')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LEN);
}

export function isoDateOnly(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Some historical entries are titled "Explorer Name - Title". Split on the
 * first " - " separator. Returns title-only when no separator is present.
 */
export function splitHistoricalTitle(title: string | null | undefined): {
  explorer?: string;
  title: string;
} {
  if (!title) return { title: '' };
  const idx = title.indexOf(' - ');
  if (idx === -1) return { title };
  return {
    explorer: title.slice(0, idx).trim(),
    title: title.slice(idx + 3).trim(),
  };
}

interface EntryForSlug {
  publicId?: string | null;
  title?: string | null;
  entryType?: string | null;
  date?: Date | string | null;
  publishedAt?: Date | string | null;
}

interface ExpeditionForSlug {
  publicId?: string | null;
  title?: string | null;
  endDate?: Date | string | null;
}

function shortIdSuffix(publicId?: string | null): string {
  if (!publicId) return '';
  // Lowercase a portion of the publicId to keep slugs ASCII/visually consistent.
  return publicId.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toLowerCase();
}

/**
 * Build a candidate slug for an entry. Callers must check uniqueness in the
 * database and append `-2`, `-3`, ... on collision.
 */
export function buildEntrySlugBase(entry: EntryForSlug): string {
  const isHistorical = entry.entryType === 'historical';
  if (isHistorical) {
    const { explorer, title } = splitHistoricalTitle(entry.title || '');
    const date = isoDateOnly(entry.date || entry.publishedAt);
    const parts = [
      explorer ? kebabize(explorer) : '',
      kebabize(title),
      date || '',
    ].filter(Boolean);
    const candidate = parts.join('-').slice(0, MAX_SLUG_LEN);
    if (candidate) return candidate;
  }
  const titleKebab = kebabize(entry.title || '');
  const suffix = shortIdSuffix(entry.publicId);
  if (titleKebab && suffix) {
    return `${titleKebab}-${suffix}`.slice(0, MAX_SLUG_LEN);
  }
  return titleKebab || suffix || '';
}

export function buildExpeditionSlugBase(exp: ExpeditionForSlug): string {
  const isHistorical =
    !!exp.endDate && new Date(exp.endDate) < new Date('1923-01-01');
  if (isHistorical) {
    const { title } = splitHistoricalTitle(exp.title || '');
    const cand = kebabize(title);
    if (cand) return cand;
  }
  const titleKebab = kebabize(exp.title || '');
  const suffix = shortIdSuffix(exp.publicId);
  if (titleKebab && suffix) {
    return `${titleKebab}-${suffix}`.slice(0, MAX_SLUG_LEN);
  }
  return titleKebab || suffix || '';
}

/**
 * Append `-2`, `-3`, ... until the candidate is unique under the supplied
 * lookup. The lookup returns true if a slug is already taken.
 */
export async function ensureUniqueSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  if (!base) return base;
  let candidate = base;
  let counter = 2;
  // 50 is a defensive cap; uniqueness collisions of this depth indicate a bug.
  while (counter < 50 && (await isTaken(candidate))) {
    const tail = `-${counter}`;
    const room = MAX_SLUG_LEN - tail.length;
    candidate = `${base.slice(0, room)}${tail}`;
    counter += 1;
  }
  return candidate;
}
