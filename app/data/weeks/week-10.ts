import type { Week } from "../types";

export const week10: Week = {
  week: 10,
  theme: "Web Performance Engineering",
  color: "#F43F5E",
  topics: [
    {
      title: "Performance Metrics & Measurement",
      subtopics: [
        "TTFB, FCP, LCP, INP, CLS, TTI, TBT",
        "Lab vs Field data",
        "CrUX vs Lighthouse",
        "PageSpeed Insights",
        "Web Vitals JS library",
      ],
      questions: [
        {
          q: "What is the difference between TTFB and FCP?",
          answer: `**TTFB (Time To First Byte)** measures how long from navigation start until the **first byte of the response** arrives — it's a **server/network** metric (DNS + TCP + TLS + request + server processing). **FCP (First Contentful Paint)** measures until the browser renders the **first piece of content** (text, image, SVG) — it's a **client rendering** metric. TTFB is a prerequisite for FCP: FCP can't happen until bytes arrive and the browser parses enough to paint.

~~~
navigation ──▶ [DNS][TCP][TLS][request][server processing] ──▶ first byte = TTFB
            ──▶ parse HTML/CSS ──▶ first content painted     = FCP
            ──▶ largest content painted                       = LCP
~~~

~~~
            TTFB                          FCP
measures    server response latency       first pixel of content
phase       network + backend             parsing + render
fix by      caching/CDN, faster origin,   unblock render: critical CSS,
            DB/SSR optimization, TTFB      defer JS, reduce render-blocking,
            -> good < 800ms                fonts -> good < 1.8s
~~~

Why both matter and how they relate: a slow **TTFB** delays *everything* downstream (FCP, LCP) — if the server takes 2s to send the first byte, you can't paint before that. So TTFB is the foundation; FCP/LCP build on it. But a fast TTFB with heavy render-blocking CSS/JS can still have a slow FCP (bytes arrived fast, but the browser couldn't paint). You optimize them differently:
- **Improve TTFB**: cache HTML at CDN/Nginx (serve from edge), faster SSR/data fetching, ISR, reduce origin round-trips, edge rendering, connection reuse (keepalive), HTTP/2-3.
- **Improve FCP**: inline critical CSS, defer/async non-critical JS, reduce render-blocking resources, preconnect/preload, font-display.

Why it matters: shows you separate **server-side** vs **client-side** performance and know that a good TTFB is necessary but not sufficient for a good FCP. Production angle: ISR + CDN/Nginx caching drives TTFB down (article HTML from the edge), while inline critical CSS + deferred third-party JS drives FCP down — both needed for fast article rendering. Follow-up: "Which comes first?" TTFB always precedes FCP. "Good thresholds?" TTFB < 800ms, FCP < 1.8s (good). "Is TTFB a Core Web Vital?" No, but it's a key diagnostic that feeds LCP.`,
        },
        {
          q: "Why can Lighthouse score differ significantly from CrUX field data?",
          answer: `Because they measure fundamentally different things: **Lighthouse is lab (synthetic) data** — one page load on a **simulated** device/network in a controlled run — while **CrUX is field data** — aggregated from **real Chrome users** on real devices/networks over a **28-day** window at the **75th percentile**. They routinely disagree, and **CrUX is what Google uses for ranking**.

~~~
Lighthouse (lab)              CrUX (field)
one synthetic load            thousands of real sessions
simulated device + throttle   real devices (cheap -> flagship), real networks
no real user interactions     real interactions (so real INP)
weighted 0–100 SCORE          raw CWV at p75 (pass/fail)
instant feedback              28-day rolling lag
used for: debugging/CI        used for: RANKING + truth
~~~

Specific reasons they differ:
1. **Lab vs field conditions** — Lighthouse uses one fixed device/network profile; CrUX averages the full diversity of your real audience (slow Android phones on 3G included), which is usually worse than the lab simulation.
2. **INP isn't in Lighthouse** — Lighthouse has no real interactions, so it uses **TBT** as a lab proxy. Real **INP** only appears in CrUX. You can score 95 in Lighthouse and still fail INP in the field.
3. **Score vs metric** — Lighthouse's number is a **weighted composite**; CrUX reports the **actual CWV thresholds**. A high composite score doesn't mean all three CWV pass.
4. **Real content variance** — ads, personalization, A/B variants, third-party scripts, and real cache states vary in the field but not in a clean lab run.
5. **Timing lag** — a fix improves Lighthouse instantly but takes ~28 days to reflect in CrUX (and ranking).
6. **Single run variance** — one Lighthouse run is noisy; CrUX aggregates many.

~~~
Lighthouse 96 (lab)  vs  CrUX INP "poor" (field)
  -> trust CrUX for ranking; use Lighthouse to find & fix; wait for CrUX to update
~~~

The senior takeaway: **don't optimize for the Lighthouse number** — optimize the **field metrics** users actually experience (CrUX/RUM), and use Lighthouse as a **diagnostic/CI tool** to reproduce and prevent regressions. Candidates who only cite Lighthouse scores miss that ranking is field-based. Production angle: when Search Console (CrUX) flags an articleshow URL group for INP despite a good Lighthouse score, you reproduce in DevTools, fix the real interaction cost (defer third-party, yield), and watch CrUX recover. Follow-up: "How to close the gap?" Add RUM (web-vitals) so your lab work is validated against real users; test on throttled mid-range devices in lab to better approximate field. "Why p75?" Captures the slow tail, not the lucky median.`,
        },
        {
          q: "What is Total Blocking Time and how does it relate to INP?",
          answer: `**TBT (Total Blocking Time)** is a **lab** metric: the **sum of the "blocking" portions of all long tasks** (the part of each task over 50ms) between **FCP and TTI**. It quantifies how much the **main thread was blocked** during load — i.e., how unresponsive the page would be to input in that window. It's Lighthouse's **lab proxy for responsiveness**, standing in for the field metric **INP**.

~~~
Long tasks between FCP and TTI:
  task A = 120ms -> blocking = 120 - 50 = 70ms
  task B = 200ms -> blocking = 150ms
  task C = 60ms  -> blocking = 10ms
  TBT = 70 + 150 + 10 = 230ms   (sum of blocking time over 50ms threshold)
~~~

~~~
            TBT (lab)                    INP (field)
when        during LOAD (FCP->TTI)        whole page lifetime
measures    main-thread blocking time     actual interaction latency (input->paint)
source      synthetic (Lighthouse)        real user interactions (CrUX/RUM)
captures    potential unresponsiveness    real felt unresponsiveness (all 3 phases)
~~~

How they relate: both reflect **main-thread congestion**, which is the root cause of poor responsiveness. **High TBT in the lab strongly predicts poor INP in the field** because the same long tasks that inflate TBT during load are what block real interactions (inflating INP's *input delay* and *processing* phases). So TBT is the **lab signal you optimize to improve INP** — but they're not identical: TBT only covers the **load window** and **no real interactions**, while INP measures **actual interactions across the page's life** (including the *presentation* delay of rendering the result). A page can have decent TBT yet poor INP if a specific interaction's handler is heavy, or vice versa.

The practical workflow: **reduce long tasks** -> TBT drops in the lab -> INP improves in the field. Same fixes for both: break up/yield long tasks (\`scheduler.yield\`), defer/offload third-party JS (Partytown), code-split, minimize hydration/main-thread work, debounce heavy handlers, move compute to Web Workers.

~~~
fix long tasks ─▶ lower TBT (lab, measurable now) ─▶ lower INP (field, ~28d later)
~~~

Why it matters: it connects the **lab metric you can act on immediately (TBT)** to the **field metric that ranks (INP)** — demonstrating you know how to use lab signals to drive field outcomes. Production angle: Lighthouse flags high TBT from third-party ad/analytics scripts on the article page; deferring them + Partytown + yielding reduces TBT in CI and INP in CrUX. Follow-up: "Why isn't TBT a Core Web Vital?" It's lab-only and load-window-only; INP (field, whole-lifetime) replaced FID as the responsiveness CWV. "Can TBT be 0 but INP bad?" Yes — if a *post-load* interaction triggers a heavy handler not present during the load window.`,
        },
      ],
      tip: "Lab data = synthetic, controlled. Field data = real users, real devices, real networks. Google ranks on field data.",
      rajnishAngle:
        "Search Console CWV reports for NBT/Maharashtra Times — you read field data regularly.",
    },
    {
      title: "JavaScript Performance",
      subtopics: [
        "Bundle splitting",
        "Tree shaking",
        "Code splitting (dynamic import)",
        "Dead code elimination",
        "Long task detection",
      ],
      questions: [
        {
          q: "What is tree shaking and what is required for it to work?",
          answer: `**Tree shaking** is dead-code elimination at the **module level** — the bundler statically analyzes your import/export graph and **removes exports that are never imported**, so unused code doesn't ship. The term comes from "shaking the dependency tree" so dead branches fall off.

~~~js
// utils.js exports many functions
export function used() {}
export function unused() {}   // never imported anywhere

// app.js
import { used } from './utils';   // bundler includes 'used', DROPS 'unused'
~~~

**Requirements for it to work (this is the key part):**
1. **ES Modules (\`import\`/\`export\`)** — tree shaking relies on **static** structure. ESM imports/exports are statically analyzable at build time. **CommonJS (\`require\`)** is **dynamic** (you can \`require\` conditionally, compute paths) so it generally **can't be tree-shaken**. Use ESM builds of libraries (\`lodash-es\`, not \`lodash\`).
2. **No side effects (or declared \`sideEffects: false\`)** — if importing a module has side effects (runs code, registers globals, imports CSS), the bundler must keep it even if its exports are unused. Mark packages \`"sideEffects": false\` in package.json (or list the files that *do* have side effects) so the bundler can safely drop unused modules.
3. **Production mode / minifier** — the bundler marks unused exports, and the minifier (Terser) actually removes the dead code. Dev builds usually don't tree-shake.
4. **Don't defeat it** — avoid \`import * as _ from 'lib'\` + dynamic property access, and avoid **barrel files** (\`index.js\` re-exporting everything) that can pull in whole libraries or block shaking.

~~~
ESM + static imports + sideEffects:false + minify  -> dead exports removed
CommonJS / dynamic require / side effects           -> tree shaking blocked
~~~

Common real-world wins/pitfalls:
- Import **specific** functions: \`import debounce from 'lodash/debounce'\` or use \`lodash-es\` — not \`import _ from 'lodash'\` (pulls the whole lib).
- \`import { format } from 'date-fns'\` shakes well (ESM, side-effect-free); moment.js doesn't (monolithic).
- A non-tree-shakeable barrel \`export * from './everything'\` can silently bloat the bundle.

Why it matters: tree shaking is a primary lever for shrinking bundles -> faster parse/execute -> better TTI/INP, and knowing the **requirements** (ESM + no side effects) explains *why* some libraries bloat your build. Production angle: part of the bundle reduction was switching to ESM/per-path imports and fixing barrel files so unused utility code was actually shaken out; verified via the bundle analyzer. Follow-up: "Why can't CommonJS be tree-shaken?" Its exports are resolved dynamically at runtime, not statically. "What's the sideEffects flag?" Tells the bundler which modules are safe to drop when unused (CSS imports are side effects -> list them).`,
        },
        {
          q: "How does dynamic import() reduce initial bundle size?",
          answer: `**\`import()\`** is a function-like, **runtime** import that returns a Promise and tells the bundler to put the imported module in a **separate chunk** that's **loaded on demand** — not in the initial bundle. So code the user may not need immediately (routes, modals, heavy widgets) is **split out** and fetched only when actually required, shrinking the initial JS that must be downloaded, parsed, and executed before the page is interactive.

~~~js
// static import -> bundled into the INITIAL chunk (always shipped)
import Chart from './Chart';

// dynamic import -> SEPARATE chunk, fetched only when this runs
button.addEventListener('click', async () => {
  const { default: Chart } = await import('./Chart'); // loaded on demand
  renderChart(Chart);
});
~~~

~~~
without code splitting:  [---- one big initial bundle (app + chart + editor + modal) ----]
with dynamic import():   [ app core ] + (chart.js) + (editor.js) + (modal.js)  <- lazy
                          ^ small initial download                ^ fetched when needed
~~~

Why it reduces initial size and improves performance:
1. **Less initial JS** — only the code needed for first render ships upfront; everything else is deferred. Smaller initial bundle = faster download + **less parse/compile/execute on the main thread** = better TTI/INP (JS parse is a real cost on mid-range mobile).
2. **Pay-for-what-you-use** — a user who never opens the chart/editor never downloads it.
3. **Parallelizable / cacheable chunks** — split chunks cache independently; unchanged ones survive deploys.

Where to split (common cuts): **route-level** (each page its own chunk), **interaction-triggered** (modals, editors, video players loaded on click/hover), **below-the-fold** widgets, and heavy/optional libraries.

In React/Next: **\`React.lazy\` + \`Suspense\`** or **\`next/dynamic\`** wrap dynamic import with a loading fallback (and \`ssr: false\` for client-only):
~~~js
const Chart = dynamic(() => import('./Chart'), { ssr: false, loading: () => <Skeleton /> });
~~~

Pro tip — **preload on intent** to hide the fetch latency: start the dynamic import on hover/focus before the click, so the chunk is ready when the user acts.

Why it matters: dynamic import is the core mechanism of code splitting — the highest-leverage way to cut initial bundle size after tree shaking. Production angle: lazy-loading below-the-fold modules, the video player, and interactive widgets via \`next/dynamic\` contributed to the ~22% bundle reduction; verified by the analyzer's per-route First Load JS dropping. Follow-up: "Trade-off?" A loading delay when the chunk is first needed -> mitigate with preload-on-intent and a skeleton. "How does the bundler know to split?" The \`import()\` syntax is the explicit split point; webpack/Turbopack emit a separate chunk per dynamic import.`,
        },
        {
          q: "How do you find and fix long JavaScript tasks?",
          answer: `**Find** them with the DevTools Performance panel and the Long Tasks API; **fix** them by breaking work into smaller chunks, yielding to the main thread, deferring/offloading, and reducing the work itself.

**Finding long tasks (>50ms):**
1. **DevTools Performance panel** — record an interaction (with CPU 4–6x throttle + Fast 3G to mimic a mid-range phone). Long tasks are flagged with a **red triangle**; the main-thread flame chart shows what ran. Use the **Bottom-Up** tab grouped/filtered by URL/domain to attribute time to specific scripts (e.g. a third-party).
2. **Long Tasks API / PerformanceObserver** — programmatically log long tasks in the field (RUM):
~~~js
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) report('longtask', { duration: entry.duration, name: entry.name });
  }
}).observe({ type: 'longtask', buffered: true });
~~~
3. **web-vitals attribution** — the INP attribution build tells you which interaction/handler was slow in the field.

**Fixing them:**
- **Break up + yield** — split a big loop and \`await scheduler.yield()\` (or \`postTask\`/\`setTimeout\`) so each slice is <50ms and the browser can handle input/paint between slices.
~~~js
for (let i = 0; i < items.length; i++) {
  process(items[i]);
  if (i % 50 === 0) await scheduler.yield();
}
~~~
- **Offload to a Web Worker** — pure compute (parsing big JSON, sorting, image processing) off the main thread entirely.
- **Defer/lazy** — code-split (\`import()\`), defer non-critical JS, push third-party scripts to \`afterInteractive\`/\`lazyOnload\`/**Partytown** (third-party is a top long-task source).
- **Reduce the work** — memoize, virtualize long lists, avoid layout thrashing (batch DOM reads/writes), debounce/throttle expensive handlers, trim hydration (RSC ships less JS).
- **In React** — \`useTransition\`/\`useDeferredValue\` to make non-urgent updates interruptible so they don't block interactions.

~~~
detect (Perf panel / Long Tasks API) ─▶ attribute (Bottom-Up by domain)
       ─▶ fix: chunk+yield / Web Worker / defer-offload / reduce work / virtualize
       ─▶ verify (TBT in lab, INP in RUM)
~~~

Why it matters: long tasks are the direct cause of poor INP/jank; a senior answer covers **both detection (lab + field attribution) and the full fix toolbox**, then verification. Production angle: Performance panel Bottom-Up revealed third-party ad/analytics scripts and a heavy feed-processing loop as the long tasks on the article page; fixes were Partytown for the scripts, yielding in the loop, and virtualizing the feed — verified by TBT dropping in CI and INP improving in CrUX. Follow-up: "Yield vs Worker?" Yield keeps DOM-touching work on-thread but cooperative; Worker removes pure compute entirely. "How verify in the field?" RUM INP with attribution before/after.`,
        },
      ],
      tip: "Tree shaking needs ES modules (import/export). CommonJS (require) cannot be tree-shaken.",
      rajnishAngle:
        "Your 22% bundle reduction — walk through exactly how you identified and eliminated dead code.",
    },
    {
      title: "Resource Loading Optimization",
      subtopics: [
        "preload / prefetch / preconnect",
        "Resource hints",
        "fetchpriority",
        "Critical CSS",
        "Render blocking resources",
      ],
      questions: [
        {
          q: "What is the difference between preload, prefetch, and preconnect?",
          answer: `All three are **resource hints** that help the browser fetch/connect ahead of time, but they differ in **what** they do, **priority**, and **for which page**.

~~~
preload    : fetch a resource needed for the CURRENT page, NOW, at HIGH priority
prefetch   : fetch a resource likely needed for a FUTURE navigation, LOW priority (idle)
preconnect : warm up a CONNECTION (DNS + TCP + TLS) to an origin — no resource fetched
~~~

~~~html
<!-- preload: critical to THIS page (LCP image, critical font, key script) -->
<link rel="preload" as="image" href="/hero.avif" fetchpriority="high">
<link rel="preload" as="font" href="/inter.woff2" type="font/woff2" crossorigin>

<!-- prefetch: probable NEXT page/resource, fetched during idle -->
<link rel="prefetch" href="/next-article" as="document">

<!-- preconnect: warm the connection to a 3rd-party/CDN origin you'll use -->
<link rel="preconnect" href="https://cdn.example.com" crossorigin>
<link rel="dns-prefetch" href="https://cdn.example.com">  <!-- DNS only, cheaper -->
~~~

The mental model: **preload = "I need this soon (this page)."** **prefetch = "I might need this later (next page)."** **preconnect = "warm up the pipe to this host."**

Details and when to use each:
- **preload** — for **late-discovered, critical** resources on the current page: the LCP image (often a CSS \`background-image\` the parser finds late), the critical web font, a key hero script. High priority, fetched immediately. Pair with \`fetchpriority="high"\`. **Don't over-preload** — too many high-priority preloads starve the real LCP resource and waste bandwidth (a "preloaded but not used" warning means you got it wrong).
- **prefetch** — speculative, for **likely next navigations**. Low priority, only during idle, so it never competes with current-page loads. Next.js \`<Link>\` auto-prefetches in-viewport routes for instant navigation.
- **preconnect** — when you'll fetch from a **third-party/CDN origin**, warming DNS+TCP+TLS (often 100–300ms) ahead of time so the eventual request starts faster. Use \`dns-prefetch\` as a lighter/fallback hint (DNS only). Limit preconnects to a few important origins (each holds a connection).

~~~
priority:  preload (high) > normal fetches > prefetch (lowest/idle)
scope:     preload/preconnect = current page ;  prefetch = future page
~~~

Why it matters: these are precise levers for shaping the loading waterfall — used right they cut LCP and navigation latency; used wrong (over-preloading, prefetching too much) they waste bandwidth and hurt the very metrics you're optimizing. Production angle: preload the article hero image + headline font, preconnect to the image CDN and ad origins, prefetch the likely next article (Next.js Links) — improving LCP and making in-site navigation feel instant. Follow-up: "preload vs fetchpriority?" Preload changes *discovery time*; fetchpriority changes *queue priority* — use both on the LCP image. "Risk of preconnect overuse?" Each opens/holds a connection; preconnecting to many origins wastes resources — limit to the few that matter.`,
        },
        {
          q: "What makes a resource render-blocking and how do you fix it?",
          answer: `A **render-blocking** resource prevents the browser from rendering (painting) the page until it's downloaded and processed. The two classic blockers are **CSS** (blocks rendering because the browser needs the CSSOM to avoid a flash of unstyled content) and **synchronous \`<script>\`** in the \`<head>\` (blocks HTML parsing — and waits for prior CSS — pausing DOM construction).

~~~
render-blocking:
  <link rel="stylesheet" href="big.css">   -> no paint until CSSOM built
  <script src="app.js"></script>           -> pauses parsing until fetched+run

NOT render-blocking:
  <script defer> / <script async>          -> don't block parsing
  <link rel="preload">                      -> just fetches
  images, lazy iframes                      -> don't block first paint
~~~

How to fix (map each blocker to its fix):

**CSS:**
1. **Inline critical CSS** (the above-the-fold styles) in a \`<style>\` in the head so the first paint doesn't wait on a network request, and **load the rest asynchronously**:
~~~html
<style>/* critical above-the-fold CSS inlined */</style>
<link rel="preload" href="/full.css" as="style" onload="this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/full.css"></noscript>
~~~
2. **Split CSS** and load non-critical/below-the-fold styles separately (media queries, route-specific CSS).
3. **Remove unused CSS** (purge) so the critical path is smaller; avoid CSS \`@import\` (serializes requests).

**JS:**
1. **\`defer\`** — download in parallel, execute **after** parsing, in order. Best for app scripts.
2. **\`async\`** — download in parallel, execute **as soon as ready** (out of order). Best for independent scripts (analytics).
3. **Move scripts to the end of \`<body>\`** or use module/\`next/script\` strategies; push third-party to \`afterInteractive\`/\`lazyOnload\`/Partytown.

~~~
fix:  inline critical CSS + async the rest  -> CSS no longer blocks first paint
      defer/async JS                         -> parsing not blocked
      preload key assets, purge unused CSS, Brotli  -> smaller/faster critical path
~~~

Other render-path wins: **preconnect/preload** critical origins/assets, **compress** (Brotli/gzip), **reduce request count**, and ensure **fonts** use \`font-display\` so text isn't blocked (FOIT).

Why it matters: render-blocking resources are the usual reason a page is blank longer than necessary — directly hurting FCP/LCP. Knowing exactly what blocks (CSS + sync JS) and the precise fixes (inline critical CSS, defer/async) is core perf engineering. Production angle: inline critical CSS for the article header, async-load the full stylesheet, defer app JS, and push third-party to lazyOnload/Partytown so the article paints fast. Follow-up: "async vs defer?" defer = ordered, after parse (app code); async = unordered, ASAP (independent analytics). "Why is CSS render-blocking but images aren't?" CSS affects the layout/appearance of everything (FOUC risk if painted without it); images only affect their own box and can lazy-load.`,
        },
        {
          q: "How do you inline critical CSS and why does it help?",
          answer: `**Critical CSS** is the minimal set of styles needed to render the **above-the-fold** content. You **inline it directly in a \`<style>\` tag in the \`<head>\`** so the browser can paint the visible content **immediately** — without waiting for an external stylesheet to download — and you **load the full stylesheet asynchronously** afterward.

~~~html
<head>
  <style>
    /* critical: header, hero, first article — inlined, no network request */
    header { ... } .hero { ... } h1 { ... }
  </style>

  <!-- load the rest non-blocking, then promote to stylesheet -->
  <link rel="preload" href="/full.css" as="style" onload="this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/full.css"></noscript>
</head>
~~~

~~~
external CSS (blocking):     request CSS ──download──parse──▶ FIRST PAINT (delayed)
inline critical CSS:         parse inline <style> ──▶ FIRST PAINT now
                             full.css loads async in background (no block)
~~~

**Why it helps (the mechanism):** external CSS is **render-blocking** — the browser won't paint until the CSSOM is built, so a slow/large stylesheet delays **FCP/LCP** by a full network round-trip. Inlining the critical subset removes that round-trip from the critical path: the styles are already in the HTML, so the browser builds the CSSOM and paints the visible content **without any extra request**. The non-critical CSS (below-the-fold, other routes) loads asynchronously and applies when ready (it's not needed for the first paint).

How to generate it: tools like **Critical, Critters/beasties, or Penthouse** extract the above-the-fold rules at build time (per template/route). Next.js can inline critical CSS (experimental \`optimizeCss\`/beasties). You target the **specific viewport/template** since "above the fold" differs (article vs homepage, mobile vs desktop).

Trade-offs / caveats (the senior nuance):
- **Don't inline too much** — inlining the *whole* stylesheet bloats every HTML response (hurts TTFB/transfer, not cacheable separately). Inline only the **critical** subset.
- **Cacheability** — inlined CSS isn't cached across pages like an external file; that's fine for the small critical subset but wasteful at scale if overdone.
- **Maintenance** — critical CSS must be regenerated when styles change (automate in the build).
- Combine with **preload + async swap** so the full CSS arrives without blocking and without FOUC.

Why it matters: inlining critical CSS is one of the most effective FCP/LCP optimizations because it eliminates a render-blocking round-trip — and knowing the trade-off (critical subset only, automate generation) shows depth. Production angle: per-template critical CSS inlined for article/home above-the-fold, full stylesheet async-loaded — measurable FCP/LCP improvement, especially on slow connections for first-time (cold-cache) search/Discover visitors. Follow-up: "How do you decide what's critical?" Tooling extracts rules matching the above-the-fold DOM at a target viewport. "Downside of inlining everything?" Larger, non-cacheable HTML on every request — defeats the purpose; inline the minimal critical set only.`,
        },
      ],
      tip: "preload = I need this soon. prefetch = I might need this later. preconnect = warm up the connection.",
      rajnishAngle:
        "Preconnecting to CDN and preloading hero images on article pages at Times Internet.",
    },
    {
      title: "Image & Media Optimization",
      subtopics: [
        "WebP/AVIF",
        "Responsive images (srcset/sizes)",
        "Lazy loading",
        "next/image internals",
        "Video optimization",
      ],
      questions: [
        {
          q: "How does srcset work for responsive images?",
          answer: `**\`srcset\`** lets you provide **multiple image sources** and let the **browser pick the best one** for the device's screen size and pixel density — so a phone downloads a small image and a high-DPI desktop downloads a large one, instead of everyone getting one oversized file. **\`sizes\`** tells the browser **how wide the image will be displayed** at different breakpoints, which it needs to choose correctly.

Two modes:

**1. Width descriptors (\`w\`) + \`sizes\`** — for responsive layouts (most common):
~~~html
<img
  src="img-800.jpg"                         <!-- fallback -->
  srcset="img-400.jpg 400w,
          img-800.jpg 800w,
          img-1600.jpg 1600w"               <!-- candidates + their intrinsic widths -->
  sizes="(max-width: 600px) 100vw,          <!-- on phones: full viewport width -->
         (max-width: 1024px) 50vw,           <!-- on tablets: half -->
         33vw"                               <!-- desktop: a third -->
  alt="...">
~~~
The browser computes the **needed pixel width** = display width (from \`sizes\`) × device pixel ratio, then picks the smallest \`srcset\` candidate that's ≥ that. E.g. a 360px phone @2x needing ~720px picks \`img-800.jpg\`.

**2. Density descriptors (\`x\`)** — for fixed-size images (e.g. an avatar) across DPRs:
~~~html
<img src="logo.png" srcset="logo.png 1x, logo@2x.png 2x, logo@3x.png 3x" alt="">
~~~

~~~
device: 360px wide, DPR 2, sizes says 100vw -> need ~720px -> pick 800w candidate
device: 1440px desktop, sizes says 33vw -> ~475px @1x -> pick 800w (smallest >=)
~~~

Why it matters for performance: serving a single large image to everyone wastes bandwidth and slows **LCP** on mobile (your real audience). Responsive images ensure each device downloads only the resolution it needs. The common bug is a **wrong/missing \`sizes\`** — the browser then assumes \`100vw\` and may download an unnecessarily large image, defeating the optimization. Combine \`srcset\`/\`sizes\` with **modern formats** (\`<picture>\` for AVIF/WebP with JPEG fallback) for maximum savings.

~~~html
<picture>
  <source type="image/avif" srcset="img-400.avif 400w, img-800.avif 800w" sizes="100vw">
  <source type="image/webp" srcset="img-400.webp 400w, img-800.webp 800w" sizes="100vw">
  <img src="img-800.jpg" alt="" width="800" height="450"> <!-- dimensions -> no CLS -->
</picture>
~~~

Why it matters: it's the core mechanism behind responsive image optimization and a frequent LCP win on mobile; knowing the **\`sizes\` gotcha** shows real experience. Production angle: article thumbnails and hero images across portals use \`srcset\`/\`sizes\` (via \`next/image\`, which generates them) so phones get right-sized WebP/AVIF — improving mobile LCP and bandwidth. Follow-up: "Who picks the image?" The browser, based on \`sizes\` × DPR (you can't force it, which is correct — it knows the viewport/DPR). "next/image?" Auto-generates \`srcset\`/\`sizes\` + format conversion; you supply a correct \`sizes\`. "w vs x descriptors?" \`w\` for responsive/variable layouts; \`x\` for fixed display sizes across densities.`,
        },
        {
          q: "What is AVIF and how does it compare to WebP?",
          answer: `**AVIF** (AV1 Image File Format, derived from the AV1 video codec) and **WebP** are modern image formats that compress far better than JPEG/PNG. **AVIF generally compresses ~20–50% smaller than WebP** at similar quality (and much smaller than JPEG), with better detail retention, wider color/HDR support, and good transparency — but at the cost of **slower encoding** and slightly less universal (though now broad) browser support.

~~~
              JPEG      WebP            AVIF
compression   baseline  ~25-35% < JPEG  ~50% < JPEG (~20-50% < WebP)
quality       lossy     lossy+lossless  lossy+lossless, better at low bitrates
transparency  no (JPEG) yes (alpha)     yes (alpha)
HDR/wide gamut no        limited         yes (10/12-bit, HDR)
encode speed  fast      fast            SLOW (CPU-heavy)
decode speed  fast      fast            slightly slower
browser supp. universal  ~all modern     all modern (newer; near-universal now)
~~~

Trade-offs to articulate:
- **AVIF pros**: best compression (smaller files -> faster LCP, less bandwidth), superior low-bitrate quality (fewer artifacts/banding), HDR/wide-gamut, alpha.
- **AVIF cons**: **encoding is slow and CPU-intensive** — costly for **on-the-fly** optimization of many/user-uploaded images at scale; decode is marginally slower. So AVIF is ideal for **pre-encoded static assets** (hero images, marketing) where you encode once and serve many times, and less ideal where you must transcode huge volumes on the fly cheaply.
- **WebP** remains a great default: near-universal support, fast encode/decode, big savings over JPEG — a safe baseline.

The production pattern — **serve the best format the browser accepts**, with fallbacks, via content negotiation (\`Accept\` header) or \`<picture>\`:
~~~html
<picture>
  <source type="image/avif" srcset="hero.avif">
  <source type="image/webp" srcset="hero.webp">
  <img src="hero.jpg" alt="" width="1200" height="630">  <!-- JPEG fallback -->
</picture>
~~~
Image CDNs / \`next/image\` do this automatically (negotiate AVIF -> WebP -> JPEG based on \`Accept\`), so you get AVIF where supported and graceful fallback elsewhere.

Why it matters: choosing formats (and the encode-cost trade-off) directly affects LCP and bandwidth; knowing **AVIF beats WebP on size but costs more to encode** shows you weigh real operational constraints, not just "newer = better." Production angle: AVIF/WebP with JPEG fallback via the image CDN/\`next/image\` for thumbnails and heroes — AVIF for the high-traffic static heroes (encode once, big LCP win), WebP as the broad default; mindful of encode cost for high-volume user-uploaded images. Follow-up: "When NOT AVIF?" Massive on-the-fly transcoding where encode CPU/cost matters, or where the marginal size win isn't worth it — WebP suffices. "Discover images?" Serve a ≥1200px high-res source (for crawlers) while users get right-sized AVIF/WebP variants.`,
        },
        {
          q: "How does native lazy loading (loading='lazy') work and what are its limitations?",
          answer: `**\`loading="lazy"\`** is a native HTML attribute (on \`<img>\` and \`<iframe>\`) that tells the browser to **defer loading the resource until it's near the viewport**, instead of fetching it immediately during page load. The browser uses its own internal viewport-distance heuristic (similar to IntersectionObserver) to start the fetch as the element approaches the visible area — saving bandwidth and speeding initial load for below-the-fold media.

~~~html
<img src="below-fold.jpg" loading="lazy" alt="" width="800" height="450">
<iframe src="embed.html" loading="lazy"></iframe>
~~~

~~~
page load: above-fold images load now;  below-fold images NOT fetched yet
scroll ──▶ image approaches viewport ──▶ browser starts fetch (just in time)
~~~

**Benefits:** zero JS, simple, browser-optimized; reduces initial requests/bytes and main-thread work, helping load performance on long, image-heavy pages.

**Limitations (the important part):**
1. **Don't lazy-load the LCP / above-the-fold image** — lazy-loading the hero **delays LCP** (it's deferred instead of fetched eagerly). The LCP image should be \`loading="eager"\` (default) + \`fetchpriority="high"\`/preloaded. This is the #1 mistake.
2. **Heuristic, not configurable** — the trigger distance is browser-controlled; you **can't tune \`rootMargin\`** like with IntersectionObserver. Browsers often load a bit early (conservative) so users rarely see blanks, but you can't fine-tune prefetch distance or thresholds.
3. **Layout shift risk** — you **must set \`width\`/\`height\`** (or aspect-ratio); otherwise the lazily-loaded image pops in and causes **CLS**.
4. **Only images/iframes** — not background images, videos (use poster + preload metadata), or arbitrary elements; for those or for fine control (infinite scroll, ad slots, custom margins, impression tracking) use **IntersectionObserver**.
5. **Not for tiny/critical media** — lazy-loading something already in view adds a needless deferral.

~~~
✅ below-the-fold imgs: loading="lazy" + width/height
❌ LCP/hero image:      loading="eager" + fetchpriority="high" (NEVER lazy)
fine control / infinite scroll / ad slots: IntersectionObserver (custom rootMargin)
~~~

Native vs IntersectionObserver: native is simplest for plain below-the-fold images; **IntersectionObserver** gives control over trigger margins, works for any element/background, and supports infinite scroll and ad-impression tracking — so production setups often use native lazy for content images and IO for ads/feeds. \`next/image\` lazy-loads by default and lets you mark the LCP image \`priority\` to opt out.

Why it matters: knowing **when not to lazy-load (LCP)** and the **CLS/control limitations** is what separates "I added loading=lazy" from real perf engineering. Production angle: below-the-fold article images use native lazy (with dimensions to avoid CLS), the hero is \`priority\`/eager, and ad slots + infinite-scroll feeds use IntersectionObserver for custom margins and impression tracking. Follow-up: "Why does lazy-loading the hero hurt?" It defers the LCP element's fetch, pushing LCP later. "Native vs IO?" Native = simple below-fold images; IO = custom thresholds, backgrounds, infinite scroll, impressions.`,
        },
      ],
      tip: "AVIF = better compression than WebP but slower encoding. Good for static assets, not user-uploaded images.",
      rajnishAngle:
        "Thumbnail optimization across 15+ portals — WebP conversion and proper srcset implementation.",
    },
    {
      title: "Third-Party Scripts Management",
      subtopics: [
        "Script loading strategies",
        "Partytown / Web Workers",
        "GTM optimization",
        "Ad scripts (GAM)",
        "Performance impact measurement",
      ],
      questions: [
        {
          q: "How do you load third-party scripts without affecting INP?",
          answer: `Third-party scripts (ads, GTM, analytics, Taboola) run on **your main thread** and are the leading cause of **INP regressions** because their long tasks block interaction handling. The strategy: **don't load them eagerly on the main thread, defer/lazy/offload them, and measure their cost.**

Techniques, most-impactful first:
1. **Offload to a Web Worker (Partytown)** — run third-party JS in a **worker thread** so it can't block the main thread at all. Best for analytics/tag managers that mostly fire requests and don't need synchronous DOM access. This directly protects INP because the work simply isn't on the thread that handles input.
2. **Defer with loading strategies** — load after the page is interactive, or on idle:
~~~jsx
<Script src="https://gtm" strategy="afterInteractive" />   // not blocking
<Script src="https://widget" strategy="lazyOnload" />       // idle, last
<Script src="https://analytics" strategy="worker" />        // Partytown
~~~
3. **Lazy-load on visibility/interaction** — load below-the-fold ads via **IntersectionObserver** as they approach the viewport; use the **facade pattern** for heavy embeds (render a lightweight placeholder, load the real script only on click — e.g. a YouTube/chat facade).
4. **Yield around any main-thread third-party work** you control, and avoid synchronous third-party calls in your event handlers.
5. **Preconnect** to their origins so when they do load, the connection is warm (reduces their latency, though not their main-thread cost).
6. **Govern & trim** — fewer scripts = less main-thread contention; audit and remove/consolidate.

~~~
default everything ──▶ afterInteractive
non-essential widgets ──▶ lazyOnload / on-visible / facade
heavy analytics/ads ──▶ Partytown (Web Worker, off main thread)  -> protects INP
measure per-script cost ──▶ keep within a budget
~~~

**Measure** to confirm INP impact: DevTools Performance **Bottom-Up filtered by the script's domain** to attribute main-thread time; **block** the script in the Network panel and compare INP before/after; track INP with **RUM attribution** in the field to catch regressions a specific tag introduces.

Why it matters: INP is dominated by main-thread availability when the user interacts; third-party scripts are the biggest uncontrolled threat, so the senior answer is **move them off the main thread (Partytown) or off the critical path (defer/lazy/facade), then measure**. Production angle: GTM/analytics deferred or run via Partytown, ad slots lazy-loaded on-visible with reserved space, heavy embeds behind facades, and per-domain cost measured — the concrete INP-improvement story. Follow-up: "Partytown limitation?" Scripts needing synchronous DOM access can be tricky; it proxies DOM via the worker, which doesn't suit everything — test per script. "How attribute INP to a specific script?" RUM INP attribution (which target/handler) + DevTools Bottom-Up by domain + Network-block A/B.`,
        },
        {
          q: "What is Partytown and how does it work?",
          answer: `**Partytown** is a library that runs **third-party scripts inside a Web Worker** (off the main thread) instead of on the main thread, so their execution can't block your UI — eliminating the long tasks that hurt **INP/TBT**. The challenge it solves is that third-party scripts (analytics, ads, GTM) expect to access \`window\`/\`document\`/\`localStorage\` (which workers don't have), so Partytown **proxies** those DOM/global APIs from the worker back to the main thread.

How it works (the clever part):
1. Partytown loads the third-party script in a **worker**.
2. When the script touches \`window.document\`, \`localStorage\`, cookies, etc., Partytown **intercepts** those calls in the worker and forwards them to the main thread via **synchronous XHR + Service Worker** (or Atomics) to satisfy the script's **synchronous** expectations while keeping the heavy JS execution off the main thread.
3. The main thread only does the small, fast proxy operations; the script's CPU-heavy logic runs in the worker.

~~~
Normal:    main thread runs analytics.js -> long tasks -> blocks input (bad INP)

Partytown: worker runs analytics.js
             │ script reads document.title / sets cookie
             ▼ (proxied sync via SW/XHR)
           main thread: tiny proxy op only -> stays responsive
~~~

~~~jsx
// Next.js: opt a script into the worker
<Script src="https://gtm.js" strategy="worker" />   // runs via Partytown
~~~

When to use it: scripts that are **main-thread-heavy but mostly fire requests / light DOM** — **Google Tag Manager, analytics (GA), some ad/measurement pixels**. These benefit hugely because their execution leaves the main thread free for interactions.

Limitations / cautions (be balanced — interviewers like this):
- **Not all scripts work** — those needing **fast, synchronous, heavy DOM manipulation** (some ad rendering, scripts that draw UI) can break or behave oddly because the proxying adds overhead/async-ness. **Test each script.**
- The **sync-proxy mechanism** (SW + sync XHR) has its own cost and requires a Service Worker; debugging is harder.
- It's a **mitigation**, not a license to load unlimited third-parties — still audit and defer.

~~~
good fit:  GTM, GA/analytics, lightweight pixels  (request-firing, light DOM)
risky:     ad creatives / scripts doing heavy synchronous DOM/render
~~~

Why it matters: Partytown is the modern, high-leverage answer to "how do I keep third-party JS from wrecking INP" — moving it off the main thread entirely — and knowing its **limitations** shows you'd validate rather than blanket-apply it. Production angle: routing GTM/analytics through Partytown (\`strategy="worker"\`) on the news app to free the main thread for scrolling/taps, while keeping ad creatives on the main thread (lazy-loaded, reserved space) since they need synchronous DOM — net INP improvement, measured in RUM. Follow-up: "How does a worker do synchronous DOM access?" Partytown intercepts and forwards via Service Worker + synchronous XHR (or SharedArrayBuffer/Atomics) to emulate sync semantics. "Alternative to Partytown?" \`web worker\` strategy generally, or simply deferring/lazy-loading and trimming scripts.`,
        },
        {
          q: "How do you measure the performance cost of a specific third-party script?",
          answer: `Isolate the script and measure the **main-thread time it consumes** and its **impact on metrics (INP/TBT/LCP)**, using a mix of DevTools attribution, network blocking (A/B), and field RUM.

**1. DevTools Performance panel — attribute main-thread time (Bottom-Up by domain):**
- Record an interaction (with CPU 4–6x throttle + Fast 3G to mimic real devices).
- Open the **Bottom-Up** tab and **filter/group by URL or domain** — this aggregates total main-thread time spent in that third-party's scripts (scripting, evaluation, the long tasks it caused). You see exactly how many ms it cost and whether it triggered long tasks.
- The **Call Tree** / flame chart shows *where* (which functions) and *when* (during load vs interaction).

**2. Network panel — block it and A/B (the most decisive method):**
- Right-click the script's request -> **Block request URL/domain** (or use the Network request blocking panel), then reload/interact and **compare metrics with vs without** the script: TBT, INP, LCP, total blocking, long-task count. The delta is that script's cost. (Lighthouse's "Third-party usage" / "Reduce the impact of third-party code" audit does a version of this.)

**3. Long Tasks attribution** — the Long Tasks API \`attribution\` (and the Performance panel) can attribute a long task to a script source, telling you which third-party blocked the thread.

**4. Field RUM (the real proof)** — measure in production, not just lab:
- **web-vitals attribution** to see if a specific interaction's poor INP correlates with a third-party handler/long task.
- Roll the script out behind a flag / to a subset and compare **CrUX/RUM INP & LCP** with and without it (a real before/after).

~~~
DevTools Bottom-Up (group by domain)  -> total main-thread ms per third-party
Network "Block request domain" + reload -> metric delta (with vs without) = its cost
Long Tasks attribution                 -> which script caused the long task
RUM (web-vitals attribution / flagged rollout) -> field INP/LCP impact (the truth)
~~~

**Decide & act:** if a script costs significant main-thread time / worsens INP, options are: defer/lazy it, move it to a **Web Worker (Partytown)**, replace it with a lighter alternative, load it behind a **facade**, or remove it. Re-measure to confirm.

Why it matters: "we have too many scripts" is vague; a senior engineer **quantifies each one's cost** (lab attribution + block-A/B + field RUM) and makes data-driven keep/defer/offload/remove decisions. Production angle: Bottom-Up-by-domain + Network-block A/B on GTM/Taboola/ad scripts to attribute INP cost, then Partytown/lazy/facade mitigations, validated by RUM INP before/after — the measured third-party management story. Follow-up: "Why field too, not just lab?" Real devices/networks/interactions reveal costs the lab misses; ranking is field-based. "Single number for 'cost'?" Main-thread time (ms) it consumes + its INP/TBT delta from the block A/B.`,
        },
      ],
      tip: "Use Chrome DevTools → Performance → Bottom-Up tab, filter by domain to isolate third-party script cost.",
      rajnishAngle:
        "GTM, Taboola, Google Ad Manager on NBT — you've measured and mitigated their INP impact.",
    },
    {
      title: "Rendering Performance",
      subtopics: [
        "requestAnimationFrame",
        "will-change",
        "Compositing layers",
        "Layout thrashing",
        "Virtualization",
      ],
      questions: [
        {
          q: "What is layout thrashing and how do you avoid it?",
          answer: `**Layout thrashing** (forced synchronous layout / reflow thrashing) happens when JS **interleaves DOM reads and writes** so that each read **forces the browser to synchronously recompute layout** because a previous write invalidated it. In a loop, this triggers **many reflows** instead of one — a major source of jank and poor INP.

The mechanism: the browser **batches** style/layout changes and normally reflows once before the next paint. But **reading a layout property** (\`offsetHeight\`, \`getBoundingClientRect\`, \`scrollTop\`, \`clientWidth\`, \`getComputedStyle\`…) when there are **pending writes** forces the browser to flush and reflow **immediately** to give you an accurate value. Read-write-read-write defeats batching:

~~~js
// ❌ THRASHING: each read forces a reflow caused by the previous write
for (const el of boxes) {
  el.style.width = el.offsetWidth + 10 + 'px';
  //               ^read forces reflow   ^write invalidates layout -> next read reflows again
}
// N elements -> N forced reflows
~~~

~~~
read  -> (forced reflow) -> write -> read -> (forced reflow) -> write ...  (N reflows)
~~~

**The fix — batch reads, then writes** (read-all then write-all), so the browser reflows once:
~~~js
// ✅ measure everything first (reads)
const widths = boxes.map((el) => el.offsetWidth);
// then mutate (writes) — no interleaved reads -> single reflow before paint
boxes.forEach((el, i) => { el.style.width = widths[i] + 10 + 'px'; });
~~~

~~~
[read read read][write write write]  -> ONE reflow (batched)
~~~

Other avoidance techniques:
- **Cache** layout reads instead of re-reading in a loop.
- **\`requestAnimationFrame\`** to schedule writes for the next frame (do reads, then write in rAF).
- Use libraries like **FastDOM** that automatically batch reads/writes into separate phases.
- **Animate with \`transform\`/\`opacity\`** (compositor-only — no layout) instead of \`top\`/\`left\`/\`width\`/\`height\` (which reflow every frame).
- Avoid reading layout in **scroll/resize handlers** (they fire constantly); use **IntersectionObserver/ResizeObserver** which don't force reflow.

**Detect it**: DevTools Performance panel flags **"Forced reflow"** warnings and shows purple **Layout** bars; recalculate-style/layout spikes during interactions point to thrashing.

Why it matters: layout thrashing turns what should be one reflow into dozens, dropping frames and inflating INP during interactions/animations — and the fix (separate read/write phases) is a classic senior optimization. Production angle: scroll handlers and infinite-feed code that read \`getBoundingClientRect\` per item caused forced reflows on the article feed; batching reads before writes (and using IntersectionObserver instead of scroll-measuring) removed the jank. Follow-up: "Which properties force reflow?" Geometry reads — \`offsetTop/Width\`, \`scrollTop\`, \`getBoundingClientRect\`, \`getComputedStyle\`, \`clientHeight\`. "How does rAF help?" It lets you do reads, then schedule writes for the next frame so they don't interleave and force mid-frame reflows.`,
        },
        {
          q: "When should you use will-change in CSS?",
          answer: `**\`will-change\`** hints to the browser that a property is **about to be animated/changed**, so it can **prepare optimizations ahead of time** — most importantly, **promote the element to its own compositor layer** so transform/opacity animations run smoothly on the GPU without last-moment layer creation (which can cause a hitch at animation start). Use it **sparingly, just before an animation, and remove it afterward.**

~~~css
/* prepare an element that WILL animate transform */
.card { will-change: transform; }            /* promoted to its own layer */
.card:hover { transform: translateY(-6px); } /* smooth, compositor-only */
~~~

When to use it:
- On an element you're **about to animate** with \`transform\`/\`opacity\`, where you've observed a **jank/hitch at the start** of the animation (the browser creating the layer mid-animation).
- Apply it **shortly before** the animation (e.g. on hover/focus/intent or via JS right before starting), and **remove it when done** so the browser can free the layer.

~~~js
// promote on intent, remove after the animation to free GPU memory
el.style.willChange = 'transform';
el.addEventListener('transitionend', () => { el.style.willChange = 'auto'; }, { once: true });
~~~

**Why NOT to overuse it (the critical nuance — interviewers probe this):**
1. **Each promoted layer costs GPU memory.** Applying \`will-change\` to many elements (or globally, e.g. \`* { will-change: transform }\`) creates tons of layers, **exhausting GPU memory** and actually **degrading** performance — the opposite of the goal.
2. **Persistent \`will-change\`** keeps the optimization (and memory) allocated even when nothing's animating — wasteful. It's meant to be **temporary**.
3. It's a **hint, not a command** — and applying it preemptively to everything tells the browser nothing useful.

~~~
✅ targeted + temporary: add right before animating one element, remove after
❌ broad + permanent:    will-change on many/all elements -> GPU memory blowout, slower
~~~

Alternatives/related: \`transform: translateZ(0)\`/\`translate3d(0,0,0)\` is the old "force a layer" hack (\`will-change\` is the modern, intended way). The real win is **animating \`transform\`/\`opacity\`** (compositor-only) regardless; \`will-change\` just smooths the **start** of such animations on heavy elements.

Why it matters: it's a precise, easily-misused tool — the senior answer is "use it **surgically and temporarily** to avoid start-of-animation jank, never broadly, because layers cost memory." Production angle: applying \`will-change: transform\` on intent for a specific animated element (e.g. a slide-in panel/menu) and removing it after, while keeping all motion on \`transform\`/\`opacity\` so it stays on the compositor thread — smooth without GPU-memory bloat. Follow-up: "What does it actually do?" Signals upcoming change so the browser can pre-promote/pre-optimize (e.g. create the layer early). "Downside of leaving it on?" Holds GPU memory and layers indefinitely; remove when idle. "vs translateZ(0)?" Same layer-promotion effect; \`will-change\` is the standardized, more expressive hint.`,
        },
        {
          q: "How does virtual scrolling improve performance for long lists?",
          answer: `**Virtual scrolling (windowing)** renders only the **items currently visible in the viewport** (plus a small buffer), instead of rendering the **entire** list into the DOM. As the user scrolls, it **recycles**/swaps which items are rendered and uses spacers to preserve the correct scroll height. This keeps the DOM node count **small and constant** regardless of list length — so a 10,000-item list has the DOM cost of ~20 items.

~~~
Without virtualization:  10,000 items -> 10,000 DOM nodes
   -> huge memory, slow initial render, slow reflows/paints, janky scroll

With virtualization:     render ~visible 20 + buffer
   ┌─ spacer (height of items above) ─┐
   │ [item 48][item 49]...[item 67]   │ <- only these in the DOM
   └─ spacer (height of items below) ─┘
   scroll ──▶ recycle nodes, update which items render, adjust spacers
~~~

Why it improves performance:
1. **Tiny, constant DOM** — fewer nodes = far less **memory**, faster **initial render** (you don't build 10k components), and cheaper **reflow/paint/style** recalcs (which scale with DOM size).
2. **Smooth scrolling** — the browser isn't laying out/painting thousands of off-screen nodes; only the window updates.
3. **Less main-thread work** — fewer React components to reconcile/commit, helping **INP** during scroll-driven updates.

~~~jsx
// e.g. with @tanstack/react-virtual or react-window
const rowVirtualizer = useVirtualizer({ count: 10000, getScrollElement: () => parentRef.current, estimateSize: () => 80 });
return (
  <div ref={parentRef} style={{ height: 600, overflow: 'auto' }}>
    <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
      {rowVirtualizer.getVirtualItems().map((v) => (
        <Row key={v.key} style={{ position: 'absolute', top: v.start, height: v.size }} data={items[v.index]} />
      ))}
    </div>
  </div>
);
~~~

Trade-offs / caveats (the senior nuance):
- **Variable-height items** need measurement/estimation (dynamic measuring) — more complex than fixed heights.
- **Accessibility & find-in-page** — off-DOM items aren't reachable by Ctrl+F or some screen-reader navigation; ensure ARIA and consider this UX cost.
- **SEO** — virtualized (client-rendered) lists aren't fully in the HTML; fine for app UIs, but for SEO-critical content prefer SSR/pagination.
- **Scroll restoration / anchoring** and sticky headers need care.
- Use a battle-tested library (\`react-window\`, \`react-virtual\`/TanStack Virtual) rather than hand-rolling.

Why it matters: it's the standard solution for large lists/feeds and a frequent answer to "this list is slow / the tab leaks memory over a long session." Production angle: infinite-scroll article feeds on the news app — virtualization keeps the DOM bounded so long reading sessions don't bloat memory or jank scrolling (paired with IntersectionObserver to fetch the next page and lazy-load images). Follow-up: "Virtualization vs pagination?" Pagination limits data per view (simpler, SEO-friendly); virtualization renders a continuous large list efficiently (better UX for feeds) — sometimes combined. "Risk for SEO/a11y?" Off-screen items aren't in the DOM — not for SEO-critical content; ensure keyboard/AT access for the rendered window.`,
        },
      ],
      tip: "Layout thrashing = reading then writing DOM in a loop, forcing multiple reflows. Batch reads before writes.",
      rajnishAngle:
        "Infinite scroll article feeds at NBT — virtualization to avoid DOM bloat on long sessions.",
    },
  ],
};
