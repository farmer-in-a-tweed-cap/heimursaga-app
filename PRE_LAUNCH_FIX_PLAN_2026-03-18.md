# Heimursaga — Pre-Launch Fix Plan

**Date:** March 18, 2026 | **Target Launch:** March 20, 2026
**Scope:** `apps/api` (NestJS), `apps/web-v2` (React/Next.js), mobile responsiveness (web)
**Companion:** See `PRE_LAUNCH_AUDIT_2026-03-18.md` for original findings

---

## How to Read This Document

Each finding includes:
- **File(s)** — exact path and line numbers
- **Fix** — the specific code change
- **Cross-deps** — other findings that interact with this fix
- **Notes** — implementation caveats

---

## CRITICAL (1–10)

### 1. PostHog key + GA ID committed to `.env.example`

**File:** `apps/web-v2/.env.example:29,32`
**Fix:** Replace real keys with placeholders:
```
NEXT_PUBLIC_GA_ID=G-XXXXXXXXX
NEXT_PUBLIC_POSTHOG_KEY=phc_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```
Then rotate the PostHog key in the PostHog dashboard (the old key is compromised via git history).
**Cross-deps:** None
**Notes:** Rotating the key means updating the production `.env` as well.

---

### 2. Sitemap dynamic pages completely broken

**File (API):** `apps/api/src/modules/app/app.service.ts:173-182`
**File (Web):** `apps/web-v2/src/app/sitemap.ts:34-65`

API returns `{ sources: [...] }` but frontend expects `{ expeditions, entries, users }`.

**Fix (Option A — match frontend to API):**
```typescript
// sitemap.ts — replace lines 34-65
if (data.sources) {
  for (const source of data.sources) {
    dynamicPages.push({
      url: source.loc,
      lastModified: new Date(source.lastmod),
      changeFrequency: source.changefreq,
      priority: source.priority,
    });
  }
}
```

**Fix (Option B — restructure API, better for SEO control):**
Restructure the API response to return `{ expeditions, entries, users }` with IDs and timestamps, then build URLs in `sitemap.ts` with proper `changeFrequency` per type.

**Cross-deps:** #96 (sitemap includes non-existent `/explorer-guidelines`)
**Notes:** Option A is fastest. Option B gives more control over per-type sitemap settings.

---

### 3. All pages client-rendered only (no SSR)

**File:** 96 files with `'use client'` across `apps/web-v2/src/app/`

**Fix:** This is architectural — full SSR migration is a post-launch project. For launch, focus on the highest-SEO-impact pages:
1. Expedition detail — add `generateMetadata()` in `app/expedition/[expeditionId]/page.tsx`
2. Explorer profile — add `generateMetadata()` in `app/journal/[username]/page.tsx`
3. Entry detail — add `generateMetadata()` in `app/entry/[entryId]/page.tsx`

These page route files can export metadata even if the rendered component is `'use client'`. This gives crawlers title/description/OG tags via server-rendered `<head>`.

**Cross-deps:** #4, #5, #21, #23, #24 (all SEO improvements)
**Notes:** Full SSR migration (removing `'use client'` from page components) is a larger effort for post-launch. The metadata approach gives 80% of the SEO benefit for 20% of the work.

---

### 4. Home page has no `<h1>` tag

**File:** `apps/web-v2/src/app/pages/HomePage.tsx:371-373`

**Current:** `<div>` with tagline text, `<h3>` for section headers.

**Fix:**
```tsx
<h1 className="tagline-spread text-[#e5e5e5] font-bold text-sm sm:text-base md:text-lg">
  EXPLORE · DISCOVER · SHARE · SPONSOR · INSPIRE
</h1>
```
Simply change the `<div>` to `<h1>`. Also change the `<h3>` section headers (lines 496, 543, 574) to `<h2>`.

**Cross-deps:** #24 (semantic landmarks)
**Notes:** Only one `<h1>` per page. Other pages should also get an `<h1>` — but home page is the priority.

---

### 5. No JSON-LD structured data anywhere

**File:** `apps/web-v2/src/app/layout.tsx` (add here for site-wide schema)

**Fix:** Add a `<script type="application/ld+json">` in root layout:
```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Heimursaga',
    url: 'https://heimursaga.com',
    description: 'Global expedition documentation and sponsorship platform',
  }) }}
/>
```
For expedition detail pages, add `@type: 'Article'` or `@type: 'Event'` structured data with title, author, datePublished, image.

**Cross-deps:** #3 (SSR/metadata), #23 (OG metadata)
**Notes:** JSON-LD is safe with `dangerouslySetInnerHTML` because we control the data. For dynamic pages, build the schema object from API data.

---

### 6. `raised` field stored as dollars in some paths, cents in others

**Files:**
- `apps/api/prisma/schema.prisma:386` — `raised Int? @default(0) // amount raised in cents`
- `apps/api/src/modules/sponsor/sponsor.service.ts:1169` — `integerToDecimal(checkout.total)` → writes **dollars**
- `apps/api/src/modules/stripe/stripe.service.ts:419` — `event.amount_paid / 100` → writes **dollars**
- `apps/api/src/modules/stripe/stripe.service.ts:454` — writes **dollars**
- `apps/api/src/modules/stripe/stripe.service.ts:888` — decrements by **dollars**
- `apps/api/src/modules/sponsor/sponsor.service.ts:3280` — `QUICK_SPONSOR_AMOUNT = 300` → writes **cents**

