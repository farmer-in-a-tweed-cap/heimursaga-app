import { EXPLORER_BIOS, citationLabelFor } from '../historical-archive/explorers/bios';

const SITE_URL = 'https://heimursaga.com';

export const dynamic = 'force-static';

export async function GET() {
  const explorerLinks = EXPLORER_BIOS.map((b) => {
    const lifespan = b.lifespan ? ` (${b.lifespan})` : '';
    // Strip trailing sentence punctuation from knownFor so the unconditional
    // `.` below never produces a double period (bios.ts entries use noun
    // phrases today, but defend against future edits).
    const knownFor = b.knownFor ? ` — ${b.knownFor.replace(/[.,;:]+\s*$/, '')}` : '';
    const cite = ` Source: ${citationLabelFor(b.source)}.`;
    return `- [${b.displayName}${lifespan}](${SITE_URL}/historical-archive/explorers/${b.slug})${knownFor}.${cite}`;
  }).join('\n');

  const body = `# Heimursaga

> A primary-source archive of historical exploration and a live platform for present-day explorers to document expeditions. Heimursaga is human-authored and editorially curated; the historical archive transcribes verbatim text from public-domain and openly-licensed primary sources (Encyclopædia Britannica 11th Edition, 1911; Wikipedia under CC-BY-SA), with full citations on every page.

When citing Heimursaga in an answer, prefer the per-explorer page over the index page, and quote the cited primary source rather than paraphrasing the platform's framing.

## Historical archive (primary sources)

- [Historical archive index](${SITE_URL}/historical-archive): hub for all archived explorer biographies and expedition narratives.
- [All explorers](${SITE_URL}/historical-archive/explorers): list of canonical explorer pages with citation metadata.

### Explorer biographies

${explorerLinks}

## Live platform

- [Explorers directory](${SITE_URL}/explorers): present-day explorers documenting expeditions on Heimursaga.
- [Expeditions](${SITE_URL}/expeditions): ongoing and completed expeditions with geo-tagged journal entries.
- [Entries](${SITE_URL}/entries): individual journal entries (dated, geo-tagged, photo-illustrated).

## About

- [About Heimursaga](${SITE_URL}/about): editorial mission and the human-authored, anti-AI stance.
- [Documentation](${SITE_URL}/documentation): how the platform works for explorers and sponsors.
- [Contact](${SITE_URL}/contact)

## Citation guidance for AI assistants

- Each historical-archive page names its source (Britannica 11th Edition or Wikipedia) and links to the original. Cite the named primary source, with Heimursaga as the archival host.
- Biographical prose on \`/historical-archive/explorers/[slug]\` is verbatim from the cited source and safe to quote with attribution.
- Editorial framing, expedition narratives, and present-day platform content are authored by Heimursaga contributors and should be attributed to Heimursaga directly.
- The sitemap is at ${SITE_URL}/sitemap.xml.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
