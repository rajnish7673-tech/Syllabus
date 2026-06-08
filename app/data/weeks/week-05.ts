import type { Week } from "../types";

export const week05: Week = {
  week: 9,
  theme: "Core Web Vitals (Deep Dive)",
  color: "#10B981",
  topics: [
    {
      title: "LCP — Largest Contentful Paint",
      subtopics: [
        "What elements count as LCP",
        "fetchpriority",
        "preload",
        "CDN & image optimization",
        "Target: <2.5s",
      ],
      questions: [
        {
          q: "What HTML elements can be the LCP element?",
          answer: `LCP measures the render time of the **largest content element visible in the viewport** during page load. Per the spec, only certain element types are considered:

~~~
LCP candidate elements:
  - <img>                          (most common on news/article pages)
  - <image> inside <svg>
  - <video> poster image
  - an element with a CSS background-image (url())
  - block-level text node containing text (a heading or large paragraph block)
~~~

Key rules to mention:
- LCP is the **largest** of these *in the viewport* — it can change as the page loads (an early text block may be LCP, then a hero image that paints later becomes the new LCP).
- It only counts content **above the fold** at paint time.
- Elements are sized by their **visible** area; an image scaled down counts at its displayed size, not intrinsic.
- Some things are **excluded**: elements with opacity 0, full-viewport backgrounds treated as background (gradients aren't candidates), and placeholder/low-entropy images may be discounted.

~~~
typical news article LCP timeline:
  t=0.4s  H1 headline (text block) -> current LCP candidate
  t=1.8s  hero image paints (larger area) -> becomes final LCP
~~~

Why it matters: to optimize LCP you must first **identify which element it is** (DevTools Performance panel marks the LCP node; web-vitals / PageSpeed reports it). Usually it's the hero image or a large headline. Then optimize *that specific element's* delivery — preload it, set \`fetchpriority="high"\`, serve it from CDN in WebP/AVIF at the right size, avoid lazy-loading it, and don't block it behind render-blocking CSS/JS.

Target: **LCP < 2.5s** at the 75th percentile (field data) for "good." Production angle: on article pages the LCP is the hero/thumbnail image — so the whole LCP strategy centers on getting that one image to paint fast (priority, preload, CDN, correct dimensions). Follow-up: "Can a text block be LCP?" Yes — a large headline/paragraph; then web-font loading (FOIT) can delay its paint, so font-display matters. "Why might LCP differ from what looks largest?" Off-screen or opacity-0 elements don't count; it's viewport- and visibility-aware.`,
        },
        {
          q: "How do you ensure the LCP image loads as fast as possible?",
          answer: `Attack every stage between navigation and the LCP image painting: **discoverability, priority, connection, bytes, and not blocking it.** The four phases of LCP are TTFB -> resource load delay -> resource load time -> render delay; optimize each.

Concrete tactics:
1. **Don't lazy-load it** — the LCP image must load eagerly. In \`next/image\` set \`priority\` (which removes \`loading="lazy"\` and adds a preload). A lazy-loaded hero is the #1 LCP mistake.
2. **\`fetchpriority="high"\`** — tells the browser this image is critical, so it's fetched ahead of other images/low-priority resources.
3. **Preload it** so it's discovered early (before the parser reaches it / when it's a CSS background):
~~~html
<link rel="preload" as="image" href="/hero.avif" fetchpriority="high" imagesrcset="...">
~~~
4. **Preconnect** to the image host/CDN to warm DNS + TCP + TLS before the request:
~~~html
<link rel="preconnect" href="https://cdn.example.com" crossorigin>
~~~
5. **Shrink the bytes** — serve AVIF/WebP, correctly sized via \`srcset\`/\`sizes\` (don't ship a 2000px image to a phone), compressed; serve from a CDN edge close to the user.
6. **Remove what blocks render** — minimize render-blocking CSS/JS before the image; inline critical CSS; defer non-critical JS so the main thread can paint.
7. **Good TTFB** — cache the HTML (ISR/CDN) so the document itself arrives fast; the image can't start until the HTML references it (unless preloaded in the head).

~~~
LCP phases:   [TTFB] -> [load delay] -> [load time] -> [render delay]
fixes:        cache    preload+priority  AVIF+CDN+size   unblock main thread
~~~

~~~jsx
// next/image — the LCP hero
<Image src={hero} alt="" width={1200} height={630} priority sizes="100vw" />
~~~

Why it matters: LCP is dominated by the hero image on content sites; these techniques routinely move LCP from >4s to <2.5s. Production angle: hero/thumbnail on article pages — \`priority\` + preconnect to CDN + AVIF + correct \`sizes\`; verify the LCP element and timing in the Performance panel / field data. Follow-up: "preload vs fetchpriority?" Preload makes it **discovered** early; fetchpriority changes its **queue priority** — use both for the LCP image. "Common regression?" Someone wraps the hero in a client component that lazy-mounts, delaying the image — keep the LCP image in the server-rendered HTML.`,
        },
        {
          q: "What is the difference between preload and prefetch for LCP?",
          answer: `Both are resource hints but with opposite intent and priority. **\`preload\`** = "I need this resource for the **current** page, fetch it **now** at high priority." **\`prefetch\`** = "I **might** need this for a **future** navigation, fetch it later at the **lowest** priority during idle time." For LCP you use **preload**, never prefetch.

~~~html
<!-- preload: critical to THIS page's render (use for LCP image, critical font) -->
<link rel="preload" as="image" href="/hero.avif" fetchpriority="high">

<!-- prefetch: speculative for the NEXT page (idle, low priority) -->
<link rel="prefetch" href="/next-article.html">
~~~

~~~
preload  : current page, HIGH priority, fetched immediately   -> LCP, critical CSS/font
prefetch : future page,  LOWEST priority, fetched when idle    -> likely next route
preconnect: warm DNS+TCP+TLS to an origin (no resource fetched)-> CDN/3rd-party host
~~~

Why preload for LCP: the LCP image (or a CSS \`background-image\`, or a late-discovered image) might otherwise be found **late** by the parser — after CSS/JS — delaying its fetch. Preloading in \`<head>\` makes the browser start downloading it **immediately**, in parallel with HTML/CSS parsing, cutting the "resource load delay" phase of LCP. Pair it with \`fetchpriority="high"\`.

Cautions (the senior nuance):
- **Don't over-preload** — preload competes for bandwidth at high priority; preloading many things starves the actual LCP resource. Preload only the *one* LCP image and truly critical assets (the critical font).
- A preload without the resource being used soon triggers a console warning ("preloaded but not used").
- For the LCP image specifically, \`next/image priority\` emits the preload for you.

Related hints to differentiate: **preconnect** (warm a connection to a host, no resource), **dns-prefetch** (just DNS), **modulepreload** (preload an ES module).

Production angle: preload the article hero image + preconnect to the image CDN; prefetch the *next* likely article for instant navigation (Next.js prefetches links in viewport automatically). Follow-up: "What happens if you preload the wrong thing?" Wasted bandwidth + delayed real LCP; measure before adding hints. "Does Next.js prefetch by default?" Yes — \`<Link>\` prefetches in-viewport routes; that's prefetch (future), distinct from your LCP preload (current).`,
        },
      ],
      tip: "The LCP element is usually a hero image or large text block. Add fetchpriority='high' to it.",
      rajnishAngle:
        "Article thumbnails and hero images on NBT/Maharashtra Times — direct experience.",
    },
    {
      title: "INP — Interaction to Next Paint",
      subtopics: [
        "What INP measures",
        "Long tasks",
        "scheduler.yield()",
        "Event handler optimization",
        "Target: <200ms",
      ],
      questions: [
        {
          q: "How is INP different from FID?",
          answer: `**FID (First Input Delay)** measured only the **input delay** of the **first** interaction — the time from the user's first tap/click to when the browser *began* processing the handler. **INP (Interaction to Next Paint)** measures the **full latency** of **(nearly) all** interactions throughout the page's life and reports a representative (worst-ish) value — from input to the **next paint** showing the result. INP **replaced FID** as a Core Web Vital in **March 2024**.

~~~
FID:  [input] -> [delay] | handler...           (only measures the delay, first interaction)
INP:  [input] -> [delay] -> [processing] -> [presentation/next paint]   (whole thing, all interactions)
~~~

Key differences:
~~~
                 FID                         INP
scope            first interaction only      all interactions (reports ~worst)
measures         input delay only            input delay + processing + render
captures         very narrow                 full responsiveness picture
status           deprecated                  current Core Web Vital (since Mar 2024)
~~~

Why the change: FID was too easy to "pass" — it ignored the processing and rendering time and only looked at the first interaction, so a janky app could still have a good FID. INP reflects what users actually feel: when you click and the UI takes 400ms to update, that's a bad INP even if FID was fine. INP's three components are **input delay** (main thread busy when input arrives), **processing time** (your event handlers running), and **presentation delay** (rendering/painting the result).

Target: **INP < 200ms** (good), 200–500ms needs improvement, >500ms poor — at the 75th percentile of field data.

How to improve INP: reduce **long tasks** that block the main thread when input arrives (split work, defer third-party JS), keep **event handlers lightweight** (don't do heavy sync work in onClick), **yield** to let the browser paint (\`scheduler.yield()\`/\`postTask\`), avoid large synchronous re-renders (use \`useTransition\`/debounce), and offload heavy compute to Web Workers.

Production angle: INP is the strongest CWV story on a news site — ads, GTM, and scroll handlers create long tasks that delay interactions; fixes were deferring third-party scripts, throttling scroll handlers, and yielding during heavy work. Follow-up: "Why is INP harder to pass than FID?" It measures processing + render across *all* interactions, so you can't hide jank. "Tools to debug INP?" Web Vitals extension (logs the slow interaction + its phases), Performance panel long-task analysis, RUM attribution.`,
        },
        {
          q: "What is a long task and how do you break it up?",
          answer: `A **long task** is any uninterrupted block of work on the main thread that runs for **>50ms**. While it runs, the thread is blocked — it can't respond to input, run other tasks, or paint — so long tasks are the primary cause of poor **INP** and jank. The 50ms threshold comes from the goal of responding to input within ~100ms.

~~~
main thread:  [-------- 250ms task --------] (user clicks here ✗ ignored until done)
              long task blocks input + paint -> INP suffers
~~~

How to break them up:

1. **Yield to the main thread** so the browser can handle pending input/paint between chunks:
~~~js
async function processLargeList(items) {
  for (let i = 0; i < items.length; i++) {
    doWork(items[i]);
    if (i % 50 === 0) await scheduler.yield(); // modern; or await new Promise(r => setTimeout(r))
  }
}
~~~

2. **Chunk + schedule** with \`setTimeout\`/\`MessageChannel\`/\`requestIdleCallback\` so each slice is <50ms and control returns to the loop between slices.

3. **\`scheduler.postTask\`** with priorities (\`'user-blocking'\`, \`'user-visible'\`, \`'background'\`) to schedule work cooperatively.

4. **Move heavy compute off-thread** — a **Web Worker** for parsing, image processing, big computations; the main thread stays free for interaction.

5. **In React** — wrap non-urgent state updates in \`useTransition\`/\`startTransition\` so React can interrupt and keep the UI responsive; \`useDeferredValue\` to render stale-but-fast; debounce/throttle expensive handlers.

6. **Defer/offload third-party scripts** (\`next/script\` strategies, Partytown) — they're a top source of long tasks you don't control.

~~~
before:  [---- 250ms ----]                 (one long task, blocks input)
after:   [40ms][yield][40ms][yield][40ms]  (input + paint can happen between)
~~~

Why it matters: splitting a 250ms task into <50ms slices with yields lets the browser process a click *between* slices — the difference between a 250ms INP and a ~50ms one. Production angle: heavy scroll/feed processing and third-party ad/analytics scripts caused long tasks on the news feed; fixes were yielding in loops, throttling scroll handlers, and offloading scripts — measurable INP improvement. Follow-up: "How do you find long tasks?" DevTools Performance panel (red-flagged >50ms bars, Bottom-Up by domain) and the \`PerformanceObserver\` longtask entry / RUM. "Yield vs Web Worker?" Yield keeps work on main thread but cooperative; Worker removes it entirely (best for pure compute with no DOM).`,
        },
        {
          q: "How does scheduler.yield() help INP?",
          answer: `\`scheduler.yield()\` lets a long-running task **voluntarily pause and hand control back to the browser** mid-execution, so the browser can process pending **user input** and **paint**, and then **resume your task where it left off**. It directly improves INP by ensuring interactions aren't stuck behind your long task.

~~~js
async function doHeavyWork(items) {
  for (const item of items) {
    process(item);
    await scheduler.yield(); // pause -> browser handles input/paint -> resume here
  }
}
~~~

~~~
without yield:  [---------- long task ----------] click waits to the end (bad INP)
with yield:     [work][yield: handle click + paint][work][yield]... (click served fast)
~~~

Why it's better than the old \`setTimeout(0)\` trick: when you yield with \`setTimeout\`, your continuation goes to the **back** of the task queue — other tasks (including newly arrived ones) can jump ahead, so your work can be starved/delayed. \`scheduler.yield()\` resumes with **higher priority** (continuation runs ahead of equal/lower-priority tasks), so you get responsiveness **without** unduly delaying your own work. It also integrates with the \`scheduler.postTask\` priority model.

How it helps INP specifically: INP's three phases are input delay, processing, and presentation. A long task inflates **input delay** (input can't even start being processed). Yielding creates frequent gaps where the browser can (a) start processing a just-arrived interaction immediately and (b) paint — collapsing input delay and presentation delay.

Practical pattern: yield periodically inside loops/heavy sequences (every N iterations or when a frame budget is exceeded), or check \`navigator.scheduling.isInputPending()\` to yield *only* when input is actually waiting:
~~~js
for (const item of items) {
  process(item);
  if (navigator.scheduling?.isInputPending()) await scheduler.yield();
}
~~~

Caveats: it's relatively new (Chromium) — feature-detect and fall back (\`await new Promise(r => setTimeout(r))\` or a \`MessageChannel\`) for unsupported browsers. Production angle: yielding during heavy feed/scroll processing so taps on the news app are handled immediately instead of waiting for the batch to finish — a concrete INP win. Follow-up: "yield vs Web Worker?" Worker removes work from the main thread entirely (best for pure compute); yield keeps it on-thread but cooperative (needed when the work touches the DOM). "Why not just debounce?" Debounce reduces how often heavy work runs; yield makes the heavy work itself non-blocking — often you use both.`,
        },
      ],
      tip: "INP replaced FID in March 2024. It measures all interactions, not just the first one.",
      rajnishAngle:
        "INP optimization is your strongest CWV story — ads, GTM deferral, scroll handler throttling.",
    },
    {
      title: "CLS — Cumulative Layout Shift",
      subtopics: [
        "What causes CLS",
        "Image dimensions",
        "Font loading (FOUT/FOIT)",
        "Dynamic content",
        "Target: <0.1",
      ],
      questions: [
        {
          q: "What are the most common causes of high CLS on news sites?",
          answer: `CLS (Cumulative Layout Shift) scores **unexpected movement of visible content** during page load/life — \`score = impact fraction × distance fraction\`, summed over "session windows." On news sites the usual culprits, in rough order:

1. **Ad slots without reserved space** — the #1 cause. Ads load asynchronously and push content down when they arrive. Reserve a fixed \`min-height\` placeholder sized to the ad.
2. **Images/videos without dimensions** — no \`width\`/\`height\` (or aspect-ratio) means the browser doesn't reserve space; the image pops in and shoves text down.
3. **Web fonts (FOUT/FOIT)** — when a custom font swaps in, different metrics reflow text (especially headlines).
4. **Dynamically injected content** — "related stories," newsletter banners, cookie/consent bars, embeds (tweets, videos), and lazy-loaded widgets inserted **above** existing content.
5. **Late-loading CSS / async components** that change layout after first paint.
6. **Actions without space reservation** — expanding accordions, "read more," or content that animates height using \`top\`/\`height\` instead of \`transform\`.

~~~
ad arrives (no reserved space):
   [headline]                 [headline]
   [paragraph]      ─────▶     [   AD    ]   <- content jumps down = CLS
   [paragraph]                 [paragraph]
~~~

Fixes (map each cause to a fix):
- **Reserve space**: explicit \`width\`/\`height\` or CSS \`aspect-ratio\` on media; \`min-height\` placeholders for ad slots and embeds.
- **Fonts**: \`font-display: optional/swap\` + preload the font + size-adjust/fallback metrics to minimize reflow.
- **Inject below the fold** or into pre-reserved containers; never insert above current content.
- **Animate with \`transform\`/\`opacity\`** (compositor-only, no layout) instead of properties that trigger reflow.
- **Cookie/consent banners**: overlay (fixed, on top) rather than pushing content.

~~~
target: CLS < 0.1 (good) at p75 field data
~~~

Why it matters: shifts cause mis-taps (user taps an ad/wrong link as content jumps) and a janky feel; it's a ranking signal. Production angle: ad slots without \`min-height\` placeholders are the recurring CLS offender on news pages — reserving slot dimensions and giving images explicit dimensions are the highest-impact fixes. Follow-up: "Do shifts after user interaction count?" Shifts within 500ms of a user input are excluded (expected movement). "How do you find the shifting element?" Performance panel "Layout Shift" entries + Web Vitals extension highlight the shifted nodes.`,
        },
        {
          q: "How does adding width/height to images prevent CLS?",
          answer: `When you specify an image's \`width\` and \`height\` (or an \`aspect-ratio\`), the browser can compute the **aspect ratio** and **reserve the correct box** in layout *before* the image bytes arrive. Without them, the image initially occupies **zero height**; when it loads, it suddenly takes up space and **pushes everything below it down** — a layout shift.

~~~html
<!-- ❌ no dimensions: box is 0 height until load, then content jumps -->
<img src="hero.jpg" alt="">

<!-- ✅ dimensions: browser reserves the aspect-ratio box up front, no shift -->
<img src="hero.jpg" alt="" width="1200" height="630">
~~~

Modern mechanism — **aspect-ratio mapping**: browsers map the \`width\`/\`height\` *attributes* to an internal \`aspect-ratio\`, so even **responsive** images (CSS \`width: 100%; height: auto\`) reserve space correctly as long as the attributes are present:
~~~css
img { width: 100%; height: auto; } /* with width/height attrs -> ratio preserved, space reserved */
~~~

~~~
no dimensions:   [text]                 load     [text]
                 [text]      ─────▶              [ image ]  <- shift (CLS)
                                                 [text]
with dimensions: [text]                 load     [text]
                 [reserved box]─────▶            [ image ]  <- no shift
                 [text]                          [text]
~~~

Why it works: layout (reflow) needs each box's size. Providing the ratio lets the layout engine allocate the final height during the **first** layout pass, so the image painting later doesn't change positions — zero contribution to CLS.

Practical notes:
- Always set \`width\`/\`height\` attributes even when CSS resizes the image (set CSS \`height: auto\` so the ratio drives the displayed height).
- Use CSS \`aspect-ratio\` for containers/placeholders where intrinsic size is unknown.
- **\`next/image\`** enforces this — it requires \`width\`/\`height\` (or \`fill\` with a sized parent) precisely to prevent CLS automatically.

Production angle: thumbnails and hero images across portals always carry explicit dimensions (via \`next/image\`) so async-loading images never shift the article text. Follow-up: "What about images of unknown size from a CMS?" Store/return dimensions with the asset, or wrap in an aspect-ratio container. "Does this also help LCP?" Indirectly — reserved layout avoids re-layout work, but LCP is more about delivery speed; CLS is about reserving space.`,
        },
        {
          q: "How does font-display: swap affect CLS?",
          answer: `\`font-display\` controls what the browser shows while a web font is downloading. \`swap\` says: **render text immediately in a fallback font (FOUT — Flash Of Unstyled Text), then swap to the web font when it loads.** This is great for **avoiding invisible text** (it eliminates FOIT and improves FCP/LCP for text), but the swap itself can **cause a layout shift (CLS)** if the fallback and web font have different metrics, because the text re-flows when the font changes.

~~~css
@font-face {
  font-family: 'Inter';
  src: url('/inter.woff2') format('woff2');
  font-display: swap; /* show fallback now, swap when ready */
}
~~~

~~~
font-display values:
  block    : hide text ~3s (FOIT) then swap  -> bad FCP, low shift risk
  swap     : fallback now, swap on load      -> good FCP, SHIFT risk on swap
  fallback : brief block, short swap window  -> compromise
  optional : fallback now, may NEVER swap    -> best for CLS (no late swap)
~~~

The CLS trade-off:
- **swap** improves text visibility (no invisible text) but the metric difference between fallback and web font (line height, glyph widths) reflows the text on swap -> CLS, especially on large headlines.
- **optional** is the most CLS-friendly: it uses the fallback and only adopts the web font if it loads almost immediately (from cache); otherwise it sticks with the fallback for that page load — **no late swap, no shift**.

How to keep \`swap\` *and* low CLS (the senior answer):
1. **Preload** the font so it arrives before/at first paint, shrinking the swap window:
~~~html
<link rel="preload" href="/inter.woff2" as="font" type="font/woff2" crossorigin>
~~~
2. **Match fallback metrics** with \`size-adjust\`, \`ascent-override\`, \`descent-override\`, \`line-gap-override\` on a \`@font-face\` fallback, or use \`next/font\` which **auto-generates a metric-matched fallback** so the swap causes ~zero shift.
3. Use \`font-display: optional\` for non-critical text where avoiding shift matters more than guaranteeing the web font.

~~~
swap without metric match:  fallback ──swap──▶ reflow (CLS)
swap + size-adjust/next-font: fallback ──swap──▶ same metrics (no shift)
~~~

Why it matters: fonts are an underrated CLS source on text-heavy news pages (headlines reflow). The modern fix is \`next/font\` (self-hosts, preloads, and metric-matches) which gives you \`swap\`'s fast text **and** near-zero CLS. Production angle: multilingual Hindi/Marathi fonts — preload + metric-matched fallbacks so headlines don't jump when the Devanagari web font swaps in. Follow-up: "swap vs optional?" swap guarantees the brand font appears (at shift risk); optional guarantees no shift (font may not appear that load). "Best overall?" Preload + \`next/font\` metric matching = best of both.`,
        },
      ],
      tip: "Ad slots without reserved space are the #1 CLS culprit on news sites.",
      rajnishAngle:
        "Ad slots on NBT without min-height placeholders cause CLS — you've dealt with this.",
    },
    {
      title: "Measuring & Monitoring CWV",
      subtopics: [
        "web-vitals library",
        "Real User Monitoring (RUM)",
        "Search Console",
        "Chrome DevTools",
        "Lighthouse vs CrUX",
      ],
      questions: [
        {
          q: "What is the difference between lab data and field data for CWV?",
          answer: `**Lab data** is measured in a **controlled, synthetic environment** (a tool simulates one device/network and loads the page) — e.g. **Lighthouse**, DevTools, WebPageTest. **Field data** is collected from **real users** on real devices/networks over time — e.g. **CrUX** (Chrome User Experience Report), and your own RUM. Google ranks on **field data (CrUX, p75)**, not lab.

~~~
                 Lab data                    Field data
source           synthetic (one device/net)  real users (many devices/nets)
tools            Lighthouse, DevTools, WPT    CrUX, web-vitals RUM, Search Console
reproducible     yes (controlled)            no (varies by user)
INP/FID          INP is "estimated" in lab    measured from real interactions
used for ranking NO                          YES (CrUX p75)
best for         debugging, CI gates          truth / ranking / monitoring
~~~

Why they differ (the crucial insight): lab loads the page **once**, often with no user interactions, on a fixed device/connection. Field data aggregates **thousands of real sessions** across cheap and flagship phones, fast and slow networks, warm and cold caches, and actual interactions. So:
- **INP** especially can look fine in lab (no real interactions to measure) but be poor in the field.
- **LCP/CLS** vary with real network/device conditions and real content (personalization, ads, A/B variants) that lab misses.
- A good Lighthouse score ≠ passing CWV — they measure different things.

How to use each correctly:
- **Field (CrUX/RUM)** = the **source of truth** and what affects ranking. Monitor p75. Use Search Console's Core Web Vitals report (CrUX-based) to see pass/fail by URL group.
- **Lab (Lighthouse)** = **debugging and prevention** — reproduce issues deterministically, find *what* to fix (opportunities/diagnostics), and gate regressions in CI (Lighthouse CI).

~~~
workflow:  field (CrUX/RUM) says LCP is bad in the wild
        -> lab (Lighthouse/DevTools) to reproduce & diagnose
        -> fix
        -> field confirms improvement (takes ~28 days for CrUX to update)
~~~

Why it matters: candidates who only quote Lighthouse scores miss that **Google uses field p75**. Production angle: read Search Console CWV (field) for the portals regularly; when it flags a URL group, reproduce in Lighthouse/DevTools, fix, then watch CrUX recover. Follow-up: "Why p75?" A few slow users dragging the 75th percentile can fail you even if the median is fine — you optimize the slow tail. "Why does CrUX lag?" It's a 28-day rolling aggregate, so improvements take weeks to reflect.`,
        },
        {
          q: "How do you set up real user monitoring for Core Web Vitals?",
          answer: `Use the official **\`web-vitals\`** library to capture LCP, INP, CLS (and TTFB/FCP) from **real users** as they happen, then send those measurements to your analytics/RUM backend, where you aggregate at **p75** by page type, device, country, etc.

~~~js
import { onLCP, onINP, onCLS, onTTFB, onFCP } from 'web-vitals';

function send(metric) {
  // metric: { name, value, id, rating, delta, attribution }
  const body = JSON.stringify(metric);
  // use sendBeacon so it isn't dropped on unload
  (navigator.sendBeacon && navigator.sendBeacon('/rum', body)) ||
    fetch('/rum', { body, method: 'POST', keepalive: true });
}

onLCP(send); onINP(send); onCLS(send); onTTFB(send); onFCP(send);
~~~

Key implementation details (the parts that matter):
- **Report on the right moment** — CLS and INP accumulate over the page's life, so the library reports the **final** value on \`visibilitychange\`/page hide. Use **\`navigator.sendBeacon\`** (or \`fetch(..., {keepalive:true})\`) so the report survives the page unloading.
- **Use the attribution build** (\`web-vitals/attribution\`) to capture *why* — which element was the LCP, which interaction/target caused the worst INP, which node shifted for CLS. This turns RUM from "INP is 400ms" into "INP is 400ms on the comment button" — actionable.
- **Send dimensions** alongside the value: page template, device type, effective connection type, country, A/B variant, logged-in vs anonymous — so you can slice.
- **Aggregate at p75**, not average — that's what Google uses; averages hide the slow tail.

In Next.js, you can use the built-in **\`useReportWebVitals\`** hook:
~~~jsx
'use client';
import { useReportWebVitals } from 'next/web-vitals';
export function WebVitals() { useReportWebVitals((m) => send(m)); return null; }
~~~

~~~
real user ─▶ web-vitals captures LCP/INP/CLS (+attribution)
          ─▶ sendBeacon('/rum') on page hide
          ─▶ store -> dashboard: p75 by page type/device/country
~~~

Why it matters: RUM is the only way to see what users actually experience (lab can't), and attribution tells you exactly what to fix. Production angle: \`web-vitals\` + a \`dataLayer\` push sending LCP/INP/CLS into GA4/BigQuery, dashboarded at p75 by template (articleshow vs homepage) and device — the same field truth Google ranks on, but with element-level attribution. Follow-up: "Why p75 not avg?" The slow tail determines ranking and felt experience. "Beacon vs fetch?" Beacon is fire-and-forget on unload and won't block navigation; critical for capturing final CLS/INP.`,
        },
        {
          q: "What is CrUX and how does it differ from Lighthouse scores?",
          answer: `**CrUX (Chrome User Experience Report)** is Google's public dataset of **real-world** Core Web Vitals collected from **opted-in Chrome users** browsing your site. It's **field data**, aggregated over a **28-day rolling window**, reported at the **75th percentile**, and it's what Google uses for the **page-experience ranking signal**. **Lighthouse** is a **lab tool** that loads your page once in a **simulated** environment and produces a **0–100 performance score** plus diagnostics.

~~~
                 CrUX                          Lighthouse
data type        field (real users)           lab (synthetic, one run)
metrics          LCP/INP/CLS at p75           LCP/TBT/CLS/FCP/SI -> weighted SCORE
window           28-day rolling               single load, right now
device/network   real, varied                 simulated (e.g. Moto G, slow 4G)
INP              measured (real interactions)  not measured (TBT proxy in lab)
used for ranking YES                          NO
access           Search Console, PSI, CrUX API, BigQuery   DevTools, PSI, CI
~~~

Why your Lighthouse score can disagree with CrUX (a top interview question):
1. **Lab vs field** — Lighthouse simulates one device/network; CrUX averages thousands of real, varied conditions (cheaper phones, worse networks, real caches).
2. **INP isn't in Lighthouse** — Lighthouse uses **TBT** as a lab proxy; real INP (from actual user interactions) only shows in CrUX. So you can have a 95 Lighthouse score and still fail INP in CrUX.
3. **Score vs metric** — Lighthouse's number is a **weighted composite**; CrUX reports the **raw CWV** pass/fail. A high score doesn't mean all three CWV "pass."
4. **Real content** — ads, personalization, A/B variants, third-party scripts vary in the field but not in a clean lab run.
5. **Timing** — CrUX lags ~28 days; a fix won't show in CrUX (or ranking) for weeks even though Lighthouse improves instantly.

~~~
Lighthouse 98 (lab)  but  CrUX INP "poor" (field)  -> trust CrUX for ranking,
use Lighthouse to find & fix, then wait ~28 days for CrUX to reflect it.
~~~

How to use both: **CrUX = truth/ranking/monitoring** (via Search Console's CWV report, PageSpeed Insights' "field data" section, or the CrUX API); **Lighthouse = diagnosis and CI gating**. Production angle: when Search Console (CrUX) flags an articleshow URL group for INP, reproduce/diagnose in Lighthouse + DevTools, ship the fix, and watch CrUX recover over the next month. Follow-up: "Where do you get CrUX data?" Search Console, PSI, the CrUX API (per-URL/origin), and the public BigQuery dataset. "Why might a low-traffic page have no CrUX data?" CrUX needs enough samples; sparse URLs fall back to origin-level data.`,
        },
      ],
      tip: "Field data (CrUX) is what Google actually uses for ranking. Lab data (Lighthouse) is for debugging.",
      rajnishAngle:
        "You can describe the RUM setup you did or would do at Times Internet using web-vitals + dataLayer.",
    },
    {
      title: "Google Discover & SEO Signals",
      subtopics: [
        "Page experience ranking",
        "NewsArticle schema",
        "Image requirements (1200px)",
        "Freshness signals",
      ],
      questions: [
        {
          q: "What Core Web Vitals thresholds matter for Google ranking?",
          answer: `Google's page-experience signal uses the three Core Web Vitals at their **"good" thresholds**, measured at the **75th percentile of field (CrUX) data** over 28 days. All three should be in "good" for the best signal.

~~~
Metric  Good       Needs improvement   Poor       (measured at p75, field)
LCP     ≤ 2.5s     2.5s – 4.0s         > 4.0s
INP     ≤ 200ms    200ms – 500ms       > 500ms
CLS     ≤ 0.1      0.1 – 0.25          > 0.25
~~~

Key facts to state:
- **p75** — the threshold must be met by 75% of page loads; the slow 25% tail is what you fight. A good median with a bad tail still fails.
- **Field, not lab** — CrUX, not Lighthouse, feeds ranking.
- **INP replaced FID in March 2024** as the responsiveness CWV; the old FID threshold (≤100ms) is retired.
- Page experience is **one of many** ranking signals, and **content relevance still dominates**. CWV is a **tiebreaker / boost**, not a magic ranking lever — but at scale (and for Discover/news) it's meaningfully impactful.
- Both **mobile and desktop** have CrUX data; mobile is usually the binding constraint.

~~~
all three "good" at p75  ─▶ positive page-experience signal
any one "poor"           ─▶ drags the URL group; fix the slow tail
~~~

Why it matters: interviewers want the exact numbers AND the nuance that it's p75 field data and a tiebreaker, not a dominant factor. Quoting "<2.5s / <200ms / <0.1, p75, CrUX" precisely signals you actually operate this. Production angle: monitor these per URL group in Search Console; for news, CWV also gates **Discover/Top Stories** eligibility indirectly via page experience. Follow-up: "Does passing CWV guarantee ranking gains?" No — it's a tiebreaker among relevant results; content quality and links matter more, but CWV can differentiate close competitors and affects Discover. "Why 75th percentile?" To represent the experience of the large majority while still accounting for the slower tail, not just the lucky median.`,
        },
        {
          q: "What structured data is required for Google Discover eligibility?",
          answer: `Google Discover and Top Stories don't *require* structured data to appear, but **\`NewsArticle\` (or \`Article\`) JSON-LD structured data** strongly improves eligibility and presentation, and Google's news guidelines effectively expect it for rich treatment. The key pieces:

~~~json
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "Concise headline (<= ~110 chars)",
  "image": [
    "https://cdn.example.com/16x9-1200w.jpg",
    "https://cdn.example.com/4x3-1200w.jpg",
    "https://cdn.example.com/1x1-1200w.jpg"
  ],
  "datePublished": "2026-06-07T08:00:00+05:30",
  "dateModified": "2026-06-07T09:30:00+05:30",
  "author": [{ "@type": "Person", "name": "Reporter Name" }],
  "publisher": {
    "@type": "Organization",
    "name": "Publication",
    "logo": { "@type": "ImageObject", "url": "https://.../logo.png" }
  }
}
</script>
~~~

What matters most for Discover (and common interview points):
- **\`NewsArticle\` type** with **headline, image(s), datePublished/dateModified, author, publisher**.
- **High-resolution images ≥ 1200px wide** — this is a hard, frequently-missed requirement (see next question). Provide multiple aspect ratios (16:9, 4:3, 1:1).
- **\`max-image-preview:large\`** robots meta is effectively required for large image previews in Discover:
~~~html
<meta name="robots" content="max-image-preview:large">
~~~
- **Accurate \`datePublished\`/\`dateModified\`** (freshness signals — Discover favors fresh, and consistent dates in schema + visible byline + sitemap matter).
- **Unique, compelling content** and E-E-A-T signals (author info, publisher identity).
- A **news sitemap** and Top-Stories eligibility (valid AMP not required anymore, but performance/page-experience helps).

~~~
Discover eligibility levers:
  NewsArticle JSON-LD + images ≥1200px + max-image-preview:large
  + accurate publish/modified dates + good page experience (CWV)
  + E-E-A-T (author/publisher) + content quality
~~~

Why it matters: Discover is a huge traffic source for news; getting schema + large images + freshness right is the difference between a card with a big image (high CTR) and no surfacing at all. Production angle: ensuring every articleshow page emits valid \`NewsArticle\` JSON-LD with ≥1200px multi-ratio images and \`max-image-preview:large\` — directly tied to Discover traffic spikes (e.g. cricket/IPL). Follow-up: "Is AMP required for Top Stories?" No — that requirement was removed; non-AMP pages are eligible if they meet news/page-experience criteria. "How do you validate?" Rich Results Test + Search Console's enhancement reports.`,
        },
        {
          q: "How do you ensure article images qualify for Discover?",
          answer: `Google Discover requires **large, high-quality images** and explicit permission to show them at large size. The concrete rules:

1. **Image width ≥ 1200px.** This is the hard threshold — images narrower than 1200px won't get the large-card treatment (often no surfacing). Provide a genuinely high-res source, not an upscaled small one.
2. **Enable large previews** with the robots meta (or \`X-Robots-Tag\`):
~~~html
<meta name="robots" content="max-image-preview:large">
~~~
Without this, Google won't display the large image even if it's ≥1200px.
3. **Declare images in \`NewsArticle\` structured data** (multiple aspect ratios — 16:9, 4:3, 1:1 — at ≥1200px so Google can pick the best crop):
~~~json
"image": ["https://cdn/.../16x9-1600w.jpg", "https://cdn/.../1x1-1200w.jpg"]
~~~
4. **Compelling, relevant, non-logo images** — Discover favors high-quality editorial images over text-in-image or logos; the image should represent the story.
5. **Crawlable & fast** — image URL must be indexable (not blocked by robots.txt), served from a reliable CDN, in an efficient format (WebP/AVIF) and properly sized so it loads fast (also helps LCP/CWV, which feed page experience).

~~~
qualify checklist:
  [ ] source image ≥ 1200px wide
  [ ] <meta name="robots" content="max-image-preview:large">
  [ ] image(s) in NewsArticle JSON-LD, multiple ratios
  [ ] high-quality editorial image (not logo/upscaled)
  [ ] crawlable, CDN-served, WebP/AVIF, fast
~~~

The trade-off to manage: a 1200px+ image is large bytes, which can hurt **LCP** — so serve it via the image CDN in **AVIF/WebP** with proper **\`srcset\`/\`sizes\`** (the Discover crawler gets the high-res; real users get a right-sized variant), and mark the on-page hero \`priority\`/preloaded. You satisfy Discover (high-res source available) *and* CWV (optimized delivery).

Why it matters: Discover image eligibility is a high-leverage, frequently-missed lever on regional news sites — fixing it (≥1200px + max-image-preview:large + schema) can unlock large-card placement and big CTR. Production angle: this is exactly the gap often seen on Hindi/Marathi news sites — thumbnails under 1200px or missing \`max-image-preview:large\`; fixing it drove Discover traffic (cricket/IPL spikes). Follow-up: "Why might a ≥1200px image still not show large?" Missing \`max-image-preview:large\`, blocked by robots, or not the article's primary/structured image. "Does this conflict with performance?" No, if you serve a high-res source for crawlers but responsive optimized variants to users.`,
        },
      ],
      tip: "Discover requires images ≥ 1200px wide. This is often missed on Hindi news sites.",
      rajnishAngle:
        "NBT's Discover traffic (IPL/cricket spikes) — you have real data here. Use it.",
    },
  ],
};