**Fix — standardize to cents (recommended for financial data):**
```typescript
// sponsor.service.ts:1169 — remove integerToDecimal, use raw cents
raised: { increment: checkout.total }, // already in cents

// stripe.service.ts:419 — use raw amount_paid (already cents from Stripe)
raised: { increment: event.amount_paid },

// stripe.service.ts:454 — same
raised: { increment: event.amount_paid },

// stripe.service.ts:888 — decrement in cents
raised: { decrement: event.amount_paid },

// sponsor.service.ts:3280 — QUICK_SPONSOR_AMOUNT already 300 cents ✓ (no change)
```

**Cross-deps:** #16 (floating-point), #49 (refund atomicity)
**Notes:** After fixing, existing data may be mixed. Consider a migration to correct existing records. The `integerToDecimal` calls at read time (for API responses) remain unchanged.

---

### 7. Waypoint creation has no ownership check

**File:** `apps/api/src/modules/map/map.service.ts:400-428`

**Fix:** Add ownership verification after finding the expedition:
```typescript
if (tripId) {
  expedition = await this.prisma.expedition.findFirst({
    where: { public_id: tripId, deleted_at: null },
    select: { id: true, author_id: true },
  });

  if (!expedition) {
    throw new ServiceBadRequestException('Expedition not found');
  }
  if (expedition.author_id !== userId) {
    throw new ServiceForbiddenException('You cannot add waypoints to expeditions you do not own');
  }
}
```

**Cross-deps:** #69 (waypoint query missing `deleted_at: null` — add it in the `where` clause above)
**Notes:** Import `ServiceForbiddenException` if not already imported.

---

### 8. Contact form injects unescaped user input into HTML email

**File:** `apps/api/src/modules/app/app.service.ts:234-261`

**Fix:** Add an `escapeHtml` utility and apply to all interpolated values:
```typescript
const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]!));

const escapeUrl = (url: string): string => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) return '#';
  return escapeHtml(url);
};
```
Then wrap every interpolated variable: `${escapeHtml(name)}`, `${escapeHtml(email)}`, `${escapeHtml(subject)}`, `${escapeHtml(message)}`, and `${escapeUrl(url)}` for href attributes.

**Cross-deps:** None
**Notes:** The `url` field needs both href sanitization (protocol check) and display escaping.

---

### 9. 17 places redirect to `/login` instead of `/auth`

**Files (all in `apps/web-v2/src/app/`):**
- `pages/HomePage.tsx:143,174,209`
- `pages/ExplorerProfilePage.tsx:93,135,166`
- `components/JournalGrid.tsx:46`
- `pages/EntriesPage.tsx:41`
- `components/ExplorerMap.tsx:134,162`
- `pages/ExpeditionsPage.tsx:41`
- `pages/ExplorersPage.tsx:43,76`
- `hooks/useExpeditionData.ts:61,83,100`
- `pages/JournalEntryPage.tsx:102`

**Fix:** Replace all `router.push('/login')` with `router.push('/auth')`. There's a redirect rule in `next.config.ts` that mitigates this, but direct routing is cleaner and avoids an extra HTTP redirect.

**Cross-deps:** #10 (query param standardization)
**Notes:** When changing these, also ensure they pass `?redirect=${currentPath}` (not `?from=`). Combine with fix #10.

---

### 10. `?from=` redirect param is never read

**File:** `apps/web-v2/src/app/pages/AuthPage.tsx:20-28`

AuthPage reads `searchParams.get('redirect')` but some pages pass `?from=`.

