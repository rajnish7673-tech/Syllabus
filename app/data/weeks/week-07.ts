import type { Week } from "../types";

export const week07: Week = {
  week: 7,
  theme: "System Design & Architecture",
  color: "#F97316",
  topics: [
    {
      title: "Frontend System Design",
      subtopics: [
        "Component architecture",
        "Micro-frontends",
        "Monorepo",
        "Design systems",
        "API layer design",
      ],
      questions: [
        {
          q: "How would you design the frontend architecture for a news portal like NBT?",
          answer: `Structure the answer like a real design interview: **requirements -> high-level architecture -> rendering strategy -> component/data layers -> performance -> scalability -> monitoring.** Drive it with the domain's defining traits: massive read traffic, SEO/Discover-critical, content-heavy, multilingual, ad-monetized, spiky (breaking news/IPL).

**1. Requirements**
- Functional: article pages, category/home feeds, search, video, live blogs, comments, personalization-lite.
- Non-functional: great SEO + CWV, sub-second TTFB at scale, multilingual (Hindi/Marathi/…), ad integration without killing perf, handle 10–100x spikes.

**2. High-level architecture**
~~~
        Users
          │
        CDN (edge cache, image optimization)
          │
        Nginx (reverse proxy, proxy_cache, gzip/brotli, SSL, rate limit)
          │
   Next.js SSR/ISR app servers (k8s, autoscaled)
          │
   CMS / content API · Search · Ads · Recommendations · Analytics
~~~

**3. Rendering strategy** — **ISR** for articles/category pages (static perf + on-publish revalidation), **SSR** only for personalized/real-time bits, **CSR** for interactive widgets. RSC to ship minimal JS; stream with Suspense so the article shell paints fast and ads/recommendations fill in.

**4. Component & code architecture** — a **shared design system** (tokens, primitives, article-card, video-player) consumed across all properties via a **monorepo** (Turborepo) of packages; feature modules per route; client boundaries kept at leaves.

**5. Data layer** — server-side data fetching in RSC (parallel \`Promise.all\` for article + metadata + related), React Query for client server-state (search, comments), a typed API client wrapper (retries/backoff/timeouts), and SWR-style revalidation tied to publish.

**6. Performance** — caching at every layer (browser/CDN/Nginx/Next data cache), \`next/image\` (WebP/AVIF, ≥1200px for Discover), preload LCP image, defer/Partytown third-party scripts, bundle budgets in CI, reserve ad slots (CLS), yield/INP discipline.

**7. Scalability** — stateless SSR pods autoscaled behind the CDN; aggressive edge caching with \`s-maxage\` + stale-while-revalidate to absorb spikes; on-demand revalidation/CDN purge by article tag for breaking news.

**8. SEO/monetization** — \`NewsArticle\` JSON-LD, sitemaps, \`max-image-preview:large\`, canonical/hreflang for languages; lazy ad slots with reserved space; consent-gated analytics.

**9. Monitoring** — RUM (web-vitals p75 by template), Sentry (errors + source maps), uptime/SLOs, dashboards.

Why this structure wins: it leads with the *forces* (read-heavy, SEO, spiky, multilingual) and shows trade-off reasoning at each layer. Production angle: this is literally the NBT/Maharashtra Times stack — shared components across properties, ISR + CDN + Nginx caching, INP/CWV discipline. Follow-up they'll push on: breaking-news invalidation (tag-based CDN purge + revalidateTag), multilingual routing (locale segments + hreflang), and ad performance (Partytown/lazy slots).`,
        },
        {
          q: "What are micro-frontends? When would you use them?",
          answer: `**Micro-frontends (MFE)** extend microservice principles to the frontend: split a large app into **independently developed, deployed, and owned** pieces that compose into one UI. Each team owns a vertical slice end-to-end (e.g. "search," "checkout," "video") and ships on its own cadence.

Integration approaches:
~~~
1. Build-time   : packages composed at build (npm). Simple, but coupled deploys.
2. Run-time via Module Federation (Webpack/Vite): apps load each other's code at runtime.
3. iframes      : strong isolation, poor UX/integration.
4. Edge/SSI composition: assemble fragments at the CDN/edge or server.
5. Web Components: framework-agnostic custom elements as the boundary.
~~~

~~~
   ┌────────────── App Shell ──────────────┐
   │ [Header MFE] [Search MFE] [Feed MFE]   │  each = separate team,
   │ [Video MFE ] [   Ads MFE  ]            │  repo, deploy pipeline
   └────────────────────────────────────────┘
~~~

When MFEs are justified (the "when"):
- **Large org, many teams** stepping on each other in one monolith; you need **independent deploys** and clear ownership.
- **Heterogeneous tech** or gradual **migration** (strangler pattern — replace a legacy app section by section).
- Distinct domains with different release cadences.

When NOT to (challenge the hype — interviewers love this): small/medium teams, or a single cohesive app. MFEs add **real costs**: duplicated dependencies (bigger bundles unless you share carefully), **version skew**, harder shared state/auth, cross-MFE routing, design-system consistency, operational complexity, and performance overhead. For most teams a **well-structured monorepo with module boundaries** delivers the org benefits (independent ownership, shared design system) **without** the runtime complexity.

The senior take: prefer a **monorepo + design system + clear package boundaries** until you have the organizational scale (many autonomous teams) that genuinely needs independent deploys; then consider **Module Federation** with a shared design system and shared singleton deps (one React).

Production angle: a news org with separate teams for video, ads, core editorial *could* use MFEs, but a Turborepo monorepo with shared component packages often gives 80% of the benefit at far lower cost — be ready to argue both sides. Follow-up: "Biggest MFE pitfall?" Bundle bloat from duplicated deps and inconsistent UX — mitigate with shared singletons + design system. "How do MFEs share state?" Via a thin shared store/events or the URL — keep it minimal; tight coupling defeats the purpose.`,
        },
        {
          q: "How do you design a shared component library across multiple properties?",
          answer: `Goal: a **single design system** consumed by NBT, Maharashtra Times, ET, etc., that ensures consistency, accelerates development, and stays performant and themeable per brand. Design it across these axes:

**1. Structure (monorepo)** — Turborepo/Nx with packages: \`tokens\`, \`ui\` (primitives), \`components\` (composites like ArticleCard), \`icons\`, \`utils\`. Each property imports versioned packages.

**2. Design tokens as the foundation** — colors, spacing, typography, radii as CSS variables / a tokens package, so brands **theme** by overriding tokens, not forking components:
~~~css
:root { --color-primary: #...; --font-head: '...'; }      /* NBT theme */
[data-brand="mt"] { --color-primary: #...; }              /* Maharashtra Times */
~~~

**3. Component API design** — composable, controlled/uncontrolled where sensible, **accessible by default** (WCAG: keyboard, ARIA, focus), \`forwardRef\`, polymorphic \`as\` where useful, no business logic baked in. Favor composition (compound components) over config explosions.

**4. Theming & i18n** — token-based theming per brand; RTL/LTR and multilingual support via **CSS logical properties** and locale-aware components (critical for Hindi/Marathi).

**5. Versioning & release** — **semver**, **Changesets** for automated changelogs/releases, a deprecation policy, and a migration guide for breaking changes. Publish to a private registry.

**6. Documentation & testing** — **Storybook** as living docs + visual catalog; **visual regression** (Chromatic/Playwright snapshots); unit tests (RTL) + **a11y tests** (axe). Stories double as the contract.

**7. Performance** — tree-shakeable ESM, per-component entry points (no barrel that pulls everything), minimal runtime, no heavy deps; ship CSS that purges; bundle-size budgets per component.

~~~
tokens ─▶ ui primitives ─▶ composite components ─▶ consumed by:
                                                   [ NBT ] [ MT ] [ ET ]
   brands override TOKENS (theme) — not fork components
~~~

**Governance** — a clear contribution model (who can add/change components), design+eng review, and an "is this reusable or app-specific?" gate so the library doesn't bloat.

Why this matters: the hard parts are **theming without forking**, **versioning/migration** across many consumers, **a11y/i18n consistency**, and **performance** (tree-shaking). Calling those out signals real platform experience. Production angle: shared components across the Times Internet properties — tokens-based brand theming, Storybook + visual regression, semver + Changesets, logical properties for multilingual RTL/LTR. Follow-up: "How do you roll out a breaking change to N apps?" Deprecate -> codemod/migration guide -> major version -> consumers upgrade on their schedule (decoupled). "Avoid bundle bloat?" Per-component imports + tree-shaking + size budgets.`,
        },
      ],
      tip: "Structure your answer: requirements → high-level design → component breakdown → performance → monitoring.",
      rajnishAngle:
        "You manage shared components across NBT, Maharashtra Times etc — this is your answer.",
    },
    {
      title: "Caching Strategy (System Design)",
      subtopics: [
        "Multi-layer caching model",
        "Cache hierarchy",
        "TTL decisions",
        "Invalidation on publish",
        "SSR + CDN interaction",
      ],
      questions: [
        {
          q: "Design the full caching strategy for a high-traffic news portal.",
          answer: `Answer in **layers**, from closest-to-user to origin, with a **TTL + invalidation** strategy per layer. The principle: serve as much as possible from the **edge/cache**, keep the **origin** doing minimal work, and **invalidate precisely on publish** for freshness.

~~~
Browser cache ─▶ Service Worker ─▶ CDN edge ─▶ Nginx proxy_cache ─▶ Next.js caches ─▶ Origin/CMS
   (private)        (offline)        (shared)     (shared)            (data/route)     (DB)
~~~

**Per-layer policy:**
1. **Browser** — static assets (JS/CSS/images) with content-hashed URLs: \`Cache-Control: public, max-age=31536000, immutable\`. HTML: short/no private cache (it's shared at the edge).
2. **Service Worker** — network-first for article HTML (fresh news, cached fallback offline), cache-first for hashed static assets, an offline page pre-cached.
3. **CDN edge** — the workhorse for reads. Article HTML: \`s-maxage=60, stale-while-revalidate=300\`; category pages a bit longer; JS/CSS immutable 1yr. Use **surrogate keys / cache tags** (e.g. \`article:123\`) for precise purge.
4. **Nginx proxy_cache** — cache SSR responses (\`proxy_cache_valid 200 60s\`), \`proxy_cache_lock\` to prevent stampede, bypass on auth cookie, expose \`X-Cache-Status\`.
5. **Next.js** — Data Cache + Full Route Cache for ISR pages; \`revalidateTag('article:123')\` on publish.
6. **Origin/CMS** — the source of truth; protected by all the above so it only does real work on cache miss/regeneration.

**TTL decisions (next question expands):** immutable assets = 1yr; article HTML = short (seconds) + SWR; category/home = short-medium; truly dynamic/personalized = no-store.

**Invalidation on publish (the freshness path):**
~~~
editor publishes ─▶ CMS webhook ─▶
   revalidateTag('article:123')  (Next data + route cache)
   + CDN purge by surrogate-key 'article:123'  (all edges)
   + (Nginx cache key purge if needed)
   ─▶ readers get fresh content within seconds, everywhere it appears
~~~

**Stampede protection:** \`stale-while-revalidate\` (serve stale while one request refreshes), \`proxy_cache_lock\`/request coalescing (one origin fetch while others wait), and jittered TTLs so many keys don't expire simultaneously.

Why this design: it gives **static-like performance** (edge-served) with **near-real-time freshness** (tag-based purge on publish), and survives spikes because the origin is shielded. Production angle: exactly the browser+Nginx+CDN stack for the portals — immutable hashed assets, short SWR HTML TTLs, tag-based purge on publish for breaking news. Follow-up: "Personalized content?" Don't cache the personalized HTML at shared layers — render dynamically (SSR) or hydrate personalization client-side over a cached shell (cache the public shell, fetch personal bits client-side). "How prevent a thundering herd after purge?" SWR + cache lock + jitter.`,
        },
        {
          q: "How do you decide TTL for article pages vs category pages vs JS bundles?",
          answer: `TTL is a function of **how often the content changes**, **how bad staleness is**, and **whether you can invalidate on demand**. The rule: **immutable, versioned assets get very long TTLs; frequently-changing HTML gets short TTLs + stale-while-revalidate + on-demand purge.**

~~~
Asset type        Volatility        TTL strategy
JS/CSS bundles    never (hashed)    Cache-Control: public, max-age=31536000, immutable
                                    (URL changes on deploy -> safe to cache forever)
Images           rarely            long max-age (e.g. 30d–1yr), versioned URLs
Article HTML      occasionally      s-maxage=30–60 + stale-while-revalidate=300
                  (edits/breaking)  + on-demand purge/revalidateTag on publish
Category/Home     frequently        s-maxage=30–120 + SWR (new articles flow in)
Live blog/ticker  constantly        no-store / very short + client polling/SSE
Personalized      per user          no-store at shared caches; cache public shell only
~~~

The reasoning per type:
- **JS/CSS bundles** — webpack/Next emit **content-hashed filenames** (\`main.abc123.js\`). The content for a given URL **never changes**, so cache it **forever** (\`immutable\`). On deploy, new hashes = new URLs; old ones expire naturally. This is **cache busting via versioned URLs** — the cleanest invalidation (no purge needed).
- **Article HTML** — mostly static after publish but can be edited or be breaking news. Use a **short edge TTL** (so unedited articles are cheap to serve) **+ \`stale-while-revalidate\`** (serve slightly-stale instantly while refreshing) **+ on-demand purge** (\`revalidateTag\`/surrogate-key purge on publish) so edits/breaking news go live in seconds despite the TTL.
- **Category/home pages** — change more often (new articles appear), so **short TTL + SWR**; consider revalidating on publish of any article in that section.
- **Live/personalized** — \`no-store\` (or very short) since caching defeats the purpose; use client polling/SSE for live data, render personalization dynamically or client-side over a cached shell.

~~~
key insight: TTL alone is a blunt tool.
  short TTL = freshness but more origin load
  long TTL  = performance but staleness
  -> combine SHORT TTL + STALE-WHILE-REVALIDATE + ON-DEMAND PURGE
     = static performance AND seconds-fresh content
~~~

Why it matters: shows you balance freshness vs origin load and know that **versioned URLs** and **event-driven purge** beat guessing TTLs. Production angle: immutable 1yr for hashed bundles; ~60s + SWR + \`revalidateTag\` on publish for article HTML; \`no-store\` for the live ticker. Follow-up: "Why immutable on bundles is safe but not on HTML?" Bundle URLs change on content change (hash); HTML URLs stay the same while content changes — so HTML needs event-driven invalidation. "max-age vs s-maxage here?" \`max-age\` (browser/private), \`s-maxage\` (shared CDN/proxy) — set s-maxage for shared edge TTL, often with a small/zero max-age so users always revalidate HTML.`,
        },
        {
          q: "How does a CDN in front of an SSR Next.js app affect cache-control behavior?",
          answer: `When a CDN sits in front of SSR Next.js, the **\`Cache-Control\` headers your app sends become instructions to the CDN** (and the browser). The CDN caches the **rendered HTML** at the edge based on those directives, so most requests are served from the edge **without hitting your Next.js origin** — but you must set the headers deliberately, because SSR responses are dynamic by default and easy to accidentally leave uncacheable.

Key mechanics:
- **\`s-maxage\`** targets **shared caches** (the CDN); **\`max-age\`** targets the **browser**. You typically want a **short/zero \`max-age\`** (so browsers revalidate HTML) and a meaningful **\`s-maxage\`** (so the CDN serves the edge copy):
~~~
Cache-Control: public, s-maxage=60, stale-while-revalidate=300, max-age=0
~~~
The CDN caches the HTML 60s, serves stale up to 300s more while it revalidates with origin; the browser doesn't cache the HTML itself.

~~~
request ─▶ CDN edge: HIT? ──yes──▶ serve cached HTML (origin untouched)
                     └──no/stale──▶ fetch from Next.js SSR ─▶ cache ─▶ serve
~~~

What to watch (the gotchas):
1. **SSR is dynamic by default** — if you read \`cookies()\`/\`headers()\`, Next may send \`Cache-Control: private, no-store\`, which **prevents CDN caching**. Personalized pages can't be shared-cached; cache the **public shell** and personalize client-side instead.
2. **\`Vary\` header** — the CDN keys cache by \`Vary\` dimensions. \`Vary: Cookie\` or a wide \`Vary: User-Agent\` **fragments** the cache (low hit rate). Be deliberate; \`Vary: Accept-Encoding\` is fine, \`Vary: Cookie\` usually disastrous for hit rate.
3. **stale-while-revalidate** at the CDN gives instant responses + background refresh and prevents stampede.
4. **Surrogate headers** — CDNs honor \`Surrogate-Control\` / cache-tag headers separately from \`Cache-Control\`, letting you set a different edge TTL than the browser and **purge by tag** on publish.
5. **ISR + CDN** — Next ISR already produces cacheable static-ish responses; the CDN layers on top. Align their TTLs and use on-demand revalidation + CDN purge together.

Why it matters: the whole point of a CDN over SSR is to **shield the origin and cut TTFB** — but only if Cache-Control/Vary are set so responses are actually shared-cacheable. Misconfigured \`Vary: Cookie\` or accidental \`no-store\` silently makes every request hit origin (the classic "why is my CDN hit rate 2%?" incident). Production angle: SSR/ISR pages served with \`s-maxage\` + SWR at the CDN, careful \`Vary\`, public shell cached + personalization client-side, and tag-based purge on publish. Follow-up: "How do you debug low hit rate?" Check \`Cache-Control\`/\`Vary\`/\`Set-Cookie\` on responses (a \`Set-Cookie\` often makes responses uncacheable) and the CDN's cache-status header. "no-cache vs no-store at CDN?" \`no-cache\` = may store but must revalidate; \`no-store\` = never store (kills edge caching).`,
        },
      ],
      tip: "Answer in layers: Browser cache → Nginx proxy cache → CDN edge cache → origin. Each layer has different TTLs and invalidation strategies.",
      rajnishAngle:
        "Your full caching stack at Times Internet: browser + Nginx + CDN. Walk through each layer with real TTL values you use.",
    },
    {
      title: "Performance Architecture at Scale",
      subtopics: [
        "Bundle splitting strategy",
        "Third-party script management",
        "Edge rendering",
        "A/B testing infrastructure",
      ],
      questions: [
        {
          q: "How do you manage 20+ third-party scripts without killing performance?",
          answer: `Third-party scripts (ads, GTM, analytics, Taboola, social, chat) are the biggest INP/main-thread threat on content sites because you don't control their code and they run on your main thread. The strategy: **govern, prioritize, defer, offload, and measure.**

**1. Govern & audit** — maintain an inventory; every script must justify its business value vs cost. Kill or consolidate redundant ones. Load **tag managers (GTM) carefully** since they inject more scripts — most third-parties should go *through* a managed loader, not raw tags.

**2. Prioritize by criticality** — load order/strategy by importance:
~~~
beforeInteractive : consent/anti-fraud only (must run first)
afterInteractive  : GTM, core analytics (early but non-blocking)
lazyOnload        : ads (non-LCP), social embeds, chat, pixels (idle)
on interaction/visible: load on first scroll/intent, not upfront
~~~

**3. Offload to a Web Worker (Partytown)** — run heavy third-party JS (analytics, some ad/GTM logic) **off the main thread** in a worker, so it can't cause long tasks/INP regressions. This is the modern high-leverage move for content sites.

**4. Defer & lazy-load** — \`next/script\` strategies; load below-the-fold ad slots and embeds via **IntersectionObserver** as they approach the viewport (with reserved space to avoid CLS).

**5. Resource hints** — \`preconnect\`/\`dns-prefetch\` to the third-party origins they'll call, so when they do load, the connection is warm.

**6. Sandbox & protect** — \`async\`/\`defer\`, SRI where possible, a **CSP** to limit what they can do, and \`sandbox\`/iframe isolation for risky embeds; facade pattern (load a lightweight placeholder, swap in the real embed on click — e.g. a YouTube facade).

**7. Measure continuously** — DevTools Performance **Bottom-Up filtered by domain** to attribute cost per script; **block** a script in the Network panel and compare INP/TBT; RUM with attribution to catch field regressions; a **performance budget** for third-party bytes/main-thread time in CI.

~~~
strategy stack:  audit -> prioritize -> defer/lazy -> Partytown(worker)
                 -> preconnect -> CSP/sandbox -> measure (per-domain) -> budget
~~~

Why it matters: third-party scripts are the #1 reason a fast app feels slow; senior engineers treat them as a governed, measured budget — not "paste the tag and forget." Production angle: GTM/analytics deferred, ads lazy-loaded with reserved slots, heaviest analytics via Partytown, per-domain cost measured in DevTools, and INP tracked in RUM — the concrete INP-improvement story. Follow-up: "How measure one script's cost?" Bottom-Up by domain + Network blocking + before/after INP. "Facade pattern?" Render a cheap placeholder (poster + play button) and only load the real heavy embed on user interaction.`,
        },
        {
          q: "How would you implement A/B testing without affecting CWV?",
          answer: `The danger with A/B tests is the classic anti-pattern: a **client-side experiment script** that loads, then **hides content and re-renders a variant**, causing **flicker (FOOC — flash of original content)**, **layout shift (CLS)**, and **delayed LCP** while the page waits for the experiment to decide. The fix is to **decide the variant before/at render**, server- or edge-side, and ship the chosen variant directly.

**Best approaches (CWV-safe):**
1. **Edge/server-side assignment** — at the **CDN edge** (middleware) or in **SSR/Next.js middleware**, read/assign the variant (cookie-based bucketing) and render the correct variant's HTML on the first response. No client flicker, no extra blocking script, no CLS.
~~~js
// Next.js middleware — assign at the edge before render
export function middleware(req) {
  let bucket = req.cookies.get('exp_hero');
  if (!bucket) bucket = Math.random() < 0.5 ? 'A' : 'B';
  const res = NextResponse.next();
  res.cookies.set('exp_hero', bucket);   // sticky assignment
  res.headers.set('x-exp-hero', bucket); // app renders the right variant
  return res;
}
~~~
2. **Feature flags evaluated server-side** (LaunchDarkly/Unleash/Statsig) so the variant is baked into the SSR/RSC output — the page ships already-correct.
3. **Reserve space** for any variant differences so even client-side variation can't shift layout (sized containers/skeletons).
4. **No render-blocking experiment script** — if you must do client-side, don't use the anti-flicker "hide \`<body>\` until decided" snippet (it tanks LCP). Prefer CSS-class swaps on already-present, equally-sized content.

~~~
❌ client-side: load page -> exp.js -> hide -> swap variant -> flicker + CLS + late LCP
✅ edge/SSR:    assign variant at edge -> render correct HTML -> zero flicker
~~~

**Other senior considerations:** sticky bucketing via cookie (consistent experience), variant must not change the **LCP element's** delivery, keep both variants within the perf budget, exclude bots, and **measure CWV per variant** in RUM (so a "winning" variant that hurts INP/LCP is caught). With ISR/CDN caching, vary the cached object by the experiment cookie via a **surrogate/cache key** (careful with \`Vary: Cookie\` cardinality — bucket into few groups).

Why it matters: it shows you know the FOOC/CLS trap and the **edge/SSR assignment** pattern that avoids it — the difference between an experiment platform that quietly degrades CWV (and rankings) and one that doesn't. Production angle: rolling out new article-page layouts to a subset via edge/middleware assignment + server-rendered variant, with per-variant CWV monitoring. Follow-up: "How avoid cache fragmentation when caching variants?" Bucket into 2–3 groups and key the cache by that single dimension, not raw user IDs. "Client-side tools like Optimize?" Largely the source of the flicker problem — prefer server/edge decisioning now.`,
        },
        {
          q: "What is edge rendering and when would you use it over server-side rendering?",
          answer: `**Edge rendering** runs your rendering code on a **CDN's globally-distributed edge nodes** (close to the user) using a lightweight runtime (V8 isolates, e.g. Cloudflare Workers / Vercel Edge), instead of on **centralized regional origin servers** (traditional Node SSR). The benefit is **lower latency** (compute runs near the user) and **massive scale** (every edge POP can render), at the cost of a **constrained runtime** and **distance to your data**.

~~~
Origin SSR:  user (India) ───────▶ origin (us-east) ──▶ render ──▶ back  (high RTT)
Edge SSR:    user (India) ─▶ nearby edge POP ──▶ render ──▶ back        (low RTT)
                                   │ but data/DB may still be far away
~~~

~~~
                 Edge rendering              Origin SSR (Node)
location         100s of POPs near users     few regional servers
cold start       ~none (isolates)            container cold starts possible
runtime          limited (Web APIs, no full  full Node (fs, native modules,
                 Node, no native addons)      any npm)
latency to user  very low                    higher (centralized)
latency to data  can be HIGH if DB is far     low if DB co-located with origin
best for         light, fast, geo/auth logic  heavy compute, full Node, near-DB work
~~~

**Use edge rendering when:**
- The work is **light and latency-sensitive**: A/B assignment, auth/redirects, geolocation/personalization headers, simple personalization, request routing, feature-flag evaluation — **Next.js Middleware** is the canonical case.
- You serve a **global audience** and want low TTFB everywhere.
- The runtime constraints are acceptable (Web-standard APIs only, no native Node modules).

**Prefer origin SSR when:**
- You need **full Node** (native modules, \`fs\`, large libraries) or **heavy CPU** work.
- Your **data source is centralized** — rendering at the edge but fetching from a single-region DB means the edge node makes a long round-trip to the DB, **erasing** the latency benefit (the "data gravity" problem). Render where your data lives, or push data to the edge (edge KV/replicas) too.

The senior nuance: **edge isn't universally faster** — it's faster only if the data is also near the edge. If your CMS/DB is in one region, edge rendering can be *slower* than origin SSR co-located with that DB. So edge shines for **data-light, latency-sensitive logic** (middleware, personalization, routing) and for static/ISR served from the edge; heavy, data-coupled rendering often belongs at the origin (or needs edge data replication).

Production angle: use **Next.js Middleware at the edge** for geo/language routing, A/B bucketing, and auth gating (fast, data-light), while article rendering uses ISR + CDN (effectively edge-cached) and any heavy/data-coupled SSR stays at the origin near the CMS. Follow-up: "Edge functions vs edge caching?" Caching serves precomputed responses from the edge; edge functions *compute* at the edge — different tools, often combined. "Biggest edge pitfall?" Data gravity — co-locate or replicate data, or you lose the latency win.`,
        },
      ],
      tip: "Partytown for offloading scripts to a Web Worker is the modern answer for third-party scripts.",
      rajnishAngle:
        "GTM, ad scripts, Taboola — you have real third-party script management experience.",
    },
  ],
};
