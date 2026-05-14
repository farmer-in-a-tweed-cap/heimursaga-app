import type { EntryMeta, ExpeditionMeta } from '@/lib/server-api';
import { splitHistoricalTitle } from '@/lib/seo-jsonld';

const SITE_URL = 'https://heimursaga.com';

function formatLongDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function paragraphs(body?: string): string[] {
  if (!body) return [];
  return body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// SSR shell is part of the initial HTML so crawlers see the body. The
// `ssr-shell-hidden` class is added once by the root layout's inline
// script and persists across soft navigations, so the CSS rule defined
// alongside it (also in root layout) hides every `[data-ssr-shell]`
// element on JS-capable clients without per-page setup.
export function SsrShellAssets() {
  return null;
}

export function EntryArticleSsr({ entry }: { entry: EntryMeta }) {
  const isHistorical = entry.entryType === 'historical';
  const { explorer, title: cleanTitle } = isHistorical
    ? splitHistoricalTitle(entry.title)
    : { explorer: undefined, title: entry.title };

  const datePretty = formatLongDate(entry.date || entry.publishedAt);
  const dateIso = entry.date || entry.publishedAt;
  const expClean = entry.expeditionTitle
    ? splitHistoricalTitle(entry.expeditionTitle).title
    : undefined;
  const expeditionUrl = entry.expeditionPublicId
    ? `${SITE_URL}/expedition/${entry.expeditionSlug || entry.expeditionPublicId}`
    : undefined;
  const paras = paragraphs(entry.body);

  return (
    <article data-ssr-shell="entry" itemScope itemType="https://schema.org/Article">
      <nav aria-label="Breadcrumb">
        <ol>
          <li>
            <a href={SITE_URL}>Heimursaga</a>
          </li>
          {expeditionUrl && expClean && (
            <li>
              <a href={expeditionUrl}>{expClean}</a>
            </li>
          )}
          <li aria-current="page">{cleanTitle}</li>
        </ol>
      </nav>

      <header>
        <h1 itemProp="headline">{cleanTitle}</h1>
        {(explorer || datePretty || entry.place) && (
          <p>
            {explorer && <span itemProp="author">{explorer}</span>}
            {explorer && (datePretty || entry.place) ? ' — ' : ''}
            {datePretty && dateIso && (
              <time itemProp="datePublished" dateTime={dateIso}>
                {datePretty}
              </time>
            )}
            {datePretty && entry.place ? ' — ' : ''}
            {entry.place && <span itemProp="contentLocation">{entry.place}</span>}
          </p>
        )}
      </header>

      <div itemProp="articleBody">
        {paras.length > 0 ? (
          paras.map((p, i) => <p key={i}>{p}</p>)
        ) : entry.body ? (
          <p>{entry.body}</p>
        ) : null}
      </div>

      {(entry.coverImage || (entry.images && entry.images.length > 0)) && (
        <div>
          {entry.coverImage && (
            <img src={entry.coverImage} alt={cleanTitle} loading="lazy" />
          )}
          {(entry.images || [])
            .filter((u) => u && u !== entry.coverImage)
            .map((url, i) => (
              <img
                key={`${url}-${i}`}
                src={url}
                alt={`${cleanTitle} — photo ${i + 1}`}
                loading="lazy"
              />
            ))}
        </div>
      )}

      {entry.authorUsername && (
        <p>
          Published on Heimursaga by{' '}
          <a href={`${SITE_URL}/journal/${entry.authorUsername}`}>
            {entry.authorName || entry.authorUsername}
          </a>
          .
        </p>
      )}
    </article>
  );
}

export function ExpeditionArticleSsr({
  expedition,
}: {
  expedition: ExpeditionMeta;
}) {
  const isHistorical =
    !!expedition.endDate &&
    new Date(expedition.endDate) < new Date('1923-01-01');
  const { explorer, title: cleanTitle } = isHistorical
    ? splitHistoricalTitle(expedition.title)
    : { explorer: undefined, title: expedition.title };

  const startPretty = formatLongDate(expedition.startDate);
  const endPretty = formatLongDate(expedition.endDate);

  return (
    <article
      data-ssr-shell="expedition"
      itemScope
      itemType="https://schema.org/Event"
    >
      <nav aria-label="Breadcrumb">
        <ol>
          <li>
            <a href={SITE_URL}>Heimursaga</a>
          </li>
          <li>
            <a href={`${SITE_URL}/expeditions`}>Expeditions</a>
          </li>
          <li aria-current="page">{cleanTitle}</li>
        </ol>
      </nav>

      <header>
        <h1 itemProp="name">{cleanTitle}</h1>
        {(explorer || startPretty || expedition.region) && (
          <p>
            {explorer && <span itemProp="organizer">{explorer}</span>}
            {explorer && (startPretty || expedition.region) ? ' — ' : ''}
            {startPretty && expedition.startDate && (
              <time itemProp="startDate" dateTime={expedition.startDate}>
                {startPretty}
              </time>
            )}
            {startPretty && endPretty ? ' to ' : ''}
            {endPretty && expedition.endDate && (
              <time itemProp="endDate" dateTime={expedition.endDate}>
                {endPretty}
              </time>
            )}
            {(startPretty || endPretty) && expedition.region ? ' — ' : ''}
            {expedition.region && (
              <span itemProp="location">{expedition.region}</span>
            )}
          </p>
        )}
      </header>

      {expedition.description && (
        <div itemProp="description">
          {paragraphs(expedition.description).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      {expedition.coverImage && (
        <img
          src={expedition.coverImage}
          alt={cleanTitle}
          itemProp="image"
          loading="lazy"
        />
      )}

      {expedition.authorUsername && (
        <p>
          An expedition on Heimursaga by{' '}
          <a href={`${SITE_URL}/journal/${expedition.authorUsername}`}>
            {expedition.authorName || expedition.authorUsername}
          </a>
          .
        </p>
      )}
    </article>
  );
}
