import type { Week } from "../types";

export const week06: Week = {
  week: 3,
  theme: "Browser, CSS & Web APIs",
  color: "#EC4899",
  topics: [
    {
      title: "Critical Rendering Path",
      subtopics: ["DOM → CSSOM → Render tree", "Reflow vs repaint", "Compositing layers", "will-change"],
      questions: [
        {
          q: "What triggers a reflow vs a repaint?",
          answer: `**Reflow (layout)** = the browser recomputes the **geometry** (size/position) of elements. **Repaint (paint)** = the browser redraws **pixels** without changing geometry. Reflow is more expensive because it can cascade to ancestors/descendants and is always followed by a repaint; a repaint alone is cheaper; a **composite-only** change is cheapest.

~~~
Reflow triggers (geometry changes):           Repaint triggers (visual only):
  width/height, padding/margin, border           color, background-color
  top/left/right/bottom (position)               visibility, outline, box-shadow
  font-size, line-height, text content           border-color
  display, position changes                      (no layout change)
  adding/removing DOM nodes                    Composite-only (cheapest, GPU):
  reading layout (offsetTop, getBoundingClientRect) transform, opacity
  window resize, font load                       will-change'd transform/opacity
~~~

~~~
pipeline:  JS -> Style -> Layout(reflow) -> Paint(repaint) -> Composite
  change geometry  -> run ALL stages (expensive)
  change color     -> skip Layout, run Paint + Composite
  change transform -> skip Layout + Paint, only Composite (cheapest)
~~~

The key performance rule: **animate with \`transform\` and \`opacity\`** because they're handled by the **compositor thread on the GPU** — no layout, no paint, no main-thread work — so they're smooth even under load. Animating \`top\`/\`left\`/\`width\` forces reflow every frame (jank).

**Forced synchronous layout / layout thrashing** — a critical gotcha: reading a layout property (\`offsetHeight\`, \`getBoundingClientRect\`) **forces a synchronous reflow** if there are pending style changes. Doing read-write-read-write in a loop forces multiple reflows:
~~~js
// ❌ thrashing: each read forces a reflow after the previous write
for (const el of els) { el.style.width = el.offsetWidth + 10 + 'px'; }
// ✅ batch: read all, then write all
const widths = els.map(el => el.offsetWidth);
els.forEach((el, i) => el.style.width = widths[i] + 10 + 'px');
~~~

Why it matters: reflows on the main thread cause dropped frames and poor INP. Production angle: scroll handlers and infinite-feed code that read layout in a loop cause thrashing; the fix is batching reads before writes and using \`transform\` for any movement. Follow-up: "How do you spot forced reflow?" DevTools Performance flags "Forced reflow" / purple layout bars. "Why is transform cheap?" It's a compositor operation on an already-painted layer — no re-layout/re-paint.`,
        },
        {
          q: "How does CSS transform/opacity avoid triggering reflow?",
          answer: `\`transform\` and \`opacity\` can be handled entirely by the **compositor thread** on the **GPU**, operating on a layer that's **already been laid out and painted**. Changing them doesn't alter document geometry or pixel content of the layer — it just re-composites (moves/blends) an existing texture — so the browser **skips the Layout and Paint stages** of the rendering pipeline.

~~~
Rendering pipeline:
  JS ─▶ Style ─▶ Layout ─▶ Paint ─▶ Composite
  width/top change:  run Layout + Paint + Composite   (expensive, main thread)
  color change:      skip Layout, run Paint + Composite
  transform/opacity: skip Layout + Paint, ONLY Composite  (GPU, off main thread)
~~~

Why transform doesn't reflow: a CSS \`transform\` (translate/scale/rotate) **does not change the element's position in the layout flow** — siblings don't move, the box model is untouched. It visually offsets the rendered layer at composite time. Contrast with \`top/left\`, which change the actual layout position and force reflow of potentially many elements.

Why opacity doesn't repaint the content: opacity is applied as a **blend** on the layer's existing texture during compositing — the pixels of the element aren't redrawn; the compositor just changes alpha.

The catch — **layer promotion**: this is only cheap if the element is on its **own compositor layer**. The browser auto-promotes some elements; you can hint promotion with \`will-change: transform\` or \`transform: translateZ(0)\`. Without a layer, the browser may still need to paint. But over-promoting (too many layers) costs GPU memory — so use \`will-change\` sparingly and remove it after the animation.

~~~css
/* smooth, compositor-only animation */
.card { transition: transform .2s, opacity .2s; }
.card:hover { transform: translateY(-4px); opacity: .9; }

/* animating these instead would reflow/repaint every frame: */
/* .card:hover { top: -4px; height: 110%; }  ❌ jank */
~~~

Why it matters: compositor-only animations run at 60fps even when the main thread is busy (great for INP), whereas layout-animating properties drop frames. Production angle: hover/scroll micro-interactions and any movement use \`transform\`/\`opacity\` so they don't compete with ads/feed JS on the main thread. Follow-up: "When is will-change worth it?" Right before an animation on a heavy element; remove it afterward to free GPU memory. "Does transform always avoid paint?" If content inside changes (e.g. text) it still paints; transform/opacity changes alone don't.`,
        },
        {
          q: "What is the critical rendering path and how do you optimize it?",
          answer: `The **Critical Rendering Path (CRP)** is the sequence of steps the browser takes to turn HTML, CSS, and JS into pixels on screen. Optimizing it means getting **meaningful content painted as fast as possible** by minimizing what blocks that first render.

~~~
CRP steps:
  1. HTML  -> parse -> DOM
  2. CSS   -> parse -> CSSOM        (render-blocking)
  3. DOM + CSSOM -> Render Tree     (only visible nodes)
  4. Layout  (geometry)
  5. Paint   (pixels)
  6. Composite (layers -> screen)

  JS can block parsing; CSS blocks rendering (and JS execution).
~~~

What blocks the first paint:
- **CSS is render-blocking** — the browser won't paint until the CSSOM is built (to avoid FOUC), so large/late CSS delays render.
- **Synchronous \`<script>\`** blocks HTML parsing (and waits for CSSOM) — it pauses DOM construction.

Optimization techniques (map each to what it removes):
1. **Inline critical CSS** (above-the-fold) in the \`<head>\` and **defer/async the rest** so the first paint doesn't wait on the full stylesheet.
2. **\`async\`/\`defer\` scripts** so JS doesn't block parsing — \`defer\` runs after parse in order; \`async\` runs ASAP out of order. Move non-critical JS out of the critical path.
3. **Minify & compress** HTML/CSS/JS (Brotli/gzip) — fewer bytes = faster CSSOM/DOM.
4. **Reduce critical resources & their bytes** — fewer render-blocking files, smaller CSS, code-split JS.
5. **Preload** critical assets (LCP image, key font) and **preconnect** to needed origins.
6. **Fast TTFB** — cache HTML (ISR/CDN) so step 1 starts quickly.
7. **Avoid \`@import\` in CSS** (serial requests) and large unused CSS (purge).

~~~
goal: shrink time-to-first-meaningful-paint
  inline critical CSS + defer rest  -> CSSOM ready fast
  defer/async JS                    -> DOM not blocked
  preload LCP image + font          -> discovered early
  Brotli + fewer/smaller files      -> less to download/parse
~~~

Why it matters: the CRP determines FCP/LCP; render-blocking CSS/JS is the usual reason a page is "blank" longer than necessary. Production angle: inline critical CSS for the article header, defer non-critical JS/third-party, preload the hero image and the headline font, Brotli-compress HTML — all to paint the article fast. Follow-up: "async vs defer?" defer = execute after parsing, preserve order, good for app scripts; async = execute as soon as fetched, no order, good for independent analytics. "Why is CSS render-blocking but images aren't?" CSS affects layout of everything (FOUC if painted without it); images only affect their own box (and can lazy-load).`,
        },
      ],
      tip: "Use transform and opacity for animations — they run on the GPU compositor thread.",
      rajnishAngle: "",
    },
    {
      title: "CSS Layout & Modern Techniques",
      subtopics: ["Flexbox vs Grid", "Container queries", "CSS layers", "logical properties"],
      questions: [
        {
          q: "When would you use Grid vs Flexbox?",
          answer: `**Flexbox is for one-dimensional layout** (a row OR a column) — distributing items along a single axis. **Grid is for two-dimensional layout** (rows AND columns simultaneously) — placing items into a defined grid. They're complementary, not competitors; real layouts use both.

~~~
Flexbox (1D):  →→→  items flow along ONE axis, wrap optionally
   [ a ][ b ][ c ]            navbars, toolbars, button groups,
                              centering, card internals

Grid (2D):     ┌──┬──┬──┐    explicit rows + columns at once
               │a │b │c │     page layouts, photo/article grids,
               ├──┼──┼──┤     dashboards, form alignment
               │d │e │f │
               └──┴──┴──┘
~~~

Choose **Flexbox** when:
- Content flows in a single direction (horizontal nav, vertical stack).
- You want items to size based on their **content** and distribute leftover space (\`flex-grow/shrink/basis\`).
- Alignment/centering along one axis; order-agnostic toolbars.

Choose **Grid** when:
- You need **rows and columns** to line up together (a true layout grid).
- You want to **place** items precisely (\`grid-template-areas\`, line numbers) independent of source order.
- Responsive card galleries: \`repeat(auto-fill, minmax(250px, 1fr))\` gives intrinsic responsive columns with no media queries.

~~~css
/* Grid: responsive card gallery, no media queries */
.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }

/* Flex: navbar — distribute along one axis */
.nav { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
~~~

The senior framing: **Grid for the macro page structure, Flexbox for the micro component internals.** E.g. a Grid defines the article page regions (header/main/sidebar/footer), and within the header a Flexbox lays out logo + nav + actions. Combining them is the norm.

Why it matters: picking the right tool yields simpler, more robust, less media-query-heavy CSS. Production angle: article grid/section layouts use Grid (\`auto-fill/minmax\` for responsive columns), while cards, bylines, and toolbars use Flexbox. Follow-up: "Can Flexbox do 2D?" Only via wrapping, which doesn't align across rows — that's Grid's job. "subgrid?" Lets a nested grid align to the parent's tracks — useful for card content lining up across a gallery.`,
        },
        {
          q: "What are CSS container queries and how do they differ from media queries?",
          answer: `**Media queries** respond to the **viewport** (or device) size. **Container queries** respond to the size of a **containing element**. This lets a component adapt to the **space it's actually placed in**, regardless of the overall screen — true component-based responsiveness.

~~~css
/* establish a query container */
.card-wrapper { container-type: inline-size; container-name: card; }

/* the card restyles based on ITS container's width, not the viewport */
@container card (min-width: 400px) {
  .card { display: grid; grid-template-columns: 120px 1fr; }
}
@container card (max-width: 399px) {
  .card { display: block; } /* stacked when the slot is narrow */
}
~~~

~~~
Media query:  responds to VIEWPORT
   same component looks the same regardless of where it's placed

Container query: responds to PARENT CONTAINER
   [ wide main column ]  -> card = horizontal (image beside text)
   [ narrow sidebar   ]  -> SAME card = stacked (image above text)
~~~

The fundamental difference and why it matters: with media queries, a card placed in a wide main area and the same card placed in a narrow sidebar must share viewport-based breakpoints — so the component can't know its real available width. It leads to brittle, context-coupled CSS (the component must "know" the page layout). Container queries make components **self-contained and reusable** — drop the same card anywhere and it adapts to its slot. This is the missing piece for true design-system/component reuse.

Practical notes:
- You must declare a **container** (\`container-type: inline-size\` for width-based queries; \`size\` for both dimensions).
- **\`cqw\`/\`cqi\` units** size relative to the container (like \`vw\` but container-relative).
- Well-supported in modern browsers now; provide a sensible fallback for very old ones.

Why it matters / interview signal: it shows you think in **components**, not pages — the modern way to build responsive design systems. Production angle: a shared article-card component reused across NBT/Maharashtra Times in different column widths (main feed, sidebar, related) adapts via container queries instead of duplicating viewport breakpoints per placement. Follow-up: "Container vs media — when still use media?" Page-level layout, global breakpoints, things tied to the actual device (print, orientation). "Performance cost?" Negligible; the engine recalcs the contained subtree on container resize.`,
        },
        {
          q: "What are CSS cascade layers?",
          answer: `**Cascade layers (\`@layer\`)** give you explicit control over the **cascade priority** by grouping rules into named layers whose order *you* define — independent of specificity and source order. Within the cascade, **layer order beats specificity**: a rule in a later layer wins over a rule in an earlier layer **even if the earlier rule has higher specificity**.

~~~css
/* define order once — later layers win */
@layer reset, base, components, utilities;

@layer base {
  a { color: blue; }              /* specificity (0,0,1) */
}
@layer utilities {
  .text-red { color: red; }       /* lower specificity (0,1,0)? still WINS */
}
/* utilities layer is later -> .text-red beats the more-specific-looking base rule */
~~~

~~~
cascade priority (high -> low):
  1. !important (reversed layer order)
  2. inline styles
  3. LAYER ORDER  <-  later layer wins, regardless of specificity
  4. specificity (only compares WITHIN the same layer / unlayered)
  5. source order
unlayered styles rank ABOVE layered ones (act like a top layer)
~~~

Why it solves a real problem: large codebases/design systems fight **specificity wars** — third-party CSS or a \`.btn.btn-primary#id\` selector overrides your utility, and people resort to \`!important\`. Layers let you declare intent: "utilities should always beat components, components should beat base/reset" — and it just works, no specificity hacks. You can also wrap third-party CSS in a low-priority layer so your styles reliably override it.

~~~css
/* tame a third-party stylesheet by putting it in a low layer */
@import url("vendor.css") layer(vendor);
@layer vendor, app;   /* app always wins over vendor */
~~~

Practical points:
- **Unlayered styles win over layered ones** (they behave like the highest layer) — so migrate intentionally.
- **\`!important\`** reverses the layer precedence (important declarations in *earlier* layers win) — keep using it rarely.
- Great for: design systems, integrating vendor CSS, and replacing fragile \`!important\`/specificity tricks.

Why it matters / signal: knowing layers shows you understand the **cascade** deeply and can architect maintainable CSS at scale. Production angle: structuring a shared design system across portals as \`reset, base, components, utilities\` layers so utility classes reliably override component defaults without specificity battles, and wrapping legacy/vendor CSS in a low layer. Follow-up: "Layers vs specificity?" Layer order is checked *before* specificity, so it's a stronger, more predictable lever. "Do layers replace BEM/utility methodologies?" No — they complement them by removing override ambiguity.`,
        },
      ],
      tip: "Grid for 2D layout, Flexbox for 1D. Container queries are the modern way to build responsive components.",
      rajnishAngle:
        "Multilingual RTL/LTR layouts for Hindi/Marathi content — CSS logical properties matter here.",
    },
    {
      title: "Browser Storage & APIs",
      subtopics: [
        "localStorage vs sessionStorage vs IndexedDB vs cookies",
        "Service Workers",
        "Web Workers",
        "Intersection Observer",
      ],
      questions: [
        {
          q: "When would you use IndexedDB over localStorage?",
          answer: `Use **IndexedDB** when you need to store **large amounts of structured data**, store **non-string types** (objects, blobs, files), query/index data, or do it **asynchronously without blocking the main thread**. Use **localStorage** only for **small, simple, synchronous key-value strings** (a few KB of config/flags).

~~~
                 localStorage           IndexedDB
data model       string key-value only  structured objects, blobs, files
size limit       ~5–10 MB               large (hundreds of MB+, quota-based)
API              synchronous (BLOCKS)   asynchronous (non-blocking)
querying         none (manual)          indexes, cursors, ranges, transactions
types            strings (JSON.stringify) native objects/Blob/ArrayBuffer
use case         theme, flags, tokens?  offline data, caches, large datasets
~~~

Why localStorage is limited (the "why"):
- It's **synchronous** — every read/write **blocks the main thread**, so storing/parsing large JSON janks the UI (hurts INP). IndexedDB is async (callbacks/promises), so it doesn't block.
- It only stores **strings** — you must \`JSON.stringify\`/\`parse\` everything (CPU cost, and you can't store Blobs/Files).
- It has **no querying** — you'd load the whole blob and filter in JS.
- ~5–10MB cap vs IndexedDB's large quota.

Choose **IndexedDB** for: offline-first data (cached articles for offline reading), large/structured datasets, files/images/blobs, anything needing indexes or transactions, or anything big enough that synchronous access would jank.

~~~js
// IndexedDB is verbose — use a wrapper like 'idb' in practice
import { openDB } from 'idb';
const db = await openDB('news', 1, {
  upgrade(db) { db.createObjectStore('articles', { keyPath: 'id' }); }
});
await db.put('articles', { id: 123, title, bodyBlob });  // async, structured
const a = await db.get('articles', 123);
~~~

Caveats: both are **origin-scoped** and **not secure storage** — never store secrets/auth tokens in either (XSS can read them; use HttpOnly cookies for tokens). IndexedDB's raw API is clunky, so use **\`idb\`**/Dexie. Service Workers commonly pair with IndexedDB + the Cache API for offline.

Why it matters: shows you match the storage tool to data size/shape/perf. Production angle: caching article content/images for offline reading and a "saved articles" feature uses IndexedDB (large, structured, blobs, async); small UI prefs use localStorage. Follow-up: "sessionStorage?" Like localStorage but cleared on tab close, per-tab. "Cache Storage API vs IndexedDB?" Cache API stores Request/Response pairs (great for SW asset/HTML caching); IndexedDB stores arbitrary structured data — often used together.`,
        },
        {
          q: "How do Web Workers help with performance?",
          answer: `**Web Workers run JavaScript on a background thread**, separate from the main (UI) thread. Because JS is single-threaded on the main thread — where rendering, input, and your app logic all compete — moving **heavy CPU work** to a worker keeps the main thread free to handle interactions and paint, directly improving **INP** and eliminating jank from long tasks.

~~~
Main thread:  UI + input + rendering + your JS  (everything competes here)
              heavy compute here -> LONG TASK -> frozen UI, bad INP

Web Worker:   [ heavy compute runs here, off-thread ]
              main thread stays responsive; results posted back
~~~

~~~js
// main.js
const worker = new Worker('worker.js');
worker.postMessage({ rows: bigDataset });        // hand off work (structured clone)
worker.onmessage = (e) => render(e.data);         // get result, update UI

// worker.js
onmessage = (e) => {
  const result = expensiveTransform(e.data.rows); // runs off the main thread
  postMessage(result);
};
~~~

What workers are great for: parsing/processing large JSON, image/video manipulation, encryption/hashing, data transforms/sorting on big datasets, syntax highlighting, search indexing — **pure CPU work** that doesn't need the DOM.

Key constraints (the "why you can't just move everything"):
- **No DOM access** — workers can't touch \`window\`/\`document\`; they communicate via \`postMessage\`.
- **Data is copied** by **structured clone** (or **transferred** for ArrayBuffers via Transferables, which is zero-copy) — large copies have a cost, so design coarse-grained messages.
- Spawning/communication has overhead — use for *substantial* work, not tiny tasks.

Related: **Service Workers** (a special worker for network/caching/offline) and **Partytown** (runs **third-party scripts** in a worker to keep analytics/ads off the main thread — a direct INP win for content sites).

Why it matters: the main-thread budget is the scarce resource for responsiveness; workers are how you parallelize CPU work without blocking UI. Production angle: offloading heavy third-party scripts via Partytown (worker), and processing large feed/analytics payloads in a worker so the news feed stays responsive (better INP). Follow-up: "Worker vs scheduler.yield?" Yield keeps work on the main thread but cooperative (needed if it touches the DOM); a worker removes it from the main thread entirely (best for pure compute). "Transferables?" Move an ArrayBuffer to the worker without copying — efficient for big binary data.`,
        },
        {
          q: "How does Intersection Observer work? Where have you used it?",
          answer: `**IntersectionObserver** asynchronously notifies you when a target element **enters or leaves** the viewport (or a specified root), **without** scroll-event polling. It runs off the main-thread scroll path and batches callbacks, so it's far more efficient than listening to \`scroll\` and calling \`getBoundingClientRect\` (which forces reflow and runs on every scroll tick).

~~~js
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      loadImage(entry.target);     // element is visible -> act
      observer.unobserve(entry.target); // one-shot: stop watching
    }
  }
}, {
  root: null,            // null = viewport
  rootMargin: '200px',   // pre-load 200px BEFORE it enters (prefetch margin)
  threshold: 0.1,        // fire when 10% visible
});

document.querySelectorAll('img[data-src]').forEach((el) => observer.observe(el));
~~~

~~~
viewport
┌───────────────┐  rootMargin: 200px  -> start loading before it's on screen
│   visible     │
└───────────────┘
   [ img ]  <- isIntersecting=true when it crosses threshold -> callback
~~~

Why it's better than scroll listeners: a \`scroll\` handler fires constantly and typically reads layout (\`getBoundingClientRect\` -> forced reflow) on the main thread = jank and bad INP. IntersectionObserver computes intersections internally, **batches** results, and delivers them asynchronously — no per-frame main-thread layout reads.

Common uses (name several):
- **Lazy-loading images/ads** as they approach the viewport (with \`rootMargin\` to prefetch just before visible).
- **Infinite scroll** — observe a sentinel element at the list end; when it intersects, fetch the next page.
- **Impression tracking / viewability** — fire an analytics/ad-impression event when content is actually seen (threshold-based).
- **Reveal-on-scroll animations**, sticky-header triggers, active-section highlighting in docs.

Config knobs: \`root\` (custom scroll container), \`rootMargin\` (grow/shrink the trigger box — negative to fire when fully in view), \`threshold\` (0–1 or array for multiple fire points).

Why it matters: it's the efficient, modern primitive for visibility-based work — central to performance on long pages. Production angle: lazy-loading article images and ad slots (with a \`rootMargin\` prefetch buffer), infinite-scroll feeds via a sentinel, and ad-impression/viewability tracking — all via IntersectionObserver instead of costly scroll handlers. Follow-up: "Difference from ResizeObserver/MutationObserver?" ResizeObserver watches size changes, MutationObserver watches DOM changes — same async, batched design philosophy. "Native lazy loading vs IO?" \`loading="lazy"\` covers images/iframes simply; IO gives finer control (custom margins, infinite scroll, impressions).`,
        },
      ],
      tip: "Intersection Observer for lazy loading ads and images — very common in your domain.",
      rajnishAngle:
        "Lazy loading article images and ad slots at Times Internet is a real answer.",
    },
    {
      title: "Web Storage & Window APIs (Deep Dive)",
      subtopics: [
        "localStorage vs sessionStorage vs cookies",
        "Storage event",
        "Cookie attributes",
        "Important window methods",
        "timers / rAF / matchMedia",
      ],
      questions: [
        {
          q: "Explain localStorage vs sessionStorage vs cookies in detail — when to use each.",
          answer: `All three persist data in the browser, but they differ in **lifetime, scope, size, who can read them, and whether they're sent to the server.** Getting these distinctions right is a very common interview question.

~~~
                 localStorage        sessionStorage       cookies
lifetime         until cleared        until tab closes     Expires/Max-Age (or session)
                 (persists forever)   (per-tab)            set explicitly
scope            per origin           per origin PER TAB   per domain (+ path)
                 (shared across tabs) (each tab isolated)
capacity         ~5–10 MB             ~5–10 MB             ~4 KB total (tiny!)
sent to server   NO                   NO                   YES — on EVERY request (auto)
JS access        yes (sync API)       yes (sync API)       yes via document.cookie
                                                           (unless HttpOnly)
data type        strings only         strings only         strings only
~~~

**localStorage** — persistent key-value, **shared across all tabs/windows** of the same origin, survives browser restarts. Synchronous string API:
~~~js
localStorage.setItem('theme', 'dark');
localStorage.getItem('theme');       // 'dark'
localStorage.setItem('user', JSON.stringify(obj)); // objects -> JSON.stringify
JSON.parse(localStorage.getItem('user'));
localStorage.removeItem('theme'); localStorage.clear();
~~~
Use for: user preferences (theme, language), non-sensitive UI state, caching small non-critical data. **Never store auth tokens/PII** (readable by any XSS).

**sessionStorage** — same API, but scoped to a **single tab** and **cleared when the tab closes**. A new tab = a fresh, empty sessionStorage (not shared). Use for: per-tab state (a multi-step form/wizard, scroll position, a tab-specific flow) that shouldn't leak across tabs.

**cookies** — small (~4KB) strings **automatically sent to the server on every matching request** (that's their defining trait and their cost). Set via \`Set-Cookie\` (server) or \`document.cookie\` (client):
~~~js
document.cookie = 'lang=hi; Max-Age=2592000; Path=/; Secure; SameSite=Lax';
~~~
Use for: **anything the server needs per request** — primarily **authentication/session** (as \`HttpOnly; Secure; SameSite\` cookies so JS can't read them and they're CSRF-safe), server-side personalization, A/B bucket. **Don't** use cookies for large client-only data — they add weight to every request.

~~~
choose by the question "who needs it and for how long?":
  server needs it per request (auth/session)        -> cookie (HttpOnly+Secure+SameSite)
  client-only, persist across tabs/restarts          -> localStorage
  client-only, per-tab, clear on close               -> sessionStorage
  large/structured/offline                           -> IndexedDB (see other Q)
~~~

Important extras (the senior details):
- **All three are origin-scoped and NOT secure storage** — XSS can read localStorage/sessionStorage and non-HttpOnly cookies. Auth tokens belong in **HttpOnly cookies**, never localStorage.
- **Synchronous** — localStorage/sessionStorage block the main thread; storing/parsing large JSON janks the UI (use IndexedDB for big data).
- **\`storage\` event** — fires on **other** tabs when localStorage changes, enabling cross-tab sync (e.g. logout-everywhere): \`window.addEventListener('storage', e => ...)\`. It does NOT fire in the tab that made the change, and sessionStorage's storage event is per-tab.
- **Cookies bloat requests** — every cookie is sent on every request to the domain (including images/assets unless on a cookieless subdomain) — a perf consideration on high-traffic sites.

Why it matters: the lifetime/scope/server-sent/security trade-offs determine correctness and security; the senior answer ties each to a use case and flags the **auth-token-in-localStorage** anti-pattern. Production angle: theme/language in localStorage, a per-tab article-wizard state in sessionStorage, the session/auth in HttpOnly+Secure+SameSite cookies, large offline article cache in IndexedDB — and a \`storage\`-event listener to sync logout across tabs. Follow-up: "Why not store JWT in localStorage?" XSS can read it; use HttpOnly cookies. "Cross-tab communication?" \`storage\` event (or BroadcastChannel). "Cookie size limit?" ~4KB each, ~50 per domain — keep them tiny; they're sent every request.`,
        },
        {
          q: "What are the most important window object methods and properties to know?",
          answer: `\`window\` is the **global object** in browsers (the global scope; \`var\` globals and global functions become properties of it). Knowing its key APIs is core frontend literacy. Grouped by purpose:

~~~
TIMERS
  setTimeout(fn, ms) / clearTimeout(id)        — run once after delay (macrotask)
  setInterval(fn, ms) / clearInterval(id)      — run repeatedly
  requestAnimationFrame(fn) / cancelAnimationFrame(id) — run before next paint (smooth anim)
  requestIdleCallback(fn)                      — run during idle time (low-priority work)
  queueMicrotask(fn)                           — schedule a microtask

LOCATION / NAVIGATION / HISTORY
  window.location  (href, pathname, search, hash, origin; assign/replace/reload)
  window.history   (pushState, replaceState, back, forward, go)  — SPA routing
  window.open(url) / window.close()

DIMENSIONS / SCROLL
  window.innerWidth / innerHeight              — viewport size
  window.scrollX / scrollY, scrollTo(), scrollBy()
  window.devicePixelRatio                      — DPR (retina) for responsive images
  window.visualViewport                        — mobile zoom/keyboard-aware viewport

DIALOGS (avoid in prod — blocking)
  alert() / confirm() / prompt()

STORAGE / OBSERVERS / NETWORK (on window)
  localStorage / sessionStorage
  fetch(), XMLHttpRequest
  IntersectionObserver, ResizeObserver, MutationObserver, PerformanceObserver

MESSAGING / WORKERS
  postMessage()  — cross-window/iframe/worker communication
  BroadcastChannel — cross-tab messaging (same origin)
  Worker, navigator.serviceWorker

UTIL / GLOBALS
  window.matchMedia('(max-width:600px)')       — JS media queries (responsive logic)
  structuredClone()                            — deep clone
  crypto.randomUUID(), crypto.subtle           — IDs / hashing
  navigator (userAgent, language, onLine, geolocation, clipboard, sendBeacon)
  console, getComputedStyle(el)
~~~

The ones interviewers probe most (know these cold):
1. **Timers + rAF** — \`setTimeout\`/\`setInterval\` (and clearing them — leak prevention), and **\`requestAnimationFrame\`** for animations (runs right before paint, ~60fps, pauses on hidden tabs — far smoother than \`setInterval\` for visual work). \`requestIdleCallback\` for deferring low-priority work.
2. **\`matchMedia\`** — run JS conditionally on breakpoints (responsive behavior, \`prefers-color-scheme\`, \`prefers-reduced-motion\`):
~~~js
const mq = window.matchMedia('(prefers-color-scheme: dark)');
mq.matches;                          // boolean
mq.addEventListener('change', (e) => applyTheme(e.matches));
~~~
3. **\`history.pushState\`/\`replaceState\`** — the basis of **client-side routing** (SPAs/Next.js update the URL without a reload); pair with the \`popstate\` event.
4. **\`postMessage\` / BroadcastChannel** — safe cross-origin iframe / cross-tab communication (validate \`event.origin\`!).
5. **\`navigator.sendBeacon\`** — fire-and-forget data on page unload (analytics/RUM) that survives navigation — critical for capturing final CWV.
6. **Observers on window** — IntersectionObserver (lazy load/visibility), ResizeObserver (size changes), MutationObserver (DOM changes), PerformanceObserver (long tasks/CWV).
7. **Key events** — \`load\`, \`DOMContentLoaded\`, \`beforeunload\`, \`visibilitychange\`, \`resize\`, \`scroll\`, \`storage\`, \`online\`/\`offline\`, \`popstate\`, \`hashchange\`, \`unhandledrejection\`.

~~~
window = global object + browser APIs:
  timing (timers/rAF/idle) · location/history (routing) · dimensions/scroll
  · matchMedia (responsive) · postMessage/BroadcastChannel (messaging)
  · observers · sendBeacon · navigator · events
~~~

The "why" to convey: \`window\` is where the browser exposes its capabilities; a senior dev reaches for the **right** API — \`rAF\` not \`setInterval\` for animation, \`matchMedia\` not resize-listening for breakpoints, \`sendBeacon\` not \`fetch\` on unload, observers not scroll handlers. Production angle: \`requestAnimationFrame\` for smooth scroll/animation, \`matchMedia\` for responsive/reduced-motion logic, \`history.pushState\` under client routing, \`navigator.sendBeacon\` to ship web-vitals on page hide, \`visibilitychange\` to pause polling/video when the tab is hidden. Follow-up: "rAF vs setInterval for animation?" rAF syncs to the display refresh, pauses when hidden, avoids dropped frames. "Detect dark mode in JS?" \`matchMedia('(prefers-color-scheme: dark)')\`. "Send analytics on unload?" \`sendBeacon\` (survives the page going away).`,
        },
      ],
      tip: "localStorage/sessionStorage are synchronous string stores; cookies are tiny and sent to the server on every request. Never store auth tokens in localStorage.",
      rajnishAngle:
        "Theme/lang in localStorage, per-tab flows in sessionStorage, HttpOnly auth cookies, web-vitals via sendBeacon — real choices on the news app.",
    },
    {
      title: "DOM Events, Shadow DOM & Page Lifecycle",
      subtopics: [
        "Event bubbling vs capturing",
        "Event delegation",
        "CustomEvent",
        "DOMContentLoaded / load / beforeunload / unload",
        "Shadow DOM basics",
      ],
      questions: [
        {
          q: "What is event bubbling vs capturing in the DOM?",
          answer: `When an event happens on an element, it travels through the DOM in **phases**:

1. **Capturing phase** — from \`window\`/document down toward the target
2. **Target phase** — the event reaches the actual clicked/focused element
3. **Bubbling phase** — from the target back up through ancestors

~~~html
<div id="parent">
  <button id="child">Click</button>
</div>
~~~

~~~js
parent.addEventListener("click", () => console.log("parent bubble"));
parent.addEventListener("click", () => console.log("parent capture"), true);
child.addEventListener("click", () => console.log("child"));
~~~

Possible order:
~~~text
parent capture
child
parent bubble
~~~

The default for \`addEventListener\` is **bubbling**. Passing \`true\` (or \`{ capture: true }\`) listens in the capturing phase.

Why bubbling matters: it lets ancestor elements respond to events from descendants, which is exactly what powers **event delegation**. Why capturing matters: it gives a parent a chance to intercept/log/handle the event on the way down.

Useful controls:
- \`event.stopPropagation()\` -> stops the event from moving further up/down
- \`event.stopImmediatePropagation()\` -> also stops other listeners on the same node
- \`event.preventDefault()\` -> stops the browser's default action, not propagation

Why it matters: bubbling/capturing is foundational DOM knowledge, and interviewers often use it to test whether you truly understand how browser events propagate rather than just memorizing \`onClick\`. Follow-up: "Do all events bubble?" No — some like \`focus\` and \`blur\` do not bubble (though \`focusin\`/\`focusout\` do).`,
        },
        {
          q: "What is event delegation and why is it useful?",
          answer: `**Event delegation** means attaching one listener to a **common ancestor** instead of many listeners to individual children, then using \`event.target\` or \`closest()\` to figure out which child triggered it. It works because most DOM events **bubble**.

~~~html
<ul id="list">
  <li data-id="1">A</li>
  <li data-id="2">B</li>
  <li data-id="3">C</li>
</ul>
~~~

~~~js
list.addEventListener("click", (event) => {
  const item = event.target.closest("li");
  if (!item) return;
  console.log("clicked id:", item.dataset.id);
});
~~~

~~~
instead of:
  li1 listener
  li2 listener
  li3 listener
use:
  ONE listener on <ul>, let bubbling bring events upward
~~~

Why it's useful:
1. **Fewer listeners** — lower memory and setup cost
2. **Works for dynamic content** — newly added children automatically work
3. **Cleaner code** — central event handling logic

This is especially valuable for:
- large tables/lists
- menus
- infinite-scroll feeds
- dynamically rendered DOM

The key implementation detail: always guard carefully, usually with \`closest()\`, because clicks can originate from nested descendants inside the intended item.

~~~js
const button = event.target.closest("[data-action]");
if (!button || !container.contains(button)) return;
~~~

Why it matters: event delegation is a very common frontend interview topic because it combines bubbling knowledge with performance and dynamic DOM handling. Production angle: article lists, menu systems, and ad containers often use delegated listeners instead of attaching handlers to hundreds of nodes. Follow-up: "When not to use it?" When the event doesn't bubble, or when per-node behavior/state makes a single ancestor handler awkward.`,
        },
        {
          q: "What are custom events in JavaScript and how do you create them?",
          answer: `A **custom event** lets your code dispatch its own named event and optionally attach extra data. This is useful when you want loosely coupled communication between DOM-based modules without directly calling each other.

Use the **\`CustomEvent\`** constructor:

~~~js
const event = new CustomEvent("cart:add", {
  detail: { productId: 123, qty: 2 },
  bubbles: true,
});

document.dispatchEvent(event);

document.addEventListener("cart:add", (e) => {
  console.log(e.detail.productId, e.detail.qty);
});
~~~

Key parts:
- **event name** — like \`"cart:add"\`
- **detail** — custom payload available as \`event.detail\`
- **bubbles** — whether it should bubble through ancestors
- **composed** — whether it can cross Shadow DOM boundaries

~~~text
dispatchEvent(customEvent)
  -> listeners for that event name run
  -> event.detail carries your payload
~~~

Why they are useful:
- decouple publisher and listener
- DOM-native event model
- can work across independent widgets/modules

Examples:
- \`modal:open\`
- \`article:bookmark\`
- \`theme:changed\`

Why it matters: custom events are a clean way to build small event-driven systems in browser code and come up in interviews around DOM architecture. Follow-up: "Why not just call a function?" Direct calls create tighter coupling; custom events allow modules to subscribe without the sender knowing who listens.`,
        },
        {
          q: "What is the difference between DOMContentLoaded, load, beforeunload, and unload?",
          answer: `These page lifecycle events fire at different moments in a page's life:

~~~text
HTML parsed -> DOMContentLoaded
all resources finished -> load
user about to leave -> beforeunload
page unloading -> unload
~~~

**DOMContentLoaded**
- fires when the HTML is fully parsed and the DOM is built
- does **not** wait for images, iframes, or most external resources
- great for DOM setup / wiring listeners

**load**
- fires when the whole page is loaded
- waits for images, stylesheets, iframes, etc.
- useful when you need dimensions/resources fully available

**beforeunload**
- fires when the page is about to be closed/reloaded/navigated away
- can be used to warn about unsaved changes
- heavily restricted by browsers

**unload**
- fires when the document is being unloaded
- unreliable for modern analytics/work; avoid depending on it

~~~js
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM ready");
});

window.addEventListener("load", () => {
  console.log("everything loaded");
});

window.addEventListener("beforeunload", (e) => {
  e.preventDefault();
  e.returnValue = "";
});
~~~

Modern advice:
- initialize DOM behavior on **DOMContentLoaded**
- use **load** only if you truly need full resource completion
- prefer **visibilitychange** / **pagehide** / **sendBeacon** over \`unload\` for analytics

Why it matters: interviewers ask this to see if you understand browser lifecycle timing, especially the difference between "DOM is ready" and "every asset finished loading." Follow-up: "Why avoid unload?" It's unreliable, can hurt performance, and many browsers aggressively limit it.`,
        },
        {
          q: "What is Shadow DOM and how is it different from the regular DOM?",
          answer: `**Shadow DOM** lets a component attach a private DOM subtree with **encapsulated markup and styles**. It is the foundation of Web Components and is used to prevent internal styles/structure from leaking out or being affected by the page's global CSS.

~~~js
const host = document.querySelector("#widget");
const shadowRoot = host.attachShadow({ mode: "open" });

shadowRoot.innerHTML = \`
  <style>
    p { color: red; }
  </style>
  <p>Hello from shadow DOM</p>
\`;
~~~

~~~
regular DOM:
  global CSS can affect everything

shadow DOM:
  host element
    └─ shadow root
         └─ internal DOM + scoped styles
~~~

Key differences from the "regular" DOM:
- styles inside the shadow tree are scoped there
- outside page CSS generally doesn't leak in
- internal DOM is encapsulated behind the host element
- event behavior can change depending on whether events are **composed**

Important terms:
- **host** — the regular DOM element that owns the shadow root
- **shadow root** — the root of the private subtree
- **slot** — placeholder for projected/light DOM content

Interview caveat:
- Shadow DOM is **not security**
- it is about **encapsulation**, not protection

Why it matters: if by "dom vs showdom" you meant **DOM vs Shadow DOM**, this is the exact distinction interviewers usually want. Follow-up: "open vs closed shadow root?" \`open\` exposes \`element.shadowRoot\`; \`closed\` hides direct access.`,
        },
      ],
      tip: "Event delegation = one ancestor listener + bubbling. DOMContentLoaded is for DOM readiness; load waits for all resources.",
      rajnishAngle:
        "These are practical browser topics for menus, feed items, analytics hooks, and widget integration across large content pages.",
    },
    {
      title: "Script & Resource Loading",
      subtopics: [
        "script blocking behavior",
        "async vs defer",
        "script execution order",
        "resource onload / onerror",
      ],
      questions: [
        {
          q: "What is the difference between async and defer on script tags?",
          answer: `Both \`async\` and \`defer\` prevent a script from blocking HTML parsing while it downloads, but they differ in **execution timing** and **ordering**.

**async**
- downloads in parallel with HTML parsing
- executes **as soon as it finishes downloading**
- execution order is **not guaranteed**
- good for independent scripts like analytics

**defer**
- downloads in parallel with HTML parsing
- executes **after HTML parsing is complete**
- preserves document order across deferred scripts
- ideal for app scripts that depend on DOM or each other

~~~html
<script async src="analytics.js"></script>
<script defer src="vendor.js"></script>
<script defer src="app.js"></script>
~~~

~~~
async:
  parse HTML ──▶ script downloads in parallel ──▶ run immediately when ready
  order can jump around

defer:
  parse HTML fully first
  then run deferred scripts in document order
~~~

Important relationship:
- deferred scripts run **before** \`DOMContentLoaded\`
- async scripts do **not** guarantee that relationship

Good rule of thumb:
- **async** -> independent third-party / analytics
- **defer** -> your main app bundles

Why it matters: this is one of the most common browser loading interview questions because it directly affects performance and DOM readiness bugs. Follow-up: "What about a plain script tag?" A normal script blocks parsing immediately until it downloads and executes.`,
        },
        {
          q: "How do onload and onerror work for resource loading?",
          answer: `Resources like images, scripts, and styles can fire **\`load\`** on success and **\`error\`** on failure. These events let you react when a resource finishes or fails to fetch/parse.

Example with an image:

~~~js
const img = new Image();
img.onload = () => {
  console.log("image loaded", img.width, img.height);
};
img.onerror = () => {
  console.log("image failed to load");
};
img.src = "/hero.jpg";
~~~

Example with a script:

~~~js
const script = document.createElement("script");
script.src = "/widget.js";
script.onload = () => console.log("script ready");
script.onerror = () => console.log("script failed");
document.head.appendChild(script);
~~~

What they mean:
- **onload** -> resource loaded successfully
- **onerror** -> network/load/parse failure prevented successful use

Common uses:
- fallback image if the primary one fails
- lazy-load optional widgets
- load third-party SDKs dynamically

~~~text
resource requested
  -> success => load event
  -> failure => error event
~~~

Important nuance:
- \`window.onload\` means the whole page loaded
- \`img.onload\` / \`script.onload\` means that specific resource loaded

Why it matters: resource loading questions are common because they connect browser events with real-world resilience and lazy loading. Follow-up: "Can stylesheet load errors be caught?" Yes, but behavior historically varied more than images/scripts, so people often verify via network/devtools or fallbacks.`,
        },
        {
          q: "How do script loading and DOM readiness relate to DOMContentLoaded?",
          answer: `The key point is that **script loading strategy changes when the DOM becomes ready**.

Rules:
- a normal synchronous script blocks parsing immediately
- deferred scripts wait until parsing is done, then execute in order
- \`DOMContentLoaded\` fires **after parsing and after deferred scripts**
- async scripts are independent and may run before or after DOMContentLoaded

~~~html
<script src="blocking.js"></script>
<script defer src="app.js"></script>
<script async src="analytics.js"></script>
~~~

~~~
HTML parsing
  plain script  -> stop parsing, download/execute now
  defer script  -> keep parsing, run later before DOMContentLoaded
  async script  -> keep parsing, run whenever ready

DOMContentLoaded waits for:
  HTML parsing + deferred scripts

DOMContentLoaded does NOT wait for:
  images, iframes, most async scripts
~~~

Practical consequence:
- If your code depends on DOM elements existing, either place the script at the end of \`body\`, use \`defer\`, or wait for \`DOMContentLoaded\`.
- If it's just analytics and doesn't depend on DOM order, \`async\` is often fine.

Why it matters: a lot of real bugs come from scripts running before the DOM nodes they expect exist, or from developers confusing DOM readiness with full page load. Follow-up: "If I use defer, do I still need DOMContentLoaded?" Usually no for that script, because defer already waits for parsing to finish.`,
        },
      ],
      tip: "Default app scripts to defer. Use async for independent third-party scripts that do not depend on DOM order.",
      rajnishAngle:
        "This is directly relevant to loading analytics, ad scripts, and widgets without breaking DOM timing or hurting performance.",
    },
  ],
};
