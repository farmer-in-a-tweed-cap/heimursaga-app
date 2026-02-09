# SEO Comparison: Old Frontend (web) vs New Frontend (web-v2)

## Executive Summary

The old frontend (Next.js) has solid SEO foundations — SSR, dynamic meta tags, sitemap, robots.txt, structured data, and Open Graph support. The new frontend (Vite SPA) has **almost none of this**. This is expected for an in-progress redesign, but these gaps need to be addressed before launch.

**Risk Level: HIGH** — Launching web-v2 without SEO parity would likely cause significant drops in organic search visibility and social sharing quality.

---

## Feature-by-Feature Comparison

### 1. Rendering Architecture

| | Old (Next.js) | New (Vite SPA) |
|---|---|---|
| **Framework** | Next.js 14 (SSR + SSG) | Vite 6 + React 18 (CSR only) |
| **Initial HTML** | Server-rendered content | Empty `<div id="root"></div>` |
| **Crawlability** | Crawlers see full page content | Crawlers see empty page until JS executes |

**Impact: CRITICAL** — Google can render JavaScript but with delays and limits. Other search engines (Bing, DuckDuckGo) and social media crawlers (Facebook, Twitter, LinkedIn) have limited or no JS rendering. Public pages (expeditions, entries, explorer profiles) will be invisible to many crawlers.

**Recommendation:** Either:
- **(A)** Add a prerendering service (e.g., `prerender.io`, `rendertron`) as a reverse proxy for bot traffic
- **(B)** Use `vite-plugin-ssr` or migrate critical public pages to a framework with SSR/SSG
- **(C)** At minimum, generate static HTML snapshots for key public routes

---

### 2. Page Titles

| | Old (Next.js) | New (Vite SPA) |
|---|---|---|
| **Template** | `%s \| Heimursaga` | N/A |
| **Default** | "Heimursaga - Share Your Stories, Raise Money, Inspire the World" | "Heimursaga" (static) |
| **Dynamic titles** | Yes — per page via `generateMetadata()` | No — all pages show "Heimursaga" |
| **User profiles** | `{username} - {bio}` | Not implemented |
| **Entry pages** | `{title}` (truncated 120 chars) | Not implemented |
| **Expedition pages** | Not in old app (new concept) | Not implemented |

**Impact: CRITICAL** — Every page in web-v2 shows "Heimursaga" as the browser tab title. Search engines use the `<title>` tag as the primary ranking signal and SERP display text.

**Recommendation:** Install `react-helmet-async` and add dynamic titles to every page. Pattern:
```tsx
<Helmet><title>{pageTitle} | Heimursaga</title></Helmet>
```

---

### 3. Meta Description

| | Old (Next.js) | New (Vite SPA) |
|---|---|---|
| **Global** | "Heimursaga is a travel journaling and fundraising platform..." | None |
| **Per-page** | Yes — user profiles, entries | None |
| **Entry pages** | First 160 chars of content | None |

**Impact: HIGH** — Meta descriptions appear in search results. Without them, Google auto-generates snippets (often poorly).

**Recommendation:** Add alongside title implementation via `react-helmet-async`.

---

### 4. Open Graph Tags

| | Old (Next.js) | New (Vite SPA) |
|---|---|---|
| **og:title** | Dynamic per page | None |
| **og:description** | Dynamic per page | None |
| **og:image** | `/og-image.jpg` (1200x630) + dynamic per page | None |
| **og:type** | `website`, `profile`, `article` | None |
| **og:url** | Dynamic | None |
| **og:site_name** | "Heimursaga" | None |
| **og:locale** | `en_US` | None |

**Impact: HIGH** — When users share expedition or entry links on social media, the preview will show a blank card with just the URL. No image, no title, no description.

**Recommendation:** Implement OG tags via `react-helmet-async`. At minimum add static fallbacks in `index.html` and dynamic overrides per page.

---

### 5. Twitter Cards

| | Old (Next.js) | New (Vite SPA) |
|---|---|---|
| **twitter:card** | `summary_large_image` | None |
| **twitter:title** | Dynamic | None |
| **twitter:description** | Dynamic | None |
| **twitter:image** | Dynamic (user avatar / entry media) | None |
| **twitter:creator** | `@heimursaga` | None |

**Impact: MEDIUM** — Twitter/X uses OG tags as fallback, but dedicated Twitter card tags ensure optimal display.

**Recommendation:** Add alongside OG tag implementation.

---

### 6. Structured Data (JSON-LD)

| | Old (Next.js) | New (Vite SPA) |
|---|---|---|
| **WebSite schema** | Yes (landing page) | None |
| **SearchAction** | Yes (search box in Google) | None |
| **Article schema** | No | No |
| **Person schema** | No | No |
| **Event schema** | N/A | No |

