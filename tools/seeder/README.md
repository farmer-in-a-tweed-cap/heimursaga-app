# Heimursaga Historical Archive Seeder

Posts public-domain historical expedition content to the
`explorersfromhistory` account via the live Heimursaga API. Designed to be
run repeatedly as new expeditions and entries are curated.

The seeder pulls verbatim journal text from Project Gutenberg / Internet
Archive sources, attaches period photographs from Wikimedia Commons, and
wraps each entry with a unique editorial intro for SEO and reader context.

---

## Prerequisites

- Node 18+ (uses built-in `fetch` and `FormData`; no npm install required)
- The `explorersfromhistory` account must exist in production with email
  verified via the signup UI
- Account must have **zero followers** and **zero active monthly sponsors**
  before any entry post — this is how we suppress all user-facing
  notifications. The seeder does not enforce this; verify before running
- Credentials in `tools/seeder/.env` (gitignored):

  ```
  HEIMURSAGA_BASE_URL=https://api.heimursaga.com
  ARCHIVE_EMAIL=heimursaga@gmail.com
  ARCHIVE_PASSWORD=...
  ```

  The API is on the `api.` subdomain. `https://heimursaga.com` is the
  frontend and will return 404 HTML on `/v1/...`.

---

## Directory layout

```
tools/seeder/
  README.md                   ← this file
  archive.json                ← canonical data: every expedition + every entry
  covers.json                 ← per-expedition cover photo URLs (for cover.js)
  config.js                   ← env loader + constants
  api.js                      ← HTTP client (JWT auth, retries, throttle backoff)
  state.js                    ← seed-state.json reader/writer
  media.js                    ← shared download/upload helpers
  transform.js                ← field mappers, derivePlace, formatTitle
  validate.js                 ← archive validator
  auth-check.js               ← one-shot login smoke test
  seed.js                     ← MAIN runner: creates expeditions + entries
  cover.js                    ← uploads expedition cover photos
  rename.js                   ← back-fill explorer-prefixed titles
  extract.js                  ← extract verbatim passages from a Gutenberg source
  merge.js                    ← merge extracted bodies + photos + intros into archive.json
  cleanup-duplicates.js       ← delete duplicate expeditions + reset state
  update-entries.js           ← refresh already-posted entries from archive.json

  extract-configs/
    endurance.json            ← per-expedition extraction config (source URL + anchors)
    ...

  expedition-data/
    endurance/
      entries.json            ← extracted body text (output of extract.js)
      photos.json             ← curated period photo URLs per entry
      intros.json             ← editorial intros per entry
    ...

  cache/                      ← downloaded source texts (gitignored)
  seed-state.json             ← gitignored runtime state (created records)
  .env                        ← gitignored credentials
```

---

## End-to-end workflow for adding a new expedition's archival content

Here's the full process to add Scott's Last Expedition (or any other)
once the Endurance pilot is happy. Each step is independently runnable.

### 0. Add the expedition skeleton to `archive.json` (one-time per expedition)

If the expedition isn't already in `archive.json`, add it under
`data.expeditions[]` with:
- `expedition.title`, `explorer`, `start_date`, `end_date`, `region`,
  `description`, `source_url`, `public_domain: true`
- `entries[]` with one object per planned journal entry: `title`, `date`,
  `coordinates: { lat, lng }`, `coordinates_note`, `body: "PLACEHOLDER..."`

The 16 expeditions in this archive were added by hand from primary sources.

### 1. Create the expedition on the live platform (one-time per expedition)

Run `seed.js` to create the expedition record on prod. Bodies are still
PLACEHOLDER at this stage so no entries are posted yet.

```sh
node seed.js
```

`seed.js` is idempotent — it skips any expedition already in
`seed-state.json`. After this step the expedition exists with the right
title prefix, dates, region, and visibility.

### 2. Upload the expedition cover photo (one-time per expedition)

Curate one public-domain image URL per expedition in `covers.json`
(format already established for the 16 historical expeditions). Then:

```sh
node cover.js
```

This downloads each Wikimedia source, uploads to S3 via `/v1/upload`,
and PUTs the resulting `*.amazonaws.com` URL onto the expedition's
`coverImage` field.

### 3. Build the extraction config

Create `extract-configs/<name>.json` (e.g. `scott.json`):

