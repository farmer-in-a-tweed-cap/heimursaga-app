# Heimursaga Web App — Pre-Launch Audit Report

**Date:** March 18, 2026 | **Target Launch:** March 20, 2026
**Scope:** `apps/api` (NestJS) and `apps/web-v2` (React/Next.js)

---

## CRITICAL — Must Fix Before Launch

| # | Domain | Issue | Detail |
|---|--------|-------|--------|
| 1 | Security | PostHog key + GA ID committed to `.env.example` | Real analytics keys in tracked file. Rotate PostHog key, replace with placeholders. |
| 2 | SEO | Sitemap dynamic pages completely broken | API returns `{ sources: [...] }` but `sitemap.ts` expects `{ expeditions, entries, users }`. Zero user content in sitemap. |
| 3 | SEO | All pages are client-rendered only (no SSR) | Every page component is `'use client'`. Crawlers see empty shells. |
| 4 | SEO | Home page has no `<h1>` tag | Most important page for SEO has no semantic heading. |
| 5 | SEO | No JSON-LD structured data anywhere | Zero `schema.org` markup. Missing rich result eligibility. |
| 6 | API | `raised` field stored as dollars in some paths, cents in others | Webhook handler increments `raised` with dollars, but schema says cents. Amounts could be 100x off. |
| 7 | Security | Waypoint creation has no ownership check | Any authenticated user can attach waypoints to any expedition via `POST /map/waypoints` (missing `author_id` filter in `map.service.ts`). |
| 8 | Security | Contact form injects unescaped user input into HTML email | `name`, `email`, `subject`, `message`, `url` interpolated raw into admin email (`app.service.ts:234-261`). |
| 9 | Frontend | 17 places redirect to `/login` which doesn't exist | Auth page is at `/auth`. Users hit 404 when trying to follow/bookmark/interact while unauthenticated. |
| 10 | Frontend | `?from=` redirect param is never read | AuthPage only reads `?redirect=`. ~15 pages use `?from=`, so users lose their return destination after login. |

---

## HIGH — Should Fix Before or Immediately After Launch

| # | Domain | Issue |
|---|--------|-------|
| 11 | Security | Legacy password hash path still functional — empty salt, 1,000 iterations (vs 100,000 for new format) |
| 12 | Security | CSRF retry logic fires on `401` (session expired), not just `403` — could mask auth failures |
| 13 | Security | Upload endpoint has no rate limiting — CPU-intensive Sharp processing exploitable |
| 14 | Stripe | Apple IAP receipt validation uses deprecated `verifyReceipt` API (being shut down) |
| 15 | Stripe | IAP flow does not validate receipt ownership — replay attacks across accounts possible |
| 16 | Stripe | Floating-point arithmetic on financial `raised` column — rounding errors compound over time |
| 17 | API | `signupAndLogin` swallows login failures silently — could return `undefined` to client |
| 18 | API | Email endpoint with hardcoded hash is publicly accessible — open email-sending endpoint |
| 19 | API | Password `@MaxLength` missing on signup/reset DTOs — megabyte passwords consume CPU |
| 20 | API | No expired session cleanup cron — `ExplorerSession` table grows unbounded |
| 21 | SEO | No canonical URLs on any page — potential duplicate content indexing |
| 22 | SEO | Image optimization disabled globally (`unoptimized: true`) — hurts LCP/Core Web Vitals |
| 23 | SEO | Expedition/explorer pages have incomplete OG metadata + no Twitter cards |
| 24 | SEO | No semantic HTML landmarks (`<main>`, `<article>`, `<section>`) — accessibility + SEO |
| 25 | Third-Party | Mapbox token not URL-restricted — anyone can use it and incur charges |
| 26 | Third-Party | Sentry DSN empty — no error tracking in production |
| 27 | Third-Party | Stripe keys are test mode — must switch to live before launch |
| 28 | API | Expedition delete bypasses sponsorship handling — sponsors continue being billed for deleted expeditions |
| 29 | API | Search returns soft-deleted entries and blocked users — no `deleted_at` or `blocked` filters |
| 30 | API | Search returns draft entries — no `is_draft: false` filter |
| 31 | Security | ThrottlerGuard is NOT registered globally — most endpoints have zero rate limiting |
| 32 | API | SponsorshipTier `onDelete: Cascade` — deleting a tier cascades to delete all sponsorship records |
| 33 | API | No S3 cleanup on deletion — no `DeleteObjectCommand` anywhere. Orphaned uploads accumulate forever |

---

## MEDIUM