**Impact: MEDIUM** — Both frontends are weak here, but the old one at least has the WebSite schema which enables the Google search box.

**Recommendation:** Add WebSite schema to the home page. Consider Article schema for entries and Person schema for explorer profiles — these enable rich snippets in search results.

---

### 7. Sitemap

| | Old (Next.js) | New (Vite SPA) |
|---|---|---|
| **Exists** | Yes — `sitemap.ts` via Next.js API | No |
| **Dynamic** | Yes — fetches from API | N/A |
| **Revalidation** | 1 hour (ISR) | N/A |
| **Content** | URLs + lastModified + changeFreq + priority | N/A |

**Impact: CRITICAL** — Without a sitemap, search engines must discover pages by crawling links. Dynamic content (new expeditions, entries) may never be indexed.

**Recommendation:** Either:
- Generate a static `sitemap.xml` at build time from the API
- Create an API endpoint that returns the sitemap and serve it from the CDN/server
- Use `vite-plugin-sitemap` for static routes + a dynamic generation script for content

---

### 8. Robots.txt

| | Old (Next.js) | New (Vite SPA) |
|---|---|---|
| **Exists** | Yes | No |
| **Disallowed** | `/admin`, `/settings`, `/checkout`, `/api/` | Nothing (all crawlable) |
| **AI crawlers blocked** | GPTBot, ChatGPT-User, Claude-Web, etc. | Not blocked |
| **Social crawlers allowed** | facebookexternalhit, Twitterbot, LinkedinBot | N/A |
| **Sitemap reference** | Yes | N/A |

**Impact: HIGH** — Without robots.txt, crawlers will attempt to index settings pages, checkout flows, and other private routes. AI crawlers will scrape all content freely.

**Recommendation:** Copy and adapt the old robots.txt into `apps/web-v2/public/robots.txt`. Update paths to match new route structure.

---

### 9. Semantic HTML

| | Old (Next.js) | New (Vite SPA) |
|---|---|---|
| **`<html lang>`** | `en` | `en` |
| **`<header>`** | No | Yes (Header.tsx) |
| **`<footer>`** | No | Yes (Footer.tsx) |
| **`<nav>`** | No | Yes (breadcrumbs, pagination) |
| **`<main>`** | No | Yes (sidebar layout) |
| **`<section>`** | No | Yes (legal pages) |
| **`<article>`** | No | No |
| **`<time>`** | No | No |
| **Heading hierarchy** | `h1`→`h2`→`h3` on landing | Not audited |
| **ARIA attributes** | Minimal | Good (form controls, nav) |

**Impact: LOW-MEDIUM** — The new frontend is actually **better** than the old one for semantic HTML. Both could improve.

**Recommendation:** No immediate action needed. Consider adding `<article>` wrappers around entry content and `<time>` tags for dates as a future enhancement.

---

### 10. Image Handling

| | Old (Next.js) | New (Vite SPA) |
|---|---|---|
| **Optimization** | `next/image` (auto resize/format) | Standard `<img>` tags |
| **Lazy loading** | Implicit via next/image | `ImageWithFallback` component (partial) |
| **Alt text** | Mostly present | Mostly present |
| **Remote domains** | Whitelisted (S3, Mapbox, AllTrails) | No restriction needed (no proxy) |
| **Format** | Auto WebP/AVIF via Next.js | Original format only |

**Impact: MEDIUM** — `next/image` provides automatic format conversion, resizing, and lazy loading. The new frontend serves original images at full size.

**Recommendation:** Add `loading="lazy"` to below-fold images. Consider a CDN with image transformation (Cloudflare Images, Imgix) for format/size optimization.

---

### 11. URL Structure

| | Old (Next.js) | New (Vite SPA) |
|---|---|---|
| **Profiles** | `/user/{username}` | `/journal/{username}` |
| **Entries** | `/entries/{id}` | `/entry/{entryId}` |
| **Expeditions** | `/journeys/{id}` | `/expedition/{expeditionId}` |
| **Explore** | `/explore` | `/` (home) |
| **Sponsorship** | `/sponsor/{username}` | `/sponsor/{expeditionId}` |
| **Legal** | `/legal/privacy`, `/legal/terms` | `/legal/privacy`, `/legal/terms` |
| **Slug-based URLs** | No (IDs) | No (IDs) |

**Impact: LOW** — URL structure has changed. Old URLs will 404 in the new app unless redirects are set up.

**Recommendation:**
- Set up 301 redirects from old URLs to new URLs (e.g., `/user/{username}` → `/journal/{username}`, `/entries/{id}` → `/entry/{id}`)
- This is critical for preserving any existing search rankings and backlinks

---

### 12. Error Pages