**Fix (two parts):**
1. **AuthPage** — add fallback: `const redirect = searchParams.get('redirect') || searchParams.get('from');`
2. **All pages** — standardize to `?redirect=` going forward (combine with fix #9)

**Cross-deps:** #9 (login redirects)
**Notes:** The `getSafeRedirect` function in AuthPage already validates same-origin paths, so adding `from` fallback is safe.

---

## HIGH (11–33)

### 11. Legacy password hash path (empty salt, 1,000 iterations)

**File:** `apps/api/src/lib/utils.ts:79-90`

**Fix:** On successful legacy login, re-hash with the modern format and update the DB:
```typescript
// After legacy hash matches:
const newHash = hashPassword(password); // uses 100,000 iterations + random salt
await prisma.explorer.update({ where: { id: user.id }, data: { password: newHash } });
```
This transparently migrates users. After sufficient time, remove the legacy path entirely.

**Cross-deps:** None

---

### 12. CSRF retry logic fires on 401

**File:** `apps/web-v2/src/app/services/api.ts:141-151`

**Fix:** Only retry on 403, not 401:
```typescript
if (response.status === 403 && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
  // CSRF token expired — refresh and retry
}
if (response.status === 401) {
  // Session expired — redirect to login, don't retry
  csrfToken = null;
}
```

**Cross-deps:** None

---

### 13. Upload endpoint has no rate limiting

**File:** `apps/api/src/modules/upload/upload.controller.ts:26-48`

**Fix:** Add `@Throttle({ default: { limit: 10, ttl: 60000 } })` to the upload method.

**Cross-deps:** #31 (global ThrottlerGuard). If #31 is fixed first, uploads get the global default rate. This decorator adds a tighter per-endpoint limit.

---

### 14. Apple IAP uses deprecated `verifyReceipt` API

**File:** `apps/api/src/modules/payment/payment.service.ts:2072-2135`

**Fix:** Migrate to App Store Server API v2 (`api.storekit.itunes.apple.com`). This is a significant change requiring JWT-based auth with Apple. Mark as post-launch if IAP isn't live yet.

**Cross-deps:** #15 (receipt ownership), #52 (renewal handling)
**Notes:** If IAP is not currently live, defer to post-launch sprint.

---

### 15. IAP flow does not validate receipt ownership

**File:** `apps/api/src/modules/payment/payment.service.ts:1910-1950`

**Fix:** After receipt validation, verify `bundle_id` matches app bundle ID and associate `original_transaction_id` with the user to prevent replay across accounts.

**Cross-deps:** #14 (deprecated API)

---

### 16. Floating-point arithmetic on `raised` column

**File:** `apps/api/prisma/schema.prisma:386`

**Status:** The column is `Int` (good). The real issue is #6 (mixed cents/dollars). Once #6 is fixed (all writes in cents), this is resolved — integer arithmetic has no floating-point issues.

**Cross-deps:** #6 (this is the same root cause)

---

### 17. `signupAndLogin` swallows login failures

**File:** `apps/api/src/modules/auth/auth.service.ts:607-632`

**Fix:** Remove the `.catch(() => {})` on line ~620:
```typescript
const login = await this.login({
  query: {},
  payload: { login: signup.email, password: signup.password },
});
// Let errors bubble up naturally
```

**Cross-deps:** None

---

### 18. Email endpoint with hardcoded hash is publicly accessible

**File:** `apps/api/src/modules/email/email.controller.ts:21-42`

**Fix:** Remove the endpoint entirely, or protect it with `@UseGuards(AuthGuard)` and an admin role check. The hardcoded SHA1 hash URL is security by obscurity.

**Cross-deps:** #100 (POST /test endpoint — same category of cleanup)

---

### 19. Password `@MaxLength` missing on DTOs

**File:** `apps/api/src/modules/auth/auth.dto.ts:36-61` (SignupDto), `:85-100` (PasswordUpdateDto)

**Fix:** Add `@MaxLength(128)` to password fields in both DTOs.

**Cross-deps:** None

---

### 20. No expired session cleanup cron

**File:** Add to existing cron service or create new scheduled task.

**Fix:**
```typescript
@Cron('0 2 * * *') // 2 AM daily
async cleanupExpiredSessions() {
  await this.prisma.explorerSession.deleteMany({
    where: { OR: [
      { expires_at: { lt: new Date() } },
      { expired: true },
    ]},
  });
}
```

**Cross-deps:** #43 (ProcessedWebhookEvent cleanup — add to same cron)

---

### 21. No canonical URLs on any page

**File:** `apps/web-v2/src/app/layout.tsx:24-72`

**Fix:** Add `metadataBase` and `alternates.canonical` to root layout metadata:
```typescript
export const metadata = {
  metadataBase: new URL('https://heimursaga.com'),
  alternates: { canonical: '/' },
  // ...existing metadata
};
```
Dynamic pages should override with their specific canonical URL in `generateMetadata()`.

**Cross-deps:** #3 (SSR/metadata), #23 (OG metadata)

---

### 22. Image optimization disabled globally

**File:** `apps/web-v2/next.config.ts:8-9`

**Fix:** Remove `unoptimized: true`. The existing `remotePatterns` config should handle S3 images. Test image loading after removing.

**Cross-deps:** #106 (entry photo sizing)
**Notes:** May need to verify S3 bucket allows Next.js image optimization requests.

---

### 23. Incomplete OG metadata + no Twitter cards

**File:** `apps/web-v2/src/app/layout.tsx` (static OG only)

**Fix:** Add `generateMetadata()` exports in dynamic page route files:
- `app/expedition/[expeditionId]/page.tsx`
- `app/journal/[username]/page.tsx`
- `app/entry/[entryId]/page.tsx`

Include `openGraph` and `twitter` fields with dynamic title, description, and image.

**Cross-deps:** #3, #21

---

### 24. No semantic HTML landmarks

**Fix:** In key page components, wrap content in `<main>`, use `<article>` for content items, `<section>` for page sections. Start with:
- Layout: wrap `{children}` in `<main>`
- ExpeditionDetailPage: `<article>` wrapper
- JournalEntryPage: `<article>` wrapper
- HomePage: `<section>` for each content area

**Cross-deps:** #4 (heading hierarchy)

---

### 25. Mapbox token not URL-restricted

**Fix:** In Mapbox dashboard, restrict the token to `heimursaga.com` and `*.heimursaga.com` domains. This is a configuration change, not a code change.

**Cross-deps:** None

---

### 26. Sentry DSN empty

**File:** `apps/api/.env.example:41`

**Fix:** Create a Sentry project and populate `SENTRY_DSN` in production environment. Initialize Sentry in the API bootstrap (`main.ts`).

**Cross-deps:** None

---

### 27. Stripe keys are test mode

**File:** `apps/web-v2/.env.example:20`

**Fix:** Ensure production `.env` uses `pk_live_*` and `sk_live_*` keys. The `.env.example` showing `pk_test_*` is fine — it's a template.

**Cross-deps:** None
**Notes:** Verify webhook signing secret is also the live-mode secret.

---

### 28. Expedition delete bypasses sponsorship handling

**File:** `apps/api/src/modules/expedition/expedition.service.ts:1598-1628`

**Fix:** Add the same event emission that `cancelExpedition` has:
```typescript
// After soft-deleting the expedition:
this.eventService.trigger({
  event: EVENTS.EXPEDITION_CANCELLED,
  data: {
    expeditionPublicId: expedition.public_id,
    expeditionTitle: expedition.title,
    explorerId: expedition.author_id,
    cancellationReason: 'Expedition deleted by author',
  },
});
```

**Cross-deps:** None
**Notes:** The event handler should cancel active sponsorship subscriptions and notify sponsors.

---

### 29. Search returns soft-deleted entries and blocked users

**File:** `apps/api/src/modules/search/search.service.ts:40-63` (users), `:69-117` (entries)

**Fix:** Add filters:
```typescript
// Users query
where: { username: { contains: searchTerm, mode: 'insensitive' }, blocked: false }

// Entries query — add to AND array
{ deleted_at: null },
```

**Cross-deps:** #30 (also add `is_draft` filter)

---

### 30. Search returns draft entries

**File:** `apps/api/src/modules/search/search.service.ts:69-117`

**Fix:** Add to the entries WHERE clause:
```typescript
{ is_draft: { not: true } }
```

**Cross-deps:** #29 (combine with deleted_at filter)

---

### 31. ThrottlerGuard not registered globally

**File:** `apps/api/src/modules/app/app.module.ts:35-59`

**Fix:** Add to providers array:
```typescript
providers: [
  AppService,
  { provide: APP_GUARD, useClass: ThrottlerGuard },
],
```
Import `APP_GUARD` from `@nestjs/core` and `ThrottlerGuard` from `@nestjs/throttler`.

**Cross-deps:** #13 (upload rate limiting — per-endpoint override still useful), #81 (payout rate limiting)
**Notes:** Endpoints that should bypass throttling (webhooks) need `@SkipThrottle()`. The Stripe webhook controller likely needs this.

---

### 32. SponsorshipTier `onDelete: Cascade`

**File:** `apps/api/prisma/schema.prisma` — SponsorshipTier model

The `explorer` relation has `onDelete: Cascade`, meaning deleting an Explorer cascades to delete all their SponsorshipTiers, which then cascades to delete Sponsorship records — destroying financial audit trail.

**Fix:** Change to `onDelete: Restrict`:
```prisma
explorer Explorer @relation(fields: [explorer_id], references: [id], onDelete: Restrict)
```
This prevents accidental deletion of explorers who have sponsorship tiers. Use soft-delete for explorers instead.

**Cross-deps:** None
**Notes:** Requires Prisma migration. Test that explorer deletion flow uses soft-delete.

---

### 33. No S3 cleanup on deletion

**Fix:** Add `DeleteObjectCommand` calls when:
- An entry is deleted (remove its photos)
- An expedition is deleted (remove cover image)
- An upload record is directly deleted

```typescript
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

async deleteUpload(s3Key: string) {
  await this.s3.send(new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: s3Key,
  }));
}
```

**Cross-deps:** None
**Notes:** Consider a background job rather than synchronous deletion. Mark as post-launch if cleanup backlog isn't urgent.

---

## MEDIUM (34–72)

### 34. `coverImage` DTO accepts arbitrary strings

**File:** `apps/api/src/modules/expedition/expedition.dto.ts:72,165`
**Fix:** Add `@IsUrl()` or `@Matches(/^https?:\/\//)` to `coverImage` fields.

### 35. `status` field is free-form string

**File:** `apps/api/src/modules/expedition/expedition.dto.ts:57,150`
**Fix:** Add `@IsIn(['draft', 'planned', 'active', 'completed', 'cancelled'])`.

### 36. reCAPTCHA silently bypassed when token missing

**File:** `apps/api/src/modules/recaptcha/recaptcha.service.ts:38-40`
**Fix:** Throw `ServiceBadRequestException('reCAPTCHA token required')` instead of returning false silently. When secret key is missing, return `false` not `true`.

### 37. Admin role from stale session

**File:** `apps/api/src/modules/admin/admin.service.ts:34-44`
**Fix:** Re-query DB for current admin status: `const explorer = await this.prisma.explorer.findUnique({ where: { id: session.userId }, select: { admin: true } })`.

### 38. `metadata` JSON has no size cap

**File:** `apps/api/src/modules/entry/entry.dto.ts:136,243`
**Fix:** Add custom validator: `@ValidateIf((o) => JSON.stringify(o.metadata).length <= 10000)` or a custom `@MaxJsonSize(10000)` decorator.

### 39. Controller bypasses service layer

**File:** `apps/api/src/modules/expedition/expedition.controller.ts:51`
**Fix:** Move the `(this.expeditionService as any).prisma` call into a proper service method.

### 40. Comment count not in transactions

**File:** `apps/api/src/modules/comment/comment.service.ts:295-300`
**Fix:** Wrap comment creation + count increment in `prisma.$transaction()`.

### 41. `unblockExplorer` doesn't restore content

**File:** `apps/api/src/modules/admin/admin.service.ts:364-390`
**Fix:** Add `await this.prisma.entry.updateMany({ where: { author_id: explorer.id, deleted_at: { not: null } }, data: { deleted_at: null } })` for entries and expeditions.
**Notes:** Consider storing `blocked_at` timestamp so only content deleted during block is restored, not previously self-deleted content.

### 42. `Expedition.public_id` lacks `@unique`

**File:** `apps/api/prisma/schema.prisma:361`
**Fix:** Add `@unique` to `public_id`: `public_id String? @unique @db.VarChar(14)`.
**Notes:** Requires Prisma migration. Verify no duplicate public_ids exist first.

### 43. No ProcessedWebhookEvent cleanup

**Fix:** Add to the session cleanup cron (#20):
```typescript
await this.prisma.processedWebhookEvent.deleteMany({
  where: { created_at: { lt: thirtyDaysAgo } },
});
```

### 44. Sponsorship tier price no validation

**File:** `apps/api/src/modules/sponsor/sponsor.dto.ts:189,217`
**Fix:** Add `@Min(100) @Max(99999900)` (cents — $1 to $999,999).

### 45. Missing `deleted_at` filter in payout method check

**File:** `apps/api/src/modules/payout/payout.service.ts:326-327`
**Fix:** Add `deleted_at: null` to the `findFirst` where clause.

### 46. Console.log in MessageController

**File:** `apps/api/src/modules/message/message.controller.ts:30,70`
**Fix:** Remove both `console.log` statements. Replace with `this.logger.debug()` if needed.
**Cross-deps:** #99 (same finding, duplicate in audit)

### 47. Missing dispute webhook events

**File:** `apps/api/src/modules/stripe/stripe.service.ts:119-153`
**Fix:** Add cases for `'charge.dispute.updated'`, `'charge.dispute.closed'`, `'charge.dispute.funds_withdrawn'`.

### 48. No `customer.subscription.created` handler

**File:** `apps/api/src/modules/stripe/stripe.service.ts:141-146`
**Fix:** Add `case 'customer.subscription.created':` with handler to record new subscription start.

### 49. Non-atomic raised amount during refunds

**File:** `apps/api/src/modules/sponsor/sponsor.service.ts:2440-2506`
**Fix:** Wrap refund + raised decrement in `prisma.$transaction()`.
**Cross-deps:** #6 (cents standardization — ensure refund amounts are in the same unit)

### 50. `sponsors_count` manually managed

**File:** `apps/api/prisma/schema.prisma:389`
**Fix:** Long-term: compute via `prisma.sponsorship.count()` at query time. Short-term: ensure all increment/decrement paths are in transactions. This is a medium-term refactor.

### 51. Stripe API calls inside Prisma transactions

**Fix:** Audit all `$transaction` blocks. Move Stripe API calls (charges, refunds, account lookups) outside the transaction. Execute Stripe call first, then wrap only DB updates in the transaction.

### 52. IAP subscription renewal not handled

**Fix:** Implement App Store Server Notifications v2 webhook endpoint. Defer to post-launch if IAP isn't live.
**Cross-deps:** #14, #15

### 53. Nav links uppercase without letter-spacing

**File:** `apps/web-v2/src/app/components/Header.tsx`, `Footer.tsx`
**Fix:** Add `tracking-[0.14em]` (Tailwind for letter-spacing) wherever `uppercase` class is used on Jost text.
**Cross-deps:** Brand typography spec requires min 0.14em letter-spacing on uppercase Jost text.

### 54. `--destructive` uses wrong color

**File:** `apps/web-v2/src/styles/theme.css:55,117`
**Fix:** Change `--destructive: #d4183d;` to `--destructive: #994040;` in both light and dark themes.

### 55. Generic Tailwind colors instead of brand

**Files:** `ExpeditionNotes.tsx:253,373,422,545`, `JournalEntryPage.tsx:1013,1120+`, and ~8 other files
**Fix:** Replace `text-red-500` with `text-destructive`, `text-green-500` with `text-[#598636]` (brand green).

### 56. Unicode emoji instead of Lucide icons

**Fix:** Search for emoji characters in JSX and replace with appropriate Lucide icon components.

### 57. Mapbox CSS imported globally

**File:** `apps/web-v2/src/app/layout.tsx:6`
**Fix:** Remove global Mapbox CSS import. Import `mapbox-gl/dist/mapbox-gl.css` locally in each map component instead.
**Notes:** Test that maps still render correctly.

### 58. Expedition publish not atomic

**File:** `apps/api/src/modules/expedition/expedition.service.ts:2308-2398`
**Fix:** Wrap all DB operations in `prisma.$transaction()`.

### 59. Missing indexes on FK columns

**File:** `apps/api/prisma/schema.prisma`
**Fix:** Add `@@index` for: `Sponsorship.expedition_public_id`, `ExplorerNotification.explorer_id`, `Waypoint.author_id`, `ExpeditionNote.expedition_id`, `SponsorshipTier.explorer_id`, `Upload.explorer_id`, `Payout.explorer_id`, `Checkout.explorer_id`.
**Notes:** Requires Prisma migration. Combine with other schema changes (#42, #71, #72).

### 60. `blockExplorer` doesn't soft-delete comments

**File:** `apps/api/src/modules/admin/admin.service.ts:318-361`
**Fix:** Add: `await this.prisma.comment.updateMany({ where: { author_id: explorer.id }, data: { deleted_at: dateformat().toDate() } })`.
**Cross-deps:** #41 (unblock should restore comments)

### 61. Error response format inconsistent

**Fix:** Standardize via a global exception filter that normalizes all error responses to `{ statusCode, message, error }`.

### 62. No Pino log redaction

**Fix:** Configure Pino with `redact: { paths: ['req.headers.authorization', '*.password', '*.email'], remove: true }`.

### 63. Sponsorship list hardcodes `take: 50`

**File:** `apps/api/src/modules/sponsor/sponsor.service.ts:1958,2116`
**Fix:** Accept `limit` and `skip` query parameters. Cap `limit` at 100.

### 64. `getNoteCount` not marked `@Public()`

**File:** `apps/api/src/modules/expedition-note/expedition-note.controller.ts:45-50`
**Fix:** Add `@Public()` decorator.

### 65. Admin page has no ProtectedRoute wrapper

**File:** `apps/web-v2/src/app/pages/AdminDashboardPage.tsx:51-53`
**Fix:** Add auth check that redirects non-admin users immediately. Wrap in `ProtectedRoute` or add early return.

### 66. InteractionButtons bookmark state stale

**Fix:** Sync state with prop using `useEffect`:
```tsx
useEffect(() => { setBookmarked(isBookmarked); }, [isBookmarked]);
```
Or use the prop directly with optimistic updates.

### 67. No client-side username validation

**Fix:** Add validation before submit: length 3-50, alphanumeric + underscore only, no spaces.

### 68. Forms missing `maxLength`

**Fix:** Add `maxLength` HTML attribute to: expedition title (200), quick entry content (10000), profile bio (500), contact form message (5000).

### 69. Waypoint query missing `deleted_at: null`

**Cross-deps:** #7 (fixed together — add `deleted_at: null` to expedition lookup in waypoint creation)

### 70. Session revoke accepts unvalidated ID

**File:** `apps/api/src/modules/explorer/explorer.controller.ts:382-389`
**Fix:** Add `@IsInt()` validation via `ParseIntPipe` on the ID parameter. The service already checks ownership.

### 71. String columns should be Prisma enums

**File:** `apps/api/prisma/schema.prisma`
**Fix:** Create enums: `UserRole`, `ExpeditionStatus`, `ExpeditionVisibility`, `EntryType`, `EntryVisibility`, `SponsorshipStatus`, `SponsorshipType`, `CheckoutStatus`. Apply to respective columns.
**Notes:** Major migration. Combine with #59, #72. Test all queries that reference these columns.

### 72. Nullable columns with defaults

**File:** `apps/api/prisma/schema.prisma`
**Fix:** Remove `?` from columns that have `@default`: e.g., `bookmarks_count Int @default(0)` instead of `Int? @default(0)`.
**Notes:** Requires data migration to set NULL values to defaults first.

---

## LOW (73–112)

| # | File | Fix |
|---|------|-----|
| 73 | `apps/api/src/modules/auth/auth.controller.ts` | Use constant-time comparison for token validation |
| 74 | `apps/api/src/app.ts:76` | Add startup check that `SESSION_SECRET` is valid hex |
| 75 | `apps/api/src/common/guards/bot-detection.guard.ts:105` | Remove `x-requested-with` from suspicious headers list |
| 76 | `apps/api/src/modules/app/app.module.ts:68` | Conditionally import DevModule: `...(process.env.NODE_ENV !== 'production' ? [DevModule] : [])` |
| 77 | `apps/web-v2/package.json:10` | Fix 24 lint warnings or change `--max-warnings` threshold |
| 78 | `apps/api/src/modules/comment/comment.dto.ts:32` | Add `@Type(() => Number)` to `limit` field |
| 79 | `apps/api/src/modules/entry/entry.dto.ts` | Already compliant — fields have `@IsOptional()`. No fix needed |
| 80 | `apps/api/prisma/schema.prisma` | Add `@@index([author_id])` to Waypoint, `@@index([expedition_id])` to ExpeditionNote. Combine with #59 |
| 81 | `apps/api/src/modules/payout/payout.controller.ts:97` | Add `@Throttle({ default: { limit: 5, ttl: 3600000 } })`. Covered by #31 if global throttle is added |
| 82 | Payment service | Remove hardcoded $5.00 payment intent in legacy code |
| 83 | Sponsor service | Add admin refund endpoint. Post-launch feature |
| 84 | Frontend types | Remove `stripeAccountId` from client-facing types if not needed |
| 85 | `apps/web-v2/package.json:69` | Remove `react-map-gl` if unused |
| 86 | S3/upload config | Add CloudFront CDN. Infrastructure change, post-launch |
| 87 | `apps/web-v2/src/lib/posthog.ts` | Add GDPR consent banner before initializing analytics |
| 88 | Analytics setup | Document business justification for dual analytics or consolidate |
| 89 | Multiple files | Audit hex colors and replace with brand palette variables |
| 90 | `NotFoundPage.tsx`, `SponsorshipsAdminPage.tsx` | Add `focus-visible:ring-2 focus-visible:ring-offset-2` to buttons |
| 91 | `MessagesPage.tsx:143,198` | Change `alt=""` to descriptive alt text: `alt={user.username}` |
| 92 | `apps/web-v2/src/app/components/Header_backup.tsx` | Delete this dead file |
| 93 | `ExplorerProfilePage.tsx` | Replace TODO/mock data with real API values |
| 94 | About/Expeditions/Explorers page files | Add page-specific `openGraph` to metadata exports |
| 95 | Legal/Terms/Privacy pages | Add `description` to metadata |
| 96 | `apps/api/src/modules/app/app.service.ts:74` | Remove `/explorer-guidelines` from sitemap or create the page |
| 97 | `apps/web-v2/public/` | Create `manifest.json` with app name, icons, theme color |
| 98 | Heavy components | Use `next/dynamic` for map components, modals, admin pages |
| 99 | `message.controller.ts:30,70` | Same as #46 — remove console.log |
| 100 | `apps/api/src/modules/app/app.service.ts:37-42` | Remove test endpoint or gate behind `NODE_ENV === 'development'` |
| 101 | `apps/api/src/modules/email/email.service.ts:60-63` | Re-throw email errors or log at error level instead of silently catching |
| 102 | `apps/api/src/common/email-templates.ts` | Add missing templates (cancellation, completion, follower, comment). Post-launch |
| 103 | Entire API | Add Redis caching for hot paths. Post-launch infrastructure |
| 104 | API middleware | Add request ID middleware (UUID per request). Post-launch |
| 105 | `apps/api/src/modules/entry/entry.service.ts:108-121` | Add `limit`/`offset` params to drafts query |
| 106 | `JournalEntryPage.tsx:714,820` | Replace `width={0} height={0}` with proper `sizes` and explicit dimensions |
| 107 | `JournalEntryPage.tsx:720,826` | Add `onError` handler with fallback image |
| 108 | `apps/web-v2/src/app/` | Create `error.tsx` files in key route directories |
| 109 | `InteractionButtons.tsx:52-68` | Increase padding to ensure 44px minimum touch target |
| 110 | `apps/api/package.json:60` | Consider replacing `express-recaptcha` with maintained alternative |
| 111 | Global CSS | Add `overflow-x: hidden` to `html, body` |
| 112 | Stripe service | Add circuit breaker (e.g., `opossum` library). Post-launch |

---

## MOBILE RESPONSIVENESS — WEB APP (113–130)

### Critical

#### 113. Header icon buttons below 44px touch target

**File:** `apps/web-v2/src/app/components/Header.tsx:359,382`
**Current:** `w-[31px] h-[31px]` (notifications + settings buttons)
**Fix:** Change to `w-11 h-11` (44x44px) on mobile, can keep `lg:w-[31px] lg:h-[31px]` for desktop.

### High

#### 114. Notifications dropdown overflows on mobile

**File:** `apps/web-v2/src/app/components/NotificationsDropdown.tsx:171`
**Current:** Fixed `w-96` (384px)
**Fix:** Change to `w-96 max-w-[calc(100vw-1rem)]` and add `max-h-[calc(100vh-120px)] overflow-y-auto`.

#### 115. NotificationDropdownDemo same overflow issue

**File:** `apps/web-v2/src/app/components/NotificationDropdownDemo.tsx:118`
**Fix:** Same as #114: add `max-w-[calc(100vw-1rem)]`.

#### 116. Explorer map popups can't scroll on mobile

**File:** `apps/web-v2/src/app/components/ExplorerExpeditionsMap.tsx:529`
**Current:** `w-96 max-w-[calc(100%-2rem)]` with no scroll constraint
**Fix:** Add `max-h-[calc(100vh-100px)] overflow-y-auto`.

### Medium

#### 117. User dropdown overflows on small phones

**File:** `apps/web-v2/src/app/components/UserDropdown.tsx:32`
**Current:** `min-w-[300px]`
**Fix:** Change to `min-w-[250px] md:min-w-[300px] max-w-[calc(100vw-1rem)]`.

#### 118. Grid gaps too large on mobile

**File:** `apps/web-v2/src/app/pages/HomePage.tsx:498,551,582`
**Current:** `gap-6` (24px)
**Fix:** Change to `gap-3 md:gap-4 lg:gap-6` for progressive spacing.

#### 119. Nav tab touch targets too small

**File:** `apps/web-v2/src/app/components/Header.tsx:213-319`
**Current:** `px-2` horizontal padding
**Fix:** Change to `px-3 md:px-4` and add `min-h-[44px]`.

#### 120. Filter buttons cramped on 320px screens

**File:** `apps/web-v2/src/app/pages/EntriesPage.tsx:213`
**Fix:** Reduce gap: `gap-1.5 md:gap-3`.

#### 121. About page table hidden on mobile with no alternative

**File:** `apps/web-v2/src/app/pages/AboutPage.tsx:344`
**Current:** `hidden md:table` — mobile users see nothing
**Fix:** Add mobile card layout with `md:hidden` above the table.

#### 122. Admin tables not responsive

**File:** `apps/web-v2/src/app/pages/AdminDashboardPage.tsx:699,832,977`
**Fix:** Add `hidden sm:table-cell` on non-essential columns for mobile.

### Low

#### 123. Container padding excessive on 320px screens

**Files:** Multiple pages with `px-6`
**Fix:** Change to `px-4 sm:px-6` for tighter mobile padding.

#### 124. Text size progression could be smoother

**File:** `apps/web-v2/src/app/pages/HomePage.tsx:371`
**Fix:** Consider `text-xs sm:text-sm md:text-base lg:text-lg` instead of `text-sm sm:text-base md:text-lg`.

#### 125. Map popup positioning static on mobile

**File:** `apps/web-v2/src/app/components/ExplorerMap.tsx:741`
**Fix:** Use viewport-aware positioning: `bottom-16 sm:bottom-20 md:bottom-24`.

#### 126. Share menu min-width could overflow

**File:** `apps/web-v2/src/app/components/InteractionButtons.tsx:145`
**Current:** `min-w-[200px]`
**Fix:** Add `max-w-[calc(100vw-2rem)]`.

#### 127. Unused custom Tailwind breakpoints

**File:** `packages/ui/tailwind.config.js:19-22`
**Current:** `desktop: '760px', mobile: '760px'` — never used
**Fix:** Remove unused custom breakpoints.

#### 128. Mobile button padding on homepage hero

**File:** `apps/web-v2/src/app/pages/HomePage.tsx:384-390`
**Fix:** Add `min-h-[44px]` for 44px minimum touch target.

---

## Cross-Dependency Matrix

| Fix | Depends On / Conflicts With | Notes |
|-----|---------------------------|-------|
| #6 (raised cents) | #16 (float arithmetic), #49 (refund atomicity) | Fix #6 first, #16 resolves automatically |
| #7 (waypoint auth) | #69 (deleted_at filter) | Combine into single fix |
| #9 (/login → /auth) | #10 (?from= → ?redirect=) | Fix together in one pass |
| #13 (upload throttle) | #31 (global ThrottlerGuard) | Fix #31 first, then add per-endpoint overrides |
| #14 (IAP deprecated) | #15 (receipt ownership), #52 (renewal) | All IAP fixes together |
| #20 (session cleanup) | #43 (webhook cleanup) | Combine into single cron job |
| #29 (search deleted) | #30 (search drafts) | Same file, combine fixes |
| #31 (global throttle) | #13, #81, Stripe webhooks | Must add `@SkipThrottle()` to webhook controller |
| #41 (unblock restore) | #60 (block comments) | Must be symmetrical |
| #42 (public_id unique) | #59 (indexes), #71 (enums), #72 (nullable) | Combine into single Prisma migration |
| #46 (console.log) | #99 (duplicate finding) | Same fix |
| #53 (letter-spacing) | Brand typography spec | Apply wherever `uppercase` + Jost font |
| #54 (destructive color) | #55 (generic colors) | Fix #54 first, then #55 uses `text-destructive` |

---

## Implementation Priority

### Day 1 (Before Launch)

**Security — must fix:**
- #1 (rotate PostHog key)
- #7 (waypoint ownership check)
- #8 (HTML escape contact form)
- #18 (remove public email endpoint)
- #31 (global ThrottlerGuard)

**Data integrity — must fix:**
- #6 (raised field cents standardization)
- #29 + #30 (search filters)
- #28 (expedition delete sponsorship handling)

**Frontend — must fix:**
- #9 + #10 (login redirect + query param)
- #4 (home page h1)

**Config:**
- #25 (Mapbox token URL restriction)
- #26 (Sentry DSN)
- #27 (Stripe live keys)

### Day 2 (Launch Day)

- #2 (sitemap fix)
- #17 (signupAndLogin error handling)
- #19 (password MaxLength)
- #11 (legacy password migration)
- #12 (CSRF retry only on 403)
- #13 (upload rate limiting)
- #113 (header touch targets)
- #114-115 (dropdown overflow)

### Week 1

- #3 + #21 + #23 (SSR metadata for key pages)
- #5 (JSON-LD)
- #20 + #43 (cleanup crons)
- #32 (cascade behavior)
- #22 (image optimization)
- #24 (semantic HTML)
- #33 (S3 cleanup)
- #35 (status enum validation)
- #53 + #54 + #55 (brand compliance)

### Post-Launch Sprint

- #14 + #15 + #52 (IAP migration)
- #42 + #59 + #71 + #72 (Prisma schema migration)
- #57 (Mapbox CSS lazy loading)
- #86 (CDN)
- #87 (GDPR consent)
- #103 (Redis caching)
- Mobile responsiveness improvements (#117-128)
- Remaining medium + low items

---

**Total findings: 128** (10 critical, 23 high, 39 medium, 40 low, 16 mobile responsiveness)