| # | Domain | Issue |
|---|--------|-------|
| 34 | Security | `coverImage` DTO accepts arbitrary strings — no URL allowlist validation |
| 35 | Security | `status` field on expedition DTOs is free-form string — no enum constraint |
| 36 | Security | reCAPTCHA silently bypassed when token is missing (logs warning, allows signup) |
| 37 | Security | Admin role evaluated from stale session, not live DB lookup |
| 38 | Security | `metadata` JSON object in entry DTO has no size cap |
| 39 | API | Controller bypasses service layer via `(this.expeditionService as any).prisma` |
| 40 | API | Comment count increment/decrement not in transactions — can drift |
| 41 | API | `unblockExplorer` doesn't restore soft-deleted content — data loss on unblock |
| 42 | API | `Expedition.public_id` lacks `@unique` constraint (unlike Entry) |
| 43 | API | No `ProcessedWebhookEvent` cleanup — table grows indefinitely |
| 44 | API | Sponsorship tier price has no `@Min`/`@Max` validation — zero/negative prices accepted |
| 45 | API | Missing `deleted_at` filter in `createPayoutMethod` check |
| 46 | API | Console.log debug statements in MessageController |
| 47 | Stripe | Missing webhook events for dispute lifecycle (updated, closed, funds_withdrawn) |
| 48 | Stripe | No `customer.subscription.created` webhook handler (breaks trial-based flows) |
| 49 | Stripe | Non-atomic read-then-write on `raised` amount during refunds |
| 50 | Stripe | `sponsors_count` column manually managed and drifts from actual sponsorship records |
| 51 | Stripe | Stripe API calls inside Prisma transactions — could exhaust connection pool during Stripe outages |
| 52 | Stripe | IAP subscription renewal not handled — no App Store Server Notifications |
| 53 | UI | Header/footer nav links uppercase without letter-spacing (~22 CSS instances + ~45 `.toUpperCase()`) |
| 54 | UI | `--destructive` CSS variable uses `#d4183d` instead of brand `#994040` |
| 55 | UI | Tailwind generic colors (`red-500`, `green-500`) used instead of brand colors in ~10 files |
| 56 | UI | Unicode emoji characters used in ~15 files instead of Lucide icons |
| 57 | SEO | Mapbox CSS imported globally as render-blocking resource on every page |
| 58 | API | Expedition publish flow is not atomic — concurrent publishes possible |
| 59 | API | Missing indexes on 10+ foreign key columns (Sponsorship.expedition_public_id, ExplorerNotification.explorer_id, Waypoint.author_id, ExpeditionNote.expedition_id, SponsorshipTier.explorer_id, Upload.explorer_id, Payout.explorer_id, Checkout.explorer_id) |
| 60 | API | Admin `blockExplorer` doesn't soft-delete comments — blocked user's comments persist |
| 61 | API | Error response format inconsistent — `{ status, url, message }` vs `{ statusCode, message }` |
| 62 | API | No Pino log redaction — email addresses, query params, profile data flow into logs unfiltered |
| 63 | API | Sponsorship list endpoints hardcode `take: 50` with no pagination |
| 64 | API | `getNoteCount` endpoint not marked `@Public()` despite comment saying it should be |
| 65 | Frontend | Admin page has no `ProtectedRoute` wrapper — brief flash of admin content |
| 66 | Frontend | `InteractionButtons` bookmark state goes stale — `useState(isBookmarked)` only reads initial prop |
| 67 | Frontend | Registration form has no client-side username validation |
| 68 | Frontend | Multiple forms missing `maxLength` — expedition title, quick entry, edit profile, contact page |
| 69 | API | Waypoint query missing `deleted_at: null` — can attach to soft-deleted expeditions |
| 70 | API | `PATCH /sessions/:id/revoke` accepts unvalidated ID — `parseInt("abc")` yields `NaN` |
| 71 | API | 10+ string columns should be Prisma enums (Explorer.role, Expedition.status/visibility, Sponsorship.status/type, Entry.entry_type/visibility, Checkout.status) |
| 72 | API | Many counter/boolean/timestamp columns are nullable with defaults — should be non-nullable |

---

## LOW