```jsonc
{
  "name": "scott",
  "expedition": "Scott's Last Expedition",
  "_source": "Project Gutenberg #11579 — Scott's Last Expedition Vol. I",
  "source": {
    "urls": [
      "https://www.gutenberg.org/cache/epub/11579/pg11579.txt",
      "https://www.gutenberg.org/files/11579/11579-0.txt"
    ],
    "cache": "pg11579.txt"
  },
  "entries": [
    {
      "title": "Cape Evans, First Winter",
      "date": "1911-04-23",
      "anchors": ["April 23\\b", "Cape Evans.*winter"]
    },
    {
      "title": "...",
      "date": "...",
      "anchors": ["..."]
    }
  ]
}
```

The `anchors` are case-insensitive regex strings. The extractor scans the
source text paragraph-by-paragraph and picks the first paragraph matching
ANY anchor, then expands forward to ~1100-1500 words from natural
paragraph boundaries. Anchors must be specific enough that they only match
the intended passage. **Use the most distinctive phrases from each
moment**, not just the date — date strings often appear in multiple places.

The `name` field becomes the directory under `expedition-data/`. The
`expedition` field must match the title in `archive.json` exactly.

### 4. Run extract.js and tune anchors

```sh
node extract.js scott
```

Output: `expedition-data/scott/entries.json` plus a SUMMARY table.
Each entry should be marked `✓` with 1100-1500 words. If any are
`⚠ short` (extractor stopped early at a chapter boundary) or
`✗ no body` (anchors didn't match), edit the anchors in the config and
re-run. Anchor tuning is the editorial step.

Each anchor pattern is a JS regex — `\\b` for word boundary, `\\s+` for
whitespace, alternation with `|`, etc.

### 5. Curate period photographs

Use Wikimedia Commons API or the Photographs_by_<photographer> category
pages to find public-domain images for each entry. Per-account limit is
**2 photos per entry** (non-Pro user); the seeder caps at 2.

Resolve each `File:Title.jpg` to a direct `upload.wikimedia.org` URL via:

```sh
curl -s "https://commons.wikimedia.org/w/api.php?action=query&titles=File:NAME&prop=imageinfo&iiprop=url|mime|size&format=json"
```

Strip the `?utm_*` query string from the returned URL, then write
`expedition-data/<name>/photos.json`:

```json
[
  {
    "title": "Cape Evans, First Winter",
    "photos": [
      {
        "url": "https://upload.wikimedia.org/wikipedia/commons/...jpg",
        "caption": "Short description.",
        "credit": "Photographer / Source"
      }
    ]
  }
]
```

Some entries have no photographic record (no camera survived, or
pre-photography era) — leave their `photos` array empty or omit them
entirely. The seeder posts text-only for those.

### 6. Write editorial intros

This is the SEO-critical step. The body is verbatim public-domain text
that exists on dozens of other sites. The editorial intro is **unique**
1-2 sentence content that frames the moment in the expedition arc — it
de-duplicates the page for Google and gives the entry editorial value
the source text doesn't have.

Write `expedition-data/<name>/intros.json`:

```json
{
  "_doc": "Editorial intros: 1-2 unique sentences framing each entry. Voice: neutral, factual, contextualizing — set the scene for the passage that follows.",
  "intros": {
    "Cape Evans, First Winter": "Five months after the Terra Nova landed at Cape Evans, the polar party settled into the long Antarctic winter. Scott's April 1911 entry records the routine that would carry the expedition through the dark months toward the depot-laying journeys of spring.",
    "...": "..."
  }
}
```

Voice guidelines:
- Neutral, factual, contextualizing — not literary, not promotional
- Set the stakes ("twenty-eight months after leaving England…") or the
  setting ("from Elephant Island the nearest help lay 800 miles away…")
- Avoid quoting the entry body itself; the body follows
- 1-3 sentences, ideally 50-120 words
- Each intro should be unique on the open web — don't paraphrase
  Wikipedia's lede

### 7. Merge into archive.json

```sh
node merge.js scott
```

Reads `expedition-data/scott/{entries,photos,intros}.json` and writes
the merged data into `archive.json` under the matching expedition.
Idempotent — run it again after editing intros and the archive updates
in place.

Verify with:

```sh
node validate.js
```

Should report `Ready to post: <N> entries across 16 expeditions` with
zero errors.

### 8. Run seed.js to post entries

```sh
node seed.js
```

For each entry that has a real (non-PLACEHOLDER) body and isn't already
in `seed-state.entries[]`:
- Pre-uploads up to 2 photos via `/v1/upload`
- POSTs `/v1/posts` with body, place, lat/lon, date, photos,
  `entryType: 'historical'`, and editorial intro via `metadata`
- Persists `entryId` + `uploadIds` to `seed-state.json` immediately

Pace: 600ms between API calls + 11s pause every 18 calls (under
all three default throttle buckets). 7s between photo uploads to stay
under the 10/min upload throttle.

### 9. Verify in the live UI

Visit `https://heimursaga.com/expedition/<id>` and confirm:
- Cover image renders
- Each entry shows 0-2 photos, the editorial intro above the date, and
  the verbatim Shackleton/Scott/etc. text below
- Entry detail page shows the dark-gray (navbar-black) HISTORICAL badge
- Entry detail page source includes `<script type="application/ld+json">`
  with Article + Person + Place + BreadcrumbList schemas

---

## Other scripts

### `auth-check.js` — verify credentials work

```sh
node auth-check.js
```

Logs in once and prints the token prefix. No writes. Run this first if
you're not sure the env is set up correctly.

### `rename.js` — apply explorer prefix to existing expedition titles

If you ever post expeditions under raw titles (e.g. before the
`<Explorer> - ` formatter was wired in), `rename.js` PUTs each existing
expedition with the prefixed title. Idempotent.

### `cleanup-duplicates.js` — delete duplicate expeditions

If a state-file mismatch ever causes `seed.js` to create duplicate
expeditions, this script soft-deletes anything in
`seed-state.expeditions` that lacks a `coverUrl`, plus any entries on
those duplicate expeditions, and prunes them from the state file. Re-run
`seed.js` after to repost entries onto the originals.

### `update-entries.js` — refresh already-posted entries from archive.json

After editing `archive.json` (e.g. fixing a body, adding an editorial
intro post-hoc, changing entry type), this script PUTs each
already-posted entry with the latest title, body, type, and metadata.
Useful when SEO/editorial improvements need to apply to entries that are
already live.

---

## Notification suppression — how it works

Two layers, both already wired:

1. **Expedition path.** `seed.js` omits the `status` field from the
   create payload. The API only fires `EXPEDITION_PUBLISHED` when
   `payload.status` is set and not `'draft'` (`expedition.service.ts:1932`).
   Saved status auto-derives from the historical end date.
2. **Entry path.** `ENTRY_CREATED` always fires for public, non-draft
   entries, but the user-facing listeners
   (`follower-notification.listener.ts:36`, `email.service.ts:175`)
   iterate followers / active sponsors and do nothing for empty lists.
   Verify the account has zero of each before running.

PostHog still logs `entry_created` analytics events
(`posthog.listener.ts:22`). This is internal metrics, not user-facing.

---

## SEO model — what makes the entries findable

- **JSON-LD on every entry detail page**: Article + Person + Place +
  ImageObject + BreadcrumbList. Person uses the historical figure's name
  (split from the prefixed title), not the platform username, so Google
  associates the page with the explorer's knowledge-graph entity.
- **JSON-LD on every expedition detail page**: Event + Person + Place +
  BreadcrumbList. Pre-1923 expeditions are flagged with
  `license: publicdomain/mark/1.0/` on images.
- **Historical title format**: `<Title>: <Explorer> on <Date> — Heimursaga`
  for entries with `entryType=historical`. Better long-tail matching for
  `<explorer> <date>` queries than the generic `entry by <username>` form.
- **Editorial intro**: rendered above the verbatim body. The unique
  content Google indexes — without it, pages risk being treated as
  duplicates of Project Gutenberg.
- **Cover photos served from `*.amazonaws.com`**: in the Next.js
  `remotePatterns` allow-list, so they actually render. Hotlinking
  Wikimedia would have failed silently in production.

---

## Field mapping reference

### Expedition (`POST /v1/trips`)

| archive.json | API field | Transform |
|---|---|---|
| `expedition.title` | `title` | `formatTitle(explorer, title)` → `Explorer - Title` |
| `expedition.description` | `description` | smart-truncate to 500 chars |
| `expedition.start_date` | `startDate` | passthrough |
| `expedition.end_date` | `endDate` | passthrough |
| `expedition.region` | `region` | passthrough |
| (constant) | `visibility` | `'public'` |
| (constant) | `public` | `true` |

`status` is **deliberately omitted** to suppress `EXPEDITION_PUBLISHED`.

### Entry (`POST /v1/posts`)

| archive.json | API field | Transform |
|---|---|---|
| `entry.title` | `title` | `formatTitle(explorer, title)` |
| `entry.body` | `content` | trim, ≤10,000 chars |
| `entry.coordinates.lat` | `lat` | passthrough |
| `entry.coordinates.lng` | `lon` | **rename `lng` → `lon`** |
| `entry.date` | `date` | passthrough |
| (derived) | `place` | first non-`approximate` segment of `coordinates_note`, fallback to `expedition.region` |
| (parent) | `expeditionId` | publicId returned from `POST /v1/trips` |
| `entry.editorialIntro` | `metadata.editorialIntro` | passthrough |
| `entry.photos[]` | `uploads[]` | each downloaded, re-uploaded to S3, IDs collected |
| `entry.photos[].caption` | `uploadCaptions[uploadId]` | per-photo |
| `entry.photos[].credit` | `uploadCredits[uploadId]` | per-photo |
| (constant) | `entryType` | `'historical'` |
| (constant) | `public` | `true` |
| (constant) | `visibility` | `'public'` |
| (constant) | `isDraft` | `false` |

Editorial-only archive fields dropped silently:
`source_chapter`, `coordinates_note`, `word_count`, `source_title`,
`source_author`, `source_url`, `source_url_vol2`, `target_entry_count`,
`explorer`, `nationality`, `dates`.

---

## Length limits (API-enforced)

| Field | Limit |
|---|---|
| Expedition `title` | 100 chars |
| Expedition `description` | **500 chars** (auto-truncated) |
| Entry `title` | **75 chars** (validator hard error) |
| Entry `content` | 10,000 chars (validator hard error) |
| Entry `place` | 250 chars |

The 75-char limit on entry titles is tight after the explorer prefix is
applied. Longest current entry: `Roald Amundsen - Through the Transantarctic Mountains` (53 chars).

---

## Idempotency model

Everything is keyed off `seed-state.json`:

```json
{
  "startedAt": "2026-05-05T...",
  "expeditions": [
    { "title": "Ernest Shackleton - The Endurance Expedition",
      "expeditionId": "abc123",
      "createdAt": "...",
      "coverUrl": "https://...amazonaws.com/...jpg" }
  ],
  "entries": [
    { "expeditionId": "abc123",
      "entryTitle": "Into the Weddell Sea",
      "entryId": "def456",
      "uploadIds": ["...", "..."] }
  ]
}
```

- Expeditions are matched by raw OR prefixed title — re-runs after a
  `rename.js` invocation still find them.
- Entries are keyed by `(expeditionId, entryTitle)` — the same entry title
  can repeat across expeditions (e.g. "The Start for the Pole" appears in
  both Scott's and Amundsen's), so we always scope to the parent.
- The state file is written after every successful create (atomic
  rename), so a network failure mid-run never causes duplicates.

To start over completely: delete `seed-state.json`, soft-delete all
records via the UI or API, and re-run `seed.js`.

---

## Common errors

| Symptom | Likely cause | Fix |
|---|---|---|
| `404 <html>...</html>` on login | Hit frontend instead of API | Set `HEIMURSAGA_BASE_URL=https://api.heimursaga.com` (note the `api.` subdomain) |
| `400 Bad Request` on login | Wrong field name | The body must be `{ login, password }` (the field is `login`, not `email`) |
| `400 Invalid entry type: historical` | API not yet redeployed | Deploy `apps/api` with the `'historical'` entry type before running |
| `401` mid-run | Token expired and refresh failed | Re-run; state file resumes |
| `429` | Throttled | Auto-retried with backoff; if persistent, increase `RATE_LIMIT_MS` in `config.js` |
| `Missing required env var` | `.env` not loaded | Confirm `tools/seeder/.env` exists with `ARCHIVE_EMAIL`, `ARCHIVE_PASSWORD`, `HEIMURSAGA_BASE_URL` |
| Duplicate expeditions appear | Earlier seed before a state-format change | Run `cleanup-duplicates.js`, then `seed.js` |
| `⚠ short` on extractor output | Anchor matched a brief mention before the real passage, then a chapter break stopped expansion | Tune anchors to a more specific phrase from the intended passage |
| `✗ no body` on extractor output | Anchors didn't match anything | Open the cached source text and find a unique phrase from the intended moment |

---

## Testing the full flow on a fresh expedition

1. Add the expedition skeleton to `archive.json` (one block under
   `data.expeditions[]`)
2. Add a cover URL entry to `covers.json`
3. `node seed.js` → expedition created (entries still PLACEHOLDER, none post)
4. `node cover.js` → cover image attached
5. Create `extract-configs/<name>.json` with `source.urls` and per-entry `anchors`
6. `node extract.js <name>` → tune anchors until all entries are `✓`
7. Curate `expedition-data/<name>/photos.json` (Wikimedia Commons API)
8. Write `expedition-data/<name>/intros.json` (1-2 sentences each)
9. `node merge.js <name>` → archive.json updated
10. `node validate.js` → confirm no errors
11. `node seed.js` → entries posted with photos + intros + historical type
12. Visit the expedition page in the live UI to verify

Estimated time per expedition: 30-60 minutes of editorial work
(curation + intros + anchor tuning), 1-2 minutes of script runtime.