| | Old (Next.js) | New (Vite SPA) |
|---|---|---|
| **404 page** | Basic (Next.js auto 404 status) | Custom branded page ("OFF THE MAP") |
| **Error boundary** | Yes (generic) | Yes (with retry + home buttons) |
| **HTTP status codes** | Proper 404 via SSR | All routes return 200 (SPA limitation) |

**Impact: LOW-MEDIUM** — The new 404 page is better designed, but SPAs return HTTP 200 for all routes, which confuses crawlers about what pages actually exist.

**Recommendation:** Handle via prerendering service or server-side configuration that returns proper 404 status for unknown routes.

---

### 13. Analytics & Tracking

| | Old (Next.js) | New (Vite SPA) |
|---|---|---|
| **Google Analytics** | GA4 (G-RCFRCB2E0L) | Not found |
| **Sentry** | @sentry/nextjs | Not found |
| **Cookie consent** | CookieConsent component | Not found |

**Impact: MEDIUM** — No analytics means no visibility into organic search traffic, user behavior, or Core Web Vitals.

**Recommendation:** Add GA4 and Sentry to the new frontend before launch.

---

### 14. Fonts & Performance

| | Old (Next.js) | New (Vite SPA) |
|---|---|---|
| **Font loading** | `next/font` with `display: swap` | Custom fonts via CSS (no swap config found) |
| **Script loading** | `next/script` with `afterInteractive` | Standard script loading |
| **Code splitting** | Automatic via Next.js | Vite default chunking |
| **Preconnect hints** | None | None |
| **Service worker** | None | None |

**Impact: MEDIUM** — Font loading without `font-display: swap` can cause invisible text (FOIT). No preconnect hints for API/CDN domains means slower initial loads.

**Recommendation:** Add `font-display: swap` to font-face declarations. Add preconnect hints in `index.html`:
```html
<link rel="preconnect" href="https://api.heimursaga.com" />
<link rel="preconnect" href="https://api.mapbox.com" />
```

---

### 15. Viewport & Mobile

| | Old (Next.js) | New (Vite SPA) |
|---|---|---|
| **Viewport** | Fixed scale 1.0, no zoom | Standard responsive |
| **Theme color** | `#4676AC` | None |
| **Mobile-first CSS** | Tailwind | Tailwind |

**Impact: LOW** — The old frontend disables pinch zoom (accessibility concern). The new one is more standard.

**Recommendation:** Add `<meta name="theme-color">` to match the app's brand color for mobile browser chrome.

---

### 16. Miscellaneous

| Feature | Old | New |
|---|---|---|
| **Canonical URLs** | Implicit via metadataBase | None |
| **Keywords meta** | Yes (9 keywords) | None |
| **Author meta** | "The Peripety Company" | None |
| **Favicon** | Present | Not found in public/ |
| **manifest.json (PWA)** | Not found | Not found |
| **hreflang** | None | None |
| **RSS feed** | None | None |

---

## Priority Action Items

### Before Launch (Critical)

1. **Install `react-helmet-async`** and add dynamic `<title>` + `<meta description>` to every page
2. **Add static fallback OG/Twitter tags** to `index.html`
3. **Add dynamic OG/Twitter tags** per page via react-helmet-async
4. **Create `robots.txt`** in `public/` (adapt from old frontend)
5. **Generate `sitemap.xml`** — at minimum a static one for known routes, ideally dynamic from API
6. **Set up 301 redirects** from old URL patterns to new ones
7. **Add Google Analytics (GA4)** tracking
8. **Add a static OG fallback image** (`og-image.jpg`, 1200x630px) to `public/`

### Before Launch (Important)

9. **Add `font-display: swap`** to custom font declarations
10. **Add preconnect hints** for API and Mapbox domains
11. **Add `<meta name="theme-color">`** for mobile browsers
12. **Add favicon** files to `public/`
13. **Add error tracking** (Sentry or similar)
14. **Add cookie consent** component

### Post-Launch (Enhancements)

15. **Consider prerendering** for public pages (expedition detail, entry detail, explorer profiles)
16. **Add JSON-LD structured data** — WebSite schema on home, Article on entries, Person on profiles
17. **Add `loading="lazy"`** to below-fold images
18. **Add breadcrumb schema** for nested pages
19. **Image CDN** for automatic format conversion and resizing
20. **Core Web Vitals monitoring** via `web-vitals` library

---

## Migration Checklist

When switching traffic from web to web-v2, ensure:

- [ ] All old URLs have 301 redirects to new equivalents
- [ ] Sitemap is accessible and submitted to Google Search Console
- [ ] robots.txt is in place
- [ ] OG tags produce correct social previews (test with Facebook Debugger, Twitter Card Validator)
- [ ] Google Analytics is receiving data
- [ ] Google Search Console is updated with new sitemap URL
- [ ] Dynamic page titles are working for all public pages
- [ ] Favicon is present and renders correctly
- [ ] No `noindex` tags accidentally blocking pages