| # | Domain | Issue |
|---|--------|-------|
| 73 | Security | Token validation endpoint leaks timing info |
| 74 | Security | `SESSION_SECRET` hex encoding not validated at startup |
| 75 | Security | `BotDetectionGuard` flags `x-requested-with` (standard XHR header) as suspicious |
| 76 | Security | DevModule loaded unconditionally in all environments |
| 77 | Security | `web-v2` lint gate fails (24 warnings treated as errors) |
| 78 | API | `CommentQueryDto.limit` not type-coerced — string comparison instead of numeric |
| 79 | API | `EntryCreateDto` fields typed as required but marked `@IsOptional()` |
| 80 | API | Missing DB index on `Waypoint.author_id` and `ExpeditionNote.expedition_id` |
| 81 | Stripe | Payout endpoint has no rate limiting |
| 82 | Stripe | Hardcoded $5.00 payment intent in unused legacy code |
| 83 | Stripe | No admin refund path — requires creator cooperation |
| 84 | Stripe | Stripe account ID exposed to client unnecessarily |
| 85 | Third-Party | Unused `react-map-gl` dependency in package.json |
| 86 | Third-Party | No CDN in front of S3 for image delivery |
| 87 | Third-Party | No GDPR consent mechanism for GA4 + PostHog (if serving EU users) |
| 88 | Third-Party | Dual analytics (GA4 + PostHog) — consider whether both are needed |
| 89 | UI | Off-brand hex colors (~15 unique non-palette colors across ~12 files) |
| 90 | UI | Missing `focus-visible` styles on some buttons (NotFoundPage, SponsorshipsAdminPage) |
| 91 | UI | Empty `alt=""` on avatar images in MessagesPage |
| 92 | UI | `Header_backup.tsx` dead file should be removed |
| 93 | UI | TODO comments with mock/placeholder data in ExplorerProfilePage |
| 94 | SEO | Static pages (about, expeditions, explorers) missing page-specific OG overrides |
| 95 | SEO | Legal pages missing meta descriptions |
| 96 | SEO | API sitemap includes non-existent `/explorer-guidelines` route |
| 97 | SEO | No web app manifest |
| 98 | SEO | No `next/dynamic` usage for code splitting heavy components |
| 99 | API | Console.log debug statements in MessageController |
| 100 | API | `POST /test` endpoint with hardcoded personal email |
| 101 | API | Email failures silently swallowed — no user/admin notification |
| 102 | API | Missing email templates: expedition cancellation, completion, new follower, comment notifications |
| 103 | API | No caching layer (no Redis, no in-memory cache) |
| 104 | API | No request tracing (no requestId/correlationId) |
| 105 | API | Draft entries endpoint lacks pagination (`take: 20` hardcoded) |
| 106 | Frontend | Entry photos use `width={0} height={0}` causing layout shift (CLS) |
| 107 | Frontend | JournalEntryPage images have no `onError` fallback |
| 108 | Frontend | No per-route `error.tsx` files — errors replace entire page |
| 109 | Frontend | Small touch targets on InteractionButtons and comment action buttons |
| 110 | API | `express-recaptcha` package not actively maintained |
| 111 | Frontend | No global `overflow-x: hidden` — horizontal scroll possible |
| 112 | Stripe | No circuit breaker for Stripe API |

---

## Positive Findings

The codebase has strong fundamentals in many areas:

- **Auth**: Global `AuthGuard` + `RolesGuard` as `APP_GUARD`, `@Public()` opt-in, `timingSafeEqual` for password comparison
- **CSRF**: Properly implemented with Stripe webhook bypass, session-based (not JWT)
- **Input validation**: `whitelist: true` + `forbidNonWhitelisted: true` globally, DOMPurify server-side sanitization
- **File uploads**: Magic-byte validation prevents MIME spoofing, Sharp processing with size limits
- **Cookies**: `httpOnly`, `secure` in production, `sameSite: 'strict'`
- **Stripe**: Webhook signature verification, idempotency keys, Serializable isolation on checkouts, card data never touches server
- **Stripe Connect**: Proper destination charges, account verification before accepting payments, open redirect prevention
- **Soft deletes**: `deleted_at: null` consistently applied across most content queries
- **Financial**: Currency consistency (all USD), proper fee calculation, checkout-based idempotency
- **Cron jobs**: Error isolation with try/catch, proper logging
- **Anti-bot**: reCAPTCHA, banned usernames, disposable email detection, registration velocity checks
- **Admin**: Dual enforcement with guard + service assertion, audit logging
- **Content safety**: No `dangerouslySetInnerHTML` with user data, React auto-escaping on all rendered content
- **Open redirect prevention**: `getSafeRedirect` validates same-origin paths

---

## Recommended Priority

**Must fix before launch (day 1-2):**
- Items 1-10 (criticals)
- Items 25-27 (production env config: Mapbox token restriction, Sentry DSN, Stripe live keys)

**Must fix week 1:**
- Items 11-33 (highs)

**Post-launch sprint:**
- Items 34-72 (mediums)
- Items 73-112 (lows)

**Total findings: 112** (10 critical, 23 high, 39 medium, 40 low)
