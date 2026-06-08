import type { Week } from "../types";

export const week04: Week = {
  week: 7,
  theme: "Next.js & SSR Architecture",
  color: "#8B5CF6",
  topics: [
    {
      title: "Rendering Strategies",
      subtopics: ["SSR vs SSG vs ISR vs CSR", "When to use each", "Hybrid rendering"],
      questions: [
        {
          q: "When would you choose ISR over SSR for a news article page?",
          answer: `ISR (Incremental Static Regeneration) pre-renders a page to static HTML and **regenerates it in the background on a schedule or on-demand**, serving cached HTML to everyone in between. SSR renders fresh HTML **on every request**. For a news article, ISR is usually the better default because article content changes rarely after publish but is read enormously — so you want CDN-cacheable static HTML, not per-request rendering.

~~~
SSR:  every request ─▶ run React on server ─▶ HTML   (fresh, but origin work each time)
ISR:  first/after-interval request ─▶ regenerate ─▶ cache;  others ─▶ served static HTML
~~~

~~~jsx
// App Router ISR: revalidate the static page every 60s
export const revalidate = 60;            // time-based ISR
// or on-demand when an editor publishes an edit:
revalidatePath(\`/article/\${slug}\`);     // or revalidateTag('article')
~~~

Choose **ISR** when:
- Content is **mostly static after publish** (articles, product pages) but high-traffic.
- You want **CDN-cacheable** static HTML for fast TTFB and low origin load — millions of reads served from cache, not re-rendered each time.
- A small **staleness window** (seconds/minutes) is acceptable, OR you can **revalidate on-demand** on publish for near-instant freshness.

Choose **SSR** when:
- The page is **personalized per request** (logged-in dashboard, A/B variant, geo/user-specific content) so caching a single HTML doesn't work.
- Content must be **truly real-time** on every hit and you can't tolerate any staleness window.

The senior nuance: ISR gives you "static performance with dynamic freshness." For breaking news, combine **short \`revalidate\` + on-demand \`revalidateTag\`** triggered by the CMS publish webhook — readers get fresh content within seconds without paying SSR's per-request cost. SSR would re-render the same article for every one of millions of readers — wasteful and slower under load.

Production angle: NBT/Maharashtra Times articles -> ISR (fresh content via on-publish revalidation, ISR for semi-static category pages); personalized or session-specific pages -> SSR. Follow-up: "What's the cold-path cost of ISR?" The first request after expiry may serve **stale** while regenerating (stale-while-revalidate) — users still get a fast (if slightly old) page, never a blocking render.`,
        },
        {
          q: "What are the trade-offs of SSR vs SSG at scale?",
          answer: `**SSG (Static Site Generation)** renders pages at **build time** into static HTML; **SSR** renders at **request time** per visit. At scale the trade-offs are about origin load, freshness, build time, and personalization.

~~~
            SSG (build-time)                SSR (request-time)
TTFB        fastest (static from CDN)       slower (server compute per req)
Origin load near-zero (CDN serves)          high (every request hits server)
Freshness   stale until rebuild             always fresh
Build time  grows with page count           constant build
Personalize no (same HTML for all)          yes (per-request)
Scaling     trivial (CDN)                   needs servers + autoscaling
~~~

**SSG at scale — pros/cons:**
- Pro: serve from CDN edge -> excellent TTFB, handles traffic spikes effortlessly (no origin per request), cheap.
- Con: **build time** balloons with page count (100k articles = a very long build); content is **frozen** until the next build; not personalizable. -> This is exactly why **ISR** exists: keep static benefits but regenerate incrementally instead of rebuilding everything.

**SSR at scale — pros/cons:**
- Pro: always fresh, fully personalizable.
- Con: every request consumes **CPU/memory on origin** — under a traffic spike (breaking news, IPL) you need aggressive autoscaling, and a slow data source raises TTFB for everyone. You almost always must put a **CDN/edge cache with \`s-maxage\`** in front of SSR to survive scale, which reintroduces a staleness window anyway.

The real-world answer (challenge the binary): **pure SSG and pure SSR are both wrong for a large news site.** Use **ISR** (static + incremental freshness) for the bulk of content, **SSR** only for genuinely personalized/real-time routes (and cache it at the CDN with short \`s-maxage\` + \`stale-while-revalidate\`), and **CSR** for highly interactive widgets. Layer a CDN over everything.

Production angle: 15+ portals -> ISR for articles/category pages (static perf, on-publish revalidation), SSR+CDN for personalized sections, with Nginx/CDN caching absorbing spikes. Follow-up: "How do you avoid huge SSG builds?" ISR + on-demand generation (\`generateStaticParams\` for the hot pages, fall back to on-demand ISR for the long tail).`,
        },
        {
          q: "How does Next.js decide what to render on server vs client?",
          answer: `In the App Router, the **default is Server Components** — components render on the server (at build or request time) and send **HTML + a serialized result**, with **zero component JS** shipped for them. A component becomes a **Client Component** only when a file has the **\`'use client'\`** directive at the top; from that boundary down, components are bundled and hydrated in the browser.

~~~
app/ (Server Components by default)
  page.tsx            <- Server: data fetching, no JS shipped
  components/
    Chart.tsx 'use client'  <- Client: state, effects, browser APIs, hydrated
~~~

How Next decides:
1. **No \`'use client'\`** -> Server Component. Can be \`async\`, fetch data directly, access server-only resources (DB, secrets, fs), and ships no JS.
2. **\`'use client'\` at file top** -> Client Component (and everything it imports into the client bundle). Required for: \`useState\`/\`useEffect\`/hooks, event handlers, browser APIs, context providers.
3. **Route-level rendering timing** (static vs dynamic) is inferred from what you use: reading \`cookies()\`, \`headers()\`, \`searchParams\`, or \`fetch\` with \`cache: 'no-store'\`/\`revalidate\` chooses **dynamic (per-request)** vs **static** rendering. You can force it with route segment config (\`export const dynamic = 'force-dynamic' | 'force-static'\`, \`revalidate\`).

~~~jsx
// Server Component — runs on server, no JS to client
export default async function Page() {
  const data = await fetchArticle();   // direct data access
  return <Article data={data} />;
}

// Client Component — interactive, hydrated
'use client';
export function LikeButton() { const [n, setN] = useState(0); /* ... */ }
~~~

The mental model: **Server Components for data/structure/static content (ship no JS), Client Components for interactivity (ship JS).** Keep client boundaries **as low/leaf as possible** so most of the tree stays server-rendered and the JS bundle stays small. You can pass server-fetched data as props *into* client components, but props across the boundary must be **serializable** (no functions).

Why it matters: this is the lever for performance — moving interactivity to small leaves keeps the bundle tiny (great for INP/TTI). Production angle: article body, metadata, related links as Server Components (no JS); only the share button, comments, and video player as Client Components. Follow-up: "Can a Server Component import a Client Component?" Yes. "The reverse?" A Client Component can't import a Server Component directly, but can receive one as \`children\`/props (the "donut" pattern).`,
        },
      ],
      tip: "News sites are the perfect SSR/ISR use case — you live this every day.",
      rajnishAngle:
        "NBT/Maharashtra Times articles: SSR for fresh content, ISR for semi-static category pages.",
    },
    {
      title: "App Router & React Server Components",
      subtopics: [
        "Server vs client components",
        "Streaming & Suspense",
        "Server Actions",
        "Data fetching patterns",
        "App Router file conventions",
        "Navigation primitives",
      ],
      questions: [
        {
          q: "What is the difference between a Server Component and a Client Component?",
          answer: `**Server Components (RSC)** render only on the server (build or request time) and ship **zero component JavaScript** to the browser — the client receives the rendered output (an RSC payload/HTML), not the component code. **Client Components** (\`'use client'\`) are bundled and shipped to the browser, hydrated, and can use state, effects, and browser APIs.

~~~
                 Server Component         Client Component ('use client')
JS to client     none                     yes (bundled + hydrated)
Data fetching    directly (async/await)   via props or client fetch/React Query
State/effects    no (useState/useEffect)  yes
Browser APIs     no (window/localStorage) yes
Server resources DB, secrets, fs — yes    no (would leak to client)
Interactivity    no event handlers        yes (onClick, etc.)
~~~

~~~jsx
// Server Component: async, no JS shipped
export default async function ArticlePage({ params }) {
  const { slug } = await params;          // Next 16: params is a Promise
  const article = await db.getArticle(slug); // direct server data access
  return (<><ArticleBody html={article.html} /><LikeButton id={article.id} /></>);
}

// Client Component: interactive leaf
'use client';
import { useState } from 'react';
export function LikeButton({ id }) {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(!liked)}>{liked ? '♥' : '♡'}</button>;
}
~~~

Key rules / implications:
- The \`'use client'\` directive marks a **boundary**: that file and everything it imports go to the client bundle.
- Props crossing server->client must be **serializable** (no functions, Dates serialize, class instances don't).
- A Client Component **can't import** a Server Component, but can **receive one as \`children\`** (composition / "donut" pattern) so static content stays server-rendered inside an interactive shell.
- Server Components reduce bundle size and keep secrets/data-access server-side (security + performance).

Why it matters: the headline benefit is **less JS** -> faster TTI/INP, plus direct, secure server data access without an API layer. Production angle: article content/metadata as RSC (no JS), interactive bits (share, comments, video) as small client leaves. Follow-up: "Default?" Server. "When forced to client?" Any hook/event/browser API. "Can RSC use Context?" No — context is a client concept; provide it from a client provider near the root.`,
        },
        {
          q: "How does streaming work in the App Router?",
          answer: `Streaming lets the server send HTML to the browser **in chunks as it's ready**, instead of waiting for the entire page to render before sending anything. Next.js + React 18 stream the **static shell first** (fast TTFB), then **stream in** the slower, data-dependent parts as their data resolves — coordinated by **Suspense boundaries**.

~~~jsx
export default function Page() {
  return (
    <>
      <Header />                         {/* fast — flushed immediately */}
      <Suspense fallback={<Skeleton />}>
        <Recommendations />              {/* slow data — streamed in later */}
      </Suspense>
      <Suspense fallback={<AdSkeleton />}>
        <Ads />                          {/* independent — streams when ready */}
      </Suspense>
    </>
  );
}
~~~

~~~
t0:  shell + <Header/> + skeletons  ───▶ browser paints fast (good TTFB/FCP)
t1:  <Recommendations/> data ready  ───▶ stream HTML, swap skeleton
t2:  <Ads/> data ready              ───▶ stream HTML, swap skeleton
~~~

Mechanics:
- Each **Suspense boundary** is a flush point. The shell (everything not waiting) is sent first with fallbacks in place; as each boundary's data resolves, React streams that boundary's real HTML plus a tiny script to slot it in.
- **Selective hydration**: React hydrates streamed chunks independently and **prioritizes** boundaries the user interacts with first — so the page is interactive progressively, not all-or-nothing.
- A \`loading.tsx\` file is sugar for wrapping a route segment in a Suspense boundary.

Why it matters: without streaming, TTFB = time to render the *slowest* part (one slow API blocks the whole page). With streaming, users see the shell almost immediately and slow widgets fill in — much better perceived performance (FCP/LCP) and resilience to a single slow dependency.

Production angle: article shell + body stream first; recommendations, "more from this section," and ad slots each in their own Suspense boundary so a slow recommendation service never delays the article. Follow-up: "How does this interact with caching/CDN?" Streamed SSR responses are chunked/transfer-encoded; you still cache at the CDN with \`s-maxage\`, but streaming primarily improves origin TTFB and UX. "Does streaming require client JS?" The reveal scripts are tiny; the streamed content itself can be from Server Components (no component JS).`,
        },
        {
          q: "What are Server Actions and when would you use them?",
          answer: `Server Actions are **async functions that run on the server**, callable directly from components (including from a form's \`action\` or an event handler) **without you writing an API route**. They're marked with the \`'use server'\` directive. Next.js handles the RPC: the client invokes the action, Next serializes args, runs it server-side, and returns the result — with built-in integration for forms, revalidation, and progressive enhancement.

~~~jsx
// app/actions.ts
'use server';
export async function createComment(formData: FormData) {
  const text = formData.get('text');
  await db.comments.insert({ text });     // runs ONLY on server (DB, secrets safe)
  revalidatePath('/article/[slug]');      // refresh cached data after mutation
}

// in a Server Component — no client JS, works without JS (progressive enhancement)
import { createComment } from './actions';
export default function CommentForm() {
  return (
    <form action={createComment}>
      <textarea name="text" />
      <button>Post</button>
    </form>
  );
}
~~~

When to use them:
- **Mutations / form submissions** — create/update/delete without a separate REST endpoint and client fetch glue.
- **Server-side work needing secrets/DB** — keeps credentials and queries off the client.
- **Mutation + revalidation in one place** — call \`revalidatePath\`/\`revalidateTag\` right after the write so the UI reflects fresh data.
- **Progressive enhancement** — \`<form action={...}>\` works even before JS hydrates; with JS it's enhanced (pending states via \`useFormStatus\`, optimistic UI via \`useOptimistic\`).

~~~
client submits form ─▶ Next RPC ─▶ 'use server' fn runs (DB write) ─▶ revalidate ─▶ fresh UI
~~~

Trade-offs / cautions: actions are POST endpoints under the hood — apply **auth checks and input validation inside the action** (never trust the client); they're not for high-frequency reads (use data fetching/caching for that); and over-using them for everything can obscure your API surface. Validate with zod, check the session, rate-limit sensitive ones.

Production angle: comment posting, newsletter signup, save/bookmark — Server Actions that write + \`revalidateTag('comments')\`, no bespoke API routes. Follow-up: "How is this different from an API route?" Less boilerplate, type-safe call site, automatic serialization, and form/revalidation integration — but for public/third-party consumers or non-Next clients you still want real API routes.`,
        },
        {
          q: "What are the key App Router file conventions, and when do you use each one?",
          answer: `In the App Router, special file names control route behavior. Interviewers ask this because it shows whether you understand how Next.js composes route segments.

Core conventions:
- \`page.tsx\` -> route UI
- \`layout.tsx\` -> shared persistent wrapper
- \`template.tsx\` -> wrapper that remounts on navigation
- \`loading.tsx\` -> segment-level loading fallback
- \`error.tsx\` -> segment error boundary UI
- \`not-found.tsx\` -> missing resource UI

~~~text
app/
  dashboard/
    layout.tsx
    page.tsx
    loading.tsx
    error.tsx
    not-found.tsx
~~~

Key differences:
- \`layout.tsx\` preserves state across child navigations
- \`template.tsx\` remounts, so it is useful when fresh effects/state are desired
- \`loading.tsx\` works with Suspense and streaming
- \`error.tsx\` handles recoverable route-segment failures

Interview one-liner:
"App Router uses file conventions as framework primitives: page renders content, layout/template wrap segments, loading handles Suspense fallback, error handles failures, and not-found handles missing resources."`,
        },
        {
          q: "How do Link, useRouter, redirect, and notFound differ in Next.js navigation?",
          answer: `These all relate to navigation, but they operate at different layers.

- \`<Link>\` is the default declarative navigation primitive in UI
- \`useRouter()\` is for imperative navigation in client components
- \`redirect()\` is server-side navigation control flow
- \`notFound()\` aborts rendering and shows the nearest \`not-found.tsx\`

~~~jsx
import Link from "next/link";

<Link href="/articles/react">Read article</Link>
~~~

~~~jsx
'use client';
import { useRouter } from 'next/navigation';

const router = useRouter();
router.push('/dashboard');
router.refresh();
~~~

~~~jsx
import { redirect, notFound } from 'next/navigation';

if (!session) redirect('/login');
if (!article) notFound();
~~~

Best practice:
- prefer \`Link\` for normal navigation because it supports prefetching
- use \`useRouter\` when navigation depends on client-side events
- use \`redirect\`/\`notFound\` on the server for auth checks and resource validation

Interview one-liner:
"Link is declarative, useRouter is imperative on the client, redirect controls server-side navigation, and notFound renders missing-state UI."`,
        },
      ],
      tip: "RSC = zero JS sent to client for that component. This is the key mental model.",
      rajnishAngle:
        "Your RSC stream corruption debugging work is a killer story for deep Next.js knowledge.",
    },
    {
      title: "Route Handlers & Middleware",
      subtopics: [
        "route.ts handlers",
        "HTTP methods in App Router",
        "NextRequest and NextResponse",
        "Middleware use cases",
        "Auth, rewrites, and redirects",
      ],
      questions: [
        {
          q: "What is a route handler in the App Router, and how is it different from a page?",
          answer: `A route handler is defined in \`route.ts\` and handles HTTP requests directly. A \`page.tsx\` returns React UI, while a route handler returns a web response.

~~~ts
export async function GET() {
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  const body = await request.json();
  return Response.json({ saved: body });
}
~~~

Key differences:
- \`page.tsx\` is for route rendering
- \`route.ts\` is for GET/POST/PUT/DELETE style handlers
- route handlers are useful for APIs, webhooks, uploads, and integrations

Interview one-liner:
"Pages render UI, route handlers return HTTP responses. They belong to different parts of the request lifecycle."`,
        },
        {
          q: "When should you use Next.js middleware, and what should you avoid doing in it?",
          answer: `Middleware runs early in the request pipeline, so it is useful for lightweight interception such as auth redirects, rewrites, locale detection, or adding headers.

~~~ts
import { NextResponse } from "next/server";

export function middleware(request: Request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}
~~~

Good use cases:
- protecting routes
- redirecting legacy URLs
- locale or region based routing
- request rewriting and header injection

Avoid:
- heavy database queries
- long-running business logic
- large response generation

Why: middleware should stay fast because it can affect every matching request before the main route logic even starts.

Interview one-liner:
"Middleware is for lightweight request-time control like auth, redirects, and rewrites. Keep it thin and avoid expensive work."`,
        },
      ],
      tip: "Pages render UI, route handlers serve HTTP, and middleware intercepts requests early.",
      rajnishAngle: "",
    },
    {
      title: "Caching in Next.js",
      subtopics: ["Request memoization", "Data cache", "Full route cache", "Router cache", "Revalidation"],
      questions: [
        {
          q: "Explain the 4 layers of caching in Next.js App Router.",
          answer: `Next.js App Router has four caches that work together. Memorize the order: **Request Memoization -> Data Cache -> Full Route Cache -> Router Cache.** Two are server-side build/runtime caches, one is per-request, one is client-side.

~~~
1. Request Memoization (per-request, server)
2. Data Cache          (persistent, server, across requests/deploys)
3. Full Route Cache    (persistent, server, rendered HTML/RSC payload)
4. Router Cache        (in-memory, client, navigations)
~~~

1) **Request Memoization** — during a *single* server render, identical \`fetch()\` calls (same URL+options) are **deduped**: call the same fetch in layout, page, and three components -> one actual request. Scope: one request lifecycle only; cleared after. Purpose: avoid redundant fetches when prop-drilling is awkward.

2) **Data Cache** — persists \`fetch\` results **across requests and deployments** on the server. Controlled per-fetch with \`cache\`/\`next\` options:
~~~jsx
fetch(url)                                 // cached by default (force-cache)
fetch(url, { cache: 'no-store' })          // never cached (always fresh)
fetch(url, { next: { revalidate: 60 } })   // time-based revalidation
fetch(url, { next: { tags: ['article'] } })// tag for on-demand revalidation
~~~

3) **Full Route Cache** — at build/revalidation, Next caches the **rendered output** (RSC payload + HTML) of **static** routes, so they're served without re-rendering. Dynamic routes (use cookies/headers/no-store) skip this. Invalidated by \`revalidatePath\`/\`revalidateTag\` or a new deploy.

4) **Router Cache** (client) — an in-memory cache of **visited route segments** in the browser, so back/forward and prefetched links render instantly without refetching. Has its own short auto-expiry; cleared by \`router.refresh()\`, Server Action revalidation, or navigation.

~~~
request ─▶ [Router Cache hit? client] ─▶ [Full Route Cache? server]
        ─▶ render ─▶ [Data Cache? per fetch] ─▶ [Request Memo dedupes within render] ─▶ origin
~~~

Why it matters: these layers explain why "my data is stale" or "my page didn't update" — you must invalidate the *right* layer. Revalidation (\`revalidateTag\`/\`revalidatePath\`) clears Data + Full Route caches; \`router.refresh()\` clears the client Router Cache. Production angle: combine with Nginx/CDN caching for a full multi-layer stack. Follow-up: "Which changed in recent Next versions?" Defaults and the Router Cache staleness have evolved across versions — verify behavior against the installed version's docs rather than memory.`,
        },
        {
          q: "How do you opt out of caching for a specific fetch?",
          answer: `Per-fetch, pass \`cache: 'no-store'\` (or \`next: { revalidate: 0 }\`) to skip the Data Cache and always hit the origin. At the **route** level, you can force dynamic rendering so nothing is statically cached.

~~~jsx
// Per fetch — always fresh, never stored in the Data Cache:
const data = await fetch(url, { cache: 'no-store' });

// Equivalent intent via revalidate 0:
const data2 = await fetch(url, { next: { revalidate: 0 } });

// Time-based instead of full opt-out:
const data3 = await fetch(url, { next: { revalidate: 30 } }); // refresh every 30s
~~~

Route-segment level opt-outs (affect the Full Route Cache / rendering mode):
~~~jsx
export const dynamic = 'force-dynamic'; // render on every request, no static cache
export const revalidate = 0;            // disable route-level caching
export const fetchCache = 'force-no-store'; // override all fetches in this segment
~~~

Also, **using dynamic request data** implicitly opts a route out of static caching — reading \`cookies()\`, \`headers()\`, or \`searchParams\`, or using \`cache: 'no-store'\`, makes the route render dynamically per request.

~~~
no-store fetch     -> bypass Data Cache (origin every time)
force-dynamic      -> bypass Full Route Cache (render per request)
cookies()/headers()-> implicitly dynamic
~~~

When to opt out: **personalized** data (user-specific), **real-time** data (live scores, stock tickers, breaking-news ticker), or anything where staleness is unacceptable and you can't use on-demand revalidation. Otherwise prefer **caching + revalidation** (time-based or tag-based) over fully uncached — uncached fetches put load on the origin on every request, which is exactly what you're trying to avoid at scale.

Production angle: the live-updating breaking-news ticker uses \`no-store\`; the article body uses cached fetch + \`revalidateTag('article')\` on publish. Follow-up: "Difference between no-store and revalidate: 0?" Both avoid serving stale cached data; \`no-store\` explicitly never writes to the Data Cache. "Cost of over-using no-store?" You lose the Data + Full Route cache benefits and hammer the origin — use revalidation when you can.`,
        },
        {
          q: "What is the difference between revalidatePath and revalidateTag?",
          answer: `Both invalidate Next.js server caches (Data Cache + Full Route Cache) on demand, but they target differently. **\`revalidatePath(path)\`** invalidates everything cached for a **specific route/path**. **\`revalidateTag(tag)\`** invalidates **all cached fetches tagged** with that tag — across *any* routes that used it. Tags are more **surgical and cross-cutting**.

~~~jsx
// Tag fetches when you read them:
await fetch(url, { next: { tags: ['article', \`article:\${id}\`] } });

// Path-based: invalidate one route
revalidatePath('/article/breaking-news');     // refresh just this page
revalidatePath('/blog/[slug]', 'page');        // dynamic route form

// Tag-based: invalidate every page that depends on this data
revalidateTag('article');                      // ALL pages using 'article' tag
revalidateTag(\`article:\${id}\`);                // just one article, anywhere it appears
~~~

~~~
revalidatePath('/article/x') ─▶ refresh route /article/x
revalidateTag('article')     ─▶ refresh EVERY route whose fetch was tagged 'article'
                                (article page + homepage list + category page + sidebar)
~~~

When to use which:
- **\`revalidateTag\`** — the data appears in **many places** (an article shows on its own page, the homepage feed, the category list, "related" sidebars). Tag the fetch once; on publish, one \`revalidateTag('article:123')\` refreshes them **all** without you enumerating routes. This is the precise, scalable choice — analogous to CDN **surrogate keys / cache tags**.
- **\`revalidatePath\`** — you know the **exact route** to refresh and the data isn't shared widely, or you want to refresh a whole page regardless of which fetches it used.

The senior point: \`revalidateTag\` decouples invalidation from URL structure — you invalidate by **data identity**, not by knowing every page that renders it. That's why it scales for a CMS-backed site where one entity surfaces across dozens of pages.

Production angle: CMS publish webhook -> Server Action calls \`revalidateTag('article:\${id}')\` (refreshes the article page + every feed/list it appears in) and optionally triggers a CDN purge by the same tag — readers see fresh content within seconds. Follow-up: "Do these clear the client Router Cache?" They invalidate server caches; the client may also need \`router.refresh()\` or a navigation to pick up changes. "Cost of \`revalidateTag('article')\` (broad tag)?" It invalidates a lot at once — use granular tags (\`article:123\`) for targeted refreshes, broad tags only when you intend a wide refresh.`,
        },
      ],
      tip: "This is frequently asked. Memorize: Request Memoization → Data Cache → Full Route Cache → Router Cache.",
      rajnishAngle:
        "Combine this with your Nginx caching knowledge — you handle caching at multiple layers.",
    },
    {
      title: "Performance & Image Optimization",
      subtopics: ["next/image", "next/font", "Script strategy", "Bundle analysis"],
      questions: [
        {
          q: "How does next/image optimize images automatically?",
          answer: `\`next/image\` is a wrapper around \`<img>\` that automates the expensive-to-do-by-hand image optimizations that protect LCP and CLS. It handles **format conversion, resizing/responsive srcset, lazy loading, and dimension reservation** out of the box.

What it does automatically:
1. **Modern formats** — serves **WebP/AVIF** (via content negotiation on \`Accept\`) when the browser supports them — much smaller than JPEG/PNG.
2. **On-demand resizing** — generates appropriately-sized variants and emits a **\`srcset\`/\`sizes\`** so each device downloads only the resolution it needs (no shipping a 2000px image to a 360px phone).
3. **Lazy loading by default** — off-screen images load lazily (\`loading="lazy"\`); the loader fetches them as they approach the viewport.
4. **Prevents CLS** — requires \`width\`/\`height\` (or \`fill\`) so the browser **reserves space** before the image loads, eliminating layout shift.
5. **Optional blur placeholder** (\`placeholder="blur"\`) for a smooth load.
6. **Priority** for the LCP image — \`priority\` disables lazy loading and adds a high-priority preload.

~~~jsx
import Image from 'next/image';

// LCP hero — eager + preloaded
<Image src="/hero.jpg" alt="" width={1200} height={630} priority />

// responsive thumbnail — lazy, srcset by sizes
<Image src={thumb} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" />
~~~

~~~
request ─▶ next/image loader ─▶ resize + convert (WebP/AVIF) + cache
        ─▶ <img srcset=... sizes=... width height loading=lazy>
        device downloads the right size, space reserved (no CLS)
~~~

Why it matters: images are usually the **LCP element** and the **biggest bytes** on a page; doing format/size/lazy by hand across thousands of pages is error-prone. \`next/image\` makes the fast path the default. Caveats: configure \`remotePatterns\` for external hosts, set \`sizes\` correctly (a wrong \`sizes\` defeats responsive selection), and mark only the **true LCP** image \`priority\` (over-using priority hurts).

Production angle: article thumbnails and hero images across 15+ portals — WebP conversion + correct srcset + \`priority\` on the hero, \`fill\`+\`sizes\` on grid thumbs; Discover needs ≥1200px source images. Follow-up: "Does it run on the server or edge?" The optimizer runs on the server/edge and caches results; you can also plug a custom loader to a CDN's image service. "How does it help CLS specifically?" Reserved width/height via aspect ratio before load.`,
        },
        {
          q: "What are the different loading strategies for next/script?",
          answer: `\`next/script\` controls **when** a third-party script loads relative to page rendering and hydration, via the \`strategy\` prop. Choosing correctly keeps heavy third-party JS (analytics, ads, tag managers) from blocking rendering and hurting INP/TBT.

The strategies:
~~~jsx
import Script from 'next/script';

// 1) beforeInteractive — load BEFORE hydration, render-blocking-ish.
//    Only for scripts that MUST run before the page is interactive (e.g. polyfills,
//    consent/bot-detection). Must be placed in the root layout.
<Script src="/polyfill.js" strategy="beforeInteractive" />

// 2) afterInteractive (DEFAULT) — load AFTER the page becomes interactive.
//    Good for analytics, tag managers — needs to run early-ish but not block.
<Script src="https://gtm.js" strategy="afterInteractive" />

// 3) lazyOnload — load during idle time, AFTER everything else.
//    For low-priority widgets: chat, social embeds, non-critical pixels.
<Script src="https://widget.js" strategy="lazyOnload" />

// 4) worker (experimental, Partytown) — run the script in a Web Worker,
//    off the main thread entirely. Best for heavy 3rd-party that doesn't need DOM.
<Script src="https://heavy-analytics.js" strategy="worker" />
~~~

~~~
beforeInteractive : ──load──▶ [hydrate] ───────────────  (before interactive)
afterInteractive  : [hydrate] ──load──▶                  (default, after interactive)
lazyOnload        : [hydrate] ............ idle ──load──▶ (last)
worker            : runs in a Web Worker (off main thread)
~~~

How to choose (the "why"): every main-thread script competes with your app for the event loop and inflates **TBT/INP**. Default everything to \`afterInteractive\`, push non-essential widgets to \`lazyOnload\`, reserve \`beforeInteractive\` for the rare must-run-first script, and use \`worker\`/Partytown to evacuate heavy third-party JS off the main thread. Also use the \`onLoad\`/\`onReady\` callbacks to init after load, and load only what's needed.

Production angle: GTM/analytics \`afterInteractive\`; Taboola/social embeds \`lazyOnload\`; consider Partytown (\`worker\`) for the heaviest ad/analytics scripts to protect INP on the news feed. Follow-up: "How do you measure a script's cost?" DevTools Performance -> Bottom-Up, filter by the script's domain; or block it in the Network panel and compare INP. "Why not just \`async\`/\`defer\` a plain tag?" \`next/script\` adds strategy scheduling, dedupe, and worker offloading on top of those.`,
        },
        {
          q: "How do you analyze and reduce bundle size in Next.js?",
          answer: `Measure first, then attack the biggest contributors. The workflow: **analyze -> identify heavy/duplicate deps -> split, defer, and trim -> re-measure.**

**Analyze:**
- \`@next/bundle-analyzer\` — visual treemap of what's in each chunk (which dependencies dominate, duplicates, oversized modules).
~~~js
// next.config.js
const withBA = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });
module.exports = withBA({ /* ... */ });
// ANALYZE=true next build  -> opens treemaps
~~~
- Next build output (per-route **First Load JS**), Lighthouse "Reduce unused JavaScript", and Coverage tab in DevTools (unused bytes).

**Reduce (highest-leverage first):**
1. **Move interactivity to leaves / use Server Components** — code that stays in RSC ships **zero JS**. Shrinking the client boundary is the biggest App Router lever.
2. **Code-split** heavy/optional components with \`next/dynamic\` (\`ssr: false\` for client-only widgets like charts/editors/maps):
~~~jsx
const Chart = dynamic(() => import('./Chart'), { ssr: false, loading: () => <Skeleton /> });
~~~
3. **Tree-shake properly** — import only what you use; avoid barrel files that pull whole libraries. Use \`modularizeImports\`/per-path imports (e.g. \`lodash-es\` + named, or \`date-fns\` single functions, not \`import _ from 'lodash'\`).
4. **Replace heavy deps** — moment.js -> date-fns/Temporal; big chart libs -> lighter ones; drop unused polyfills.
5. **Dedupe** versions (one React, one of each lib) — analyzer reveals duplicates from mismatched transitive versions.
6. **Defer third-party** with \`next/script\` strategies / Partytown (covered separately).
7. **Dynamic import on interaction** — load modals/editors on hover/click, not upfront.

~~~
analyze (treemap) ─▶ find top offenders ─▶ {RSC-ify, dynamic import,
  swap heavy lib, fix imports, dedupe} ─▶ rebuild ─▶ compare First Load JS
~~~

Why it matters: less JS = faster parse/compile/execute = better TTI/INP, especially on mid-range mobile. Production angle: the **~22% bundle reduction** came from exactly this — analyzer revealed a heavy date lib + duplicate deps + an eagerly-loaded widget; fixes were swapping the lib, fixing barrel imports, and \`next/dynamic\` for below-the-fold modules; verified by re-running the analyzer and watching First Load JS drop. Follow-up: "How do you prevent regressions?" Add a **bundle-size budget check in CI** (e.g. size-limit / Lighthouse CI) that fails the build if First Load JS exceeds a threshold.`,
        },
      ],
      tip: "next/image lazy loads, resizes, and converts to WebP by default. Key for LCP.",
      rajnishAngle:
        "You've done this across 15+ multilingual portals — massive credibility point.",
    },
    {
      title: "What's New in Next.js 15+",
      subtopics: [
        "Async request APIs (params/searchParams/cookies)",
        "Caching defaults changed",
        "React 19 + Turbopack",
        "after(), Form, instrumentation",
        "next.config & upgrades",
      ],
      questions: [
        {
          q: "What are the important changes introduced in Next.js 15 (and 16)?",
          answer: `Next.js 15/16 brought several **breaking and impactful** changes, mostly around **async request APIs, caching defaults, React 19, and Turbopack**. (Always verify against the installed version's upgrade guide — defaults shift between releases.)

**1. Async Request APIs (the big breaking change).** \`params\`, \`searchParams\`, \`cookies()\`, \`headers()\`, and \`draftMode()\` are now **asynchronous (Promises)** — you must \`await\` them (or unwrap with React's \`use()\` in client components). This enables better streaming/PPR:
~~~jsx
// before: const { slug } = params;        (sync)
// now (Next 15/16): params is a Promise
export default async function Page({ params, searchParams }) {
  const { slug } = await params;            // MUST await
  const { q } = await searchParams;
}
// cookies()/headers() too:
const cookieStore = await cookies();
~~~

**2. Caching defaults changed — less aggressive by default.** Next 15 **flipped several caches to NOT cached by default** (a frequent source of "why is my data stale/over-cached" confusion):
~~~
Next 14 default              Next 15+ default
fetch() cached ('force-cache') -> NOT cached by default (you opt IN with cache/revalidate)
GET Route Handlers cached       -> NOT cached by default
Client Router Cache reused page -> NOT reused by default (staleTime 0 for page segments)
~~~
So you now **opt into** caching explicitly (\`fetch(url, { cache: 'force-cache' })\` or \`next: { revalidate }\`). This makes behavior more predictable but means migrated apps may hit the origin more unless you add caching back.

**3. React 19 support** — Next 15+ uses **React 19** (App Router), unlocking Actions, \`use()\`, \`ref\` as a prop, the React Compiler (opt-in), etc.

**4. Turbopack** — \`next dev --turbo\` is stable and, in Next 16, **Turbopack is the default bundler** for dev and build (much faster builds; the \`--turbopack\` flag is no longer needed). Custom webpack configs need the \`--webpack\` opt-out.

**5. New APIs / features:**
~~~
- after()  — run work AFTER the response finishes streaming (logging, analytics, revalidation)
    import { after } from 'next/server';  after(() => logAnalytics());
- <Form>   — next/form: enhanced <form> with client-side nav + prefetch for GET search forms
- instrumentation.ts — stable: register OpenTelemetry / startup hooks (+ onRequestError)
- Partial Prerendering (PPR) — static shell + streamed dynamic holes (experimental -> maturing)
- unstable_after, improved error overlays, ESLint 9 / React 19 types
- next.config.ts — typed config file supported
~~~

**6. Other upgrade notes:** \`<Link>\` no longer needs/uses legacy behavior; some config keys renamed/removed; \`fetch\` no longer auto-memoizes across the changed cache model; Node version bumps; codemods provided (\`npx @next/codemod@latest upgrade\`).

~~~
Next 15/16 themes:
  async request APIs (await params/cookies/headers)  -> breaking, enables streaming/PPR
  caching opt-IN (fetch/route handlers/router cache not cached by default)
  React 19 + Turbopack default (faster builds)
  after() / <Form> / instrumentation / PPR
~~~

Why it matters: these are **breaking** changes that affect day-to-day App Router code (awaiting params/cookies, re-adding caching you used to get for free) and signal you're current with the framework. Production angle: migrating the news app to Next 15/16 means awaiting \`params\`/\`searchParams\`/\`cookies()\` everywhere, **explicitly re-enabling caching** (\`revalidate\`/\`force-cache\`) on article/category fetches that were implicitly cached before (to keep the CDN/origin load right), using \`after()\` for post-response analytics/revalidation, and benefiting from Turbopack build speed in CI. Follow-up: "Why did caching defaults change?" To make caching explicit/predictable (the old implicit \`force-cache\` surprised people) — now you opt in. "params is a Promise — client component?" Unwrap with \`use(params)\`. "after()?" Schedule work (logging/analytics/revalidate) after the response is sent without delaying it. "Turbopack?" Default bundler in Next 16 — faster dev/build; opt out with \`--webpack\` if you have a custom webpack config.`,
        },
      ],
      tip: "Next 15+ made params/searchParams/cookies()/headers() async (await them) and made fetch/route-handler/router caching opt-in. Verify against your installed version.",
      rajnishAngle:
        "Migrating the portals to Next 15/16: await request APIs, re-enable explicit caching on article fetches, use after() for post-response work.",
    },
  ],
};
