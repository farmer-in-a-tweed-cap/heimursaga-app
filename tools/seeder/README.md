# Heimursaga Historical Archive Seeder

Seeds the `explorersfromhistory` account with public-domain historical
expedition content from `archive.json`. All writes go through the live
Heimursaga API — no direct database access.

See `seeder-spec-v2.md` for the full design rationale.

## Prerequisites

- Node 18 or newer (uses built-in `fetch`, no npm install needed)
- The `explorersfromhistory` account already created in production via the
  signup UI. Email verification is **not** required.
- The account must have **zero followers** and **zero active monthly
  sponsors** at seed time. Both `ENTRY_CREATED` listeners iterate those
  lists; an empty list means no notifications fire. The seeder does not
  enforce this — verify before running.
- Credentials in `tools/seeder/.env`:

  ```
  HEIMURSAGA_BASE_URL=https://api.heimursaga.com
  ARCHIVE_EMAIL=heimursaga@gmail.com
  ARCHIVE_PASSWORD=...
  ```

  `.env` is gitignored. Note: `https://heimursaga.com` is the frontend;
  the API lives on the `api.` subdomain.

## Files

| File | Purpose |
|---|---|
| `archive.json` | Source data. Replace `PLACEHOLDER` bodies with real text before live runs. |
| `config.js` | Env loader, constants, length limits |
| `transform.js` | Field mapping, `derivePlace`, smart truncation |
| `validate.js` | Standalone validator (also called by `seed.js`) |
| `api.js` | HTTP client with JWT auth, refresh, retry/backoff |
| `state.js` | `seed-state.json` reader/writer (tracks created IDs for resume) |
| `auth-check.js` | One-shot login smoke test |
| `seed.js` | Main runner |

## Workflows

### Validate without posting

```sh
node validate.js
```

Prints the report and exits non-zero on hard errors. PLACEHOLDER entries
are warnings, not errors.

### Smoke-test auth

```sh
node auth-check.js
```

Logs in and prints the token prefix. No writes.

### Dry run (full flow, no API calls)

```sh
DRY_RUN=true node seed.js
```

Same validator run as above, then exits before any write would happen.

### Live seed

```sh
node seed.js
```

Steps:
1. Validate
2. Login via `POST /v1/auth/mobile/login`
3. For each expedition:
   - If already in `seed-state.json` → resume, don't recreate
   - Otherwise `POST /v1/trips` (without `status` field — see "Notification suppression" below)
   - Persist state immediately
   - For each entry:
     - Skip PLACEHOLDER
     - Skip if already in state
     - `POST /v1/posts`
     - Persist state immediately
4. Print summary

Pace: ~600ms between API calls; pause 11s after every 18 calls. Token
auto-refreshes when <10 min remain.

### Resume after a failure

Just re-run `node seed.js`. The state file (`seed-state.json`) tracks
every successful create. Already-created expeditions and entries are
skipped automatically.

### Start fresh

1. Delete `seed-state.json`
2. Manually delete the expeditions and entries via the UI or admin
   endpoints
3. Re-run

There is no API-side dedup; without the state file the seeder will
create duplicate expeditions on re-run.

### Filling in entry content

All entry bodies in `archive.json` start as `PLACEHOLDER` strings. To
land real content:

1. Edit the entry's `body` field in `archive.json` to plain-text content
   from the cited public-domain source
2. Aim for 200–1500 words (validator warns outside this range)
3. Hard ceiling: 10,000 characters (API limit)
4. Re-run `node seed.js` — only the newly-fillable entries will be
   posted; previously-created expeditions are skipped via state file

## Field mapping

### Expedition (`POST /v1/trips`)

| archive.json field | API field | Transform |
|---|---|---|
| `expedition.title` | `title` | trim |
| `expedition.description` | `description` | smart-truncate to 500 chars |
| `expedition.start_date` | `startDate` | passthrough |
| `expedition.end_date` | `endDate` | passthrough |
| `expedition.region` | `region` | passthrough |
| (constant) | `visibility` | `'public'` |
| (constant) | `public` | `true` |

`status` is **deliberately omitted** — see Notification suppression below.

### Entry (`POST /v1/posts`)

| archive.json field | API field | Transform |
|---|---|---|
| `entry.title` | `title` | trim, ≤75 chars |
| `entry.body` | `content` | trim, ≤10,000 chars |
| `entry.coordinates.lat` | `lat` | passthrough |
| `entry.coordinates.lng` | `lon` | **rename `lng` → `lon`** |
| `entry.date` | `date` | passthrough |
| (derived) | `place` | from `coordinates_note` (first segment, falls back to `expedition.region`) |
| (parent) | `expeditionId` | publicId returned from `POST /v1/trips` |
| (constant) | `entryType` | `'standard'` |
| (constant) | `public` | `true` |
| (constant) | `visibility` | `'public'` |
| (constant) | `isDraft` | `false` |

Editorial-only archive fields dropped silently: `explorer`,
`nationality`, `dates`, `source_title`, `source_author`, `source_url`,
`source_url_vol2`, `target_entry_count`, `coordinates_note`,
`source_chapter`, `word_count`.

## Notification suppression

Two layers, both already wired:

1. **Expedition path:** the seeder omits `status` from the create
   payload. `expedition.service.ts:1932` only fires the
   `EXPEDITION_PUBLISHED` event when `payload.status` is set and not
   `'draft'` — omitting it silences the event entirely. The saved
   status still auto-derives to `'completed'` from the historical
   end date.
2. **Entry path:** `ENTRY_CREATED` always fires for public, non-draft
   entries. The two listeners that produce user-facing output
   (`follower-notification.listener.ts:36` and `email.service.ts:175`)
   iterate followers / active sponsors and do nothing if those lists
   are empty. Verify the account has zero followers and zero active
   monthly sponsors before running.

PostHog still logs `entry_created` analytics per entry
(`posthog.listener.ts:22`). This is internal metrics, not a user-facing
notification.

## Token expiry mid-run

The JWT lasts 1 hour. The client refreshes proactively when <10 minutes
remain. If a refresh fails (e.g. refresh token revoked), the run aborts
— just re-run; the state file picks up where it left off.

## Throttle handling

Default global throttle (`apps/api/src/modules/app/app.module.ts`):

| Bucket | Limit |
|---|---|
| short  | 3 / second |
| medium | 20 / 10 seconds |
| long   | 100 / minute |

Seeder pace (600ms + batch pauses) stays under all three. On 429:
exponential backoff (5s, 15s, 45s) up to 3 retries.

## Common errors

| Symptom | Likely cause | Fix |
|---|---|---|
| `404 <html>...</html>` on login | Hit frontend instead of API | Ensure `HEIMURSAGA_BASE_URL=https://api.heimursaga.com` (with `api.` subdomain) |
| `400 Bad Request` on login | Wrong field name | Body must be `{ login, password }` (the field is `login`, not `email`) |
| `401` mid-run | Token expired and refresh failed | Re-run; state file resumes |
| `429` | Throttled | Auto-retried with backoff; if persistent, increase `RATE_LIMIT_MS` in `config.js` |
| `Missing required env var` | `.env` not loaded | Confirm `tools/seeder/.env` exists and contains `ARCHIVE_EMAIL`, `ARCHIVE_PASSWORD`, `HEIMURSAGA_BASE_URL` |
