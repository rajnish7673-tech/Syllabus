import type { Week } from "../types";

export const week11: Week = {
  week: 11,
  theme: "Browser DevTools Mastery",
  color: "#A78BFA",
  topics: [
    {
      title: "Performance Panel",
      subtopics: [
        "Recording a trace",
        "Long tasks",
        "Main thread flame chart",
        "Frames",
        "Network waterfall in trace",
      ],
      questions: [
        {
          q: "How do you record and analyze a performance trace in Chrome DevTools?",
          answer: `The Performance panel records everything the browser does on a timeline — main-thread activity, network, rendering, painting — so you can find what makes a page slow or janky.

**Recording:**
1. Open **Performance** panel. Set **CPU throttling** (4–6x slowdown) and **Network: Fast/Slow 3G** to mimic a mid-range Android on a real network (your actual audience — testing on a fast laptop hides problems).
2. Two modes: **Record** (click record -> interact -> stop) for interactions, or **reload-and-record** (the reload icon) for **load** performance.
3. Keep traces short (a few seconds) and focused on one scenario.

**Analyzing — the panels to read:**
~~~
[ Timeline overview: FPS / CPU / NET strips ]
[ Network waterfall ]
[ Main thread flame chart: tasks -> functions (top-down) ]
[ Bottom-Up / Call Tree / Event Log ]
[ Web Vitals markers: FCP, LCP, DCL, Load ]
~~~
- **Main-thread flame chart** — each bar is a function call; width = time. **Long tasks (>50ms)** are flagged with a **red triangle / red corner**. Find the wide bars and what's under them.
- **Bottom-Up tab** — aggregates total self-time per function/URL; **group by domain** to attribute cost to a script/third-party.
- **Call Tree** — top-down view of where time is spent in the call hierarchy.
- **Network section** — the request waterfall in context with main-thread work (see what blocks what).
- **Web Vitals / Timings** — LCP, FCP markers; click the LCP marker to see the LCP element and its timing phases.
- **Frames / FPS** — dropped frames / jank during scroll or animation.

**The workflow:** throttle -> record the specific scenario -> find long tasks / wide bars -> attribute (Bottom-Up by domain) -> identify cause (scripting, layout, paint, third-party) -> fix -> re-record to confirm.

~~~
record (throttled) ─▶ spot long tasks (red) ─▶ Bottom-Up by domain (who?)
                  ─▶ classify: scripting / layout(reflow) / paint / 3rd-party
                  ─▶ fix ─▶ re-record (verify improvement)
~~~

Why it matters: the Performance panel is *the* tool for diagnosing INP/jank/long tasks; a senior answer covers **realistic throttling**, the **right sub-panels**, and a **measure->attribute->fix->verify** loop. Production angle: recording an article-page interaction under 4x CPU + Fast 3G to reproduce real-device jank, using Bottom-Up-by-domain to pin INP cost on third-party scripts, then verifying the fix. Follow-up: "Why throttle?" Desktop CPUs hide problems users on cheap phones feel; throttling approximates the field. "How find the LCP element here?" Click the LCP marker in the Timings track — it highlights the element and shows the phase breakdown.`,
        },
        {
          q: "How do you identify which script is causing a long task in the Performance panel?",
          answer: `Record the scenario, find the **long task** (red-flagged bar), then drill into it to attribute the time to a **specific script/function**, primarily via the **flame chart** (what ran inside the task) and the **Bottom-Up tab grouped by URL/domain** (which file dominated).

**Steps:**
1. **Find the long task** — in the main-thread track, long tasks (>50ms) show a **red triangle in the corner** and a red-striped overlay. Hover to confirm duration.
2. **Expand the flame chart under it** — the task's bar contains nested function calls (top = the task, below = the call stack). Read downward to see which functions ran and which **script file** they belong to (DevTools shows the source URL on each frame; click to jump to Sources).
3. **Use Bottom-Up, grouped by URL/domain** — select the long task's time range (or the whole trace) and switch to **Bottom-Up**. Group by **Activity / URL / Domain** to see **total self-time per script**. The third-party domain or your module at the top is the culprit. This is the fastest way to attribute "this script cost 180ms."
4. **Call Tree** — top-down confirmation of the call hierarchy and where time concentrates.
5. **Long Tasks attribution** — modern DevTools shows an "attribution" for long tasks (the script/container that triggered it); the **Long Tasks API** \`attribution\` gives the same programmatically.

~~~
long task (red) ─▶ expand flame chart ─▶ see function frames + their source URL
              ─▶ Bottom-Up grouped by Domain ─▶ "gtm.js 90ms, taboola.js 60ms"
              ─▶ click a frame ─▶ jump to that line in Sources
~~~

**Confirm with a controlled A/B**: **block the suspected script** in the Network panel (right-click -> Block request domain), re-record, and verify the long task shrinks/disappears — decisive proof it was that script.

Once identified: if it's **third-party**, defer/lazy/Partytown/facade it; if it's **your code**, break it up + yield, memoize, move to a Web Worker, or reduce the work.

~~~
identify (flame chart + Bottom-Up by domain) ─▶ confirm (Network block A/B)
         ─▶ fix (defer/Partytown for 3rd-party; chunk+yield/Worker for own code)
~~~

Why it matters: "the page is janky" is useless without attribution; pinpointing the exact script (and proving it via block-A/B) is the core debugging skill for INP work. Production angle: Bottom-Up-by-domain on the article page revealed GTM/Taboola long tasks; blocking them confirmed the INP cost, leading to Partytown/lazy mitigations. Follow-up: "What if it's anonymous/minified?" Source maps map frames back to original code; for third-party you at least get the domain/file. "Self-time vs total time?" Self-time = time in that function excluding children — best for finding the actual hot spot.`,
        },
        {
          q: "What does the flame chart show and how do you read it?",
          answer: `The **flame chart** in the Performance panel visualizes the **main-thread call stack over time**. The **x-axis is time** (left -> right), and **vertical stacking shows the call hierarchy**: a bar at the top is a function, and bars **directly below it are the functions it called** (its children). **Bar width = how long that call took.** It's how you see *what ran, in what order, nested how deeply, and for how long.*

~~~
time ──────────────────────────────────▶
[========= Task (event/timer) =========]   <- top: the task
  [== handleClick ==][== render ==]          <- functions it called
     [calcLayout][api]   [reconcile][paint]  <- their children (deeper = called-by)
  ▲ wide bar = expensive call (investigate)
~~~

How to read it:
- **Width matters most** — wide bars are where time goes. A wide top-level bar = a long task; widen-and-drill to find the wide child responsible.
- **Depth = call nesting** — deeper bars are called by the ones above. The **bottom** of a deep stack is often the actual hot function (leaf doing the work).
- **Color/category** — DevTools colors activities by type: **yellow = scripting (JS)**, **purple = layout/rendering (style+reflow)**, **green = painting/compositing**, **grey = system/other**. This instantly tells you *what kind* of work dominates (e.g. lots of purple = layout thrashing; lots of yellow = heavy JS).
- **Source URL** on each frame — identifies which script the function came from (click to open in Sources).
- **Gaps** — empty main-thread time can mean waiting on network or idle.

Reading strategy: scan for the **widest top-level bars (long tasks, red-flagged)**, expand them, and follow the **widest child path down** to the leaf function consuming the time — that's your optimization target. Cross-check with **Bottom-Up** (aggregated self-time) to confirm the hottest function across the whole trace.

~~~
find widest top bar (long task) ─▶ follow widest children down ─▶ leaf hot function
  color tells you the work type: yellow(JS) / purple(layout) / green(paint)
~~~

Why it matters: the flame chart is the primary lens for "where is the time going" — reading width (cost), depth (causation), and color (work type) is fundamental to diagnosing slowness/jank. Production angle: a wide **purple** band during scroll on the feed signaled **forced reflows (layout thrashing)** from reading layout in a loop; a wide **yellow** band pointed to a third-party script — each fix verified by re-recording. Follow-up: "Flame chart vs Bottom-Up?" Flame chart = temporal/causal (what called what, when); Bottom-Up = aggregated self-time (which function is hottest overall) — use both. "Lots of purple means?" Style/layout work — likely reflow/thrashing; check for forced synchronous layout.`,
        },
      ],
      tip: "Record with CPU 4x slowdown + Fast 3G to simulate a mid-range Android device — real NBT audience.",
      rajnishAngle:
        "Walk through how you debugged INP issues on Maharashtra Times using the Performance panel.",
    },
    {
      title: "Network Panel",
      subtopics: [
        "Waterfall analysis",
        "Request blocking",
        "Throttling",
        "HAR export",
        "Cache headers inspection",
      ],
      questions: [
        {
          q: "How do you use the Network panel to identify render-blocking resources?",
          answer: `Use the Network panel's **waterfall**, the **initiator/priority** columns, and the **timing markers** to find resources that delay first paint — primarily synchronous CSS/JS requested early and high-priority that the browser must finish before rendering.

**How to spot them:**
1. **Look at requests before the FCP/DCL markers** — the Network waterfall (and the Performance panel) shows **FCP / DOMContentLoaded / Load** lines. Resources that complete **before first paint** and sit in the **document's critical path** (CSS, head scripts) are the render-blocking suspects.
2. **Priority column** — enable it. Render-blocking CSS and head scripts show **Highest/High** priority. A high-priority stylesheet/script early in the waterfall that delays everything is your blocker.
3. **Initiator column** — shows what requested each resource; a \`<link rel=stylesheet>\` or sync \`<script>\` in the document is render-blocking by nature.
4. **Waterfall shape** — long bars early on, with everything else stacked behind them, indicate a blocker serializing the load.
5. **Cross-check Lighthouse** — the "Eliminate render-blocking resources" audit lists them explicitly with estimated savings; DevTools also annotates render-blocking status.

**Confirm via blocking (A/B):** right-click a suspected resource -> **Block request URL**, reload, and see if FCP improves / the page paints sooner. Decisive proof.

~~~
waterfall:
  document ───
  big.css   ─────────  (Highest priority, before FCP) -> RENDER-BLOCKING
  app.js    ─────      (sync, head)                    -> blocks parsing
  hero.jpg        ──   (after paint)                   -> not blocking first paint
            | FCP marker here — what finished before it?
~~~

**Fix what you find:** inline critical CSS + async the rest, \`defer\`/\`async\` scripts, move scripts out of head, preload genuinely-critical assets, reduce/compress CSS. (See [[what-makes-a-resource-render-blocking-and-how-do-you-fix-it]].)

Why it matters: the Network panel reveals the **loading waterfall** that determines FCP/LCP; finding the high-priority, early, document-blocking resources (and confirming by blocking them) is core to load-perf debugging. Production angle: spotting a large render-blocking stylesheet and a synchronous head script delaying the article's first paint, confirmed by blocking them in the Network panel, then fixing via critical-CSS inlining + defer. Follow-up: "Priority column meaning?" The browser's fetch priority — render-blocking resources are High/Highest; you can also see if a preload/fetchpriority changed it. "How tell blocking vs just slow?" Blocking resources complete *before* FCP and are in the critical path (CSS/sync JS); a slow image after paint isn't render-blocking.`,
        },
        {
          q: "How do you block a specific third-party request to measure its impact?",
          answer: `Use DevTools **request blocking** to prevent a URL/domain from loading, then reload and compare metrics — an A/B test that isolates that resource's cost (load time, INP/TBT, layout). It's the most decisive way to prove "this script is costing us X."

**How to block:**
1. **Quick way** — in the **Network** panel, right-click the request -> **Block request URL** (that exact URL) or **Block request domain** (everything from that host, e.g. all of \`taboola.com\`).
2. **Request blocking panel** — open the **Network request blocking** tab (⋮ -> More tools -> Network request blocking, or Cmd/Ctrl+Shift+P -> "Show Network request blocking"). Add URL **patterns** (e.g. \`*gtm*\`, \`*doubleclick*\`), enable/disable the whole list, and see how many requests each pattern blocked.
3. Reload (and/or interact) with blocking on.

~~~
1) baseline:  record/measure WITH the script (LCP, TBT, INP, long tasks)
2) block:     Network -> Block request domain (e.g. *.taboola.com)
3) re-measure WITHOUT it
4) delta = that script's impact   (e.g. TBT 230ms -> 90ms, INP improves)
~~~

**What to measure in the A/B:** TBT/long-task count (Performance panel), INP for interactions, LCP (did a blocking third-party delay it?), total bytes/requests, and CLS (did a late-injecting ad cause shift?). The **difference with vs without** the blocked resource is its cost.

**Why blocking (not just reading the trace):** the Performance panel attributes *direct* main-thread time, but a third-party also has *indirect* effects (it triggers more requests, contends for bandwidth, injects DOM causing layout). Removing it entirely captures the **full** impact, including knock-on effects.

**Caveats:** blocking can break dependent functionality (block a tag manager and the tags it injects also vanish — that's often the point, but note it); test the realistic scenario; and remember blocking is local/temporary (doesn't change production).

Why it matters: it's the standard, rigorous method to quantify a third-party's true cost before deciding to defer/Partytown/remove it — turning "scripts feel heavy" into measured deltas. Production angle: blocking Taboola/GTM in the Network panel and comparing INP/TBT before/after on the article page to justify offloading them to Partytown / lazy-loading — the measured third-party management workflow. Follow-up: "Block URL vs domain?" URL = that exact resource; domain = the whole host (and its cascade) — domain captures full impact. "How prove in the field, not just lab?" Roll the script behind a flag to a subset and compare CrUX/RUM INP/LCP.`,
        },
        {
          q: "What does the Waterfall column show and what are the colored segments?",
          answer: `The **Waterfall** column visualizes each request's **timeline** — when it started, how long each phase took, and how requests overlap/queue relative to one another. Hovering a bar (or opening the request's **Timing** tab) breaks a single request into its **phases**, each a colored segment:

~~~
one request's timing breakdown:
  [Queueing/Stalled][DNS][Initial Connection][SSL/TLS][Request sent][Waiting (TTFB)][Content Download]
   grey              teal  orange              purple   tiny          green (TTFB)    blue
~~~

The segments (colors approximate; the Timing tab labels them precisely):
- **Queueing / Stalled (grey)** — time before the request starts: waiting for a connection slot (browser per-host connection limits), higher-priority requests, or proxy negotiation. Large stalls = too many parallel requests or connection contention.
- **DNS Lookup (teal/green)** — resolving the hostname to an IP. Repeated for new origins -> **preconnect/dns-prefetch** helps.
- **Initial Connection / TCP (orange)** — establishing the TCP connection (handshake).
- **SSL/TLS (purple)** — TLS handshake (HTTPS). DNS+TCP+TLS together are the "connection setup" you warm with **preconnect**.
- **Request sent (very short)** — sending the request headers/body.
- **Waiting / TTFB (green)** — time the **server** took to process and send the first byte. Large green = slow backend/origin -> caching, SSR/DB optimization.
- **Content Download (blue)** — downloading the response body. Large blue = big payload / slow network -> compress (Brotli), reduce size.

~~~
diagnose by the dominant color:
  big grey (stalled)   -> connection contention / too many requests (bundle, HTTP/2)
  big teal/orange/purple-> connection setup overhead -> preconnect, keepalive, HTTP/2-3
  big green (TTFB)     -> slow server/origin -> cache (CDN/Nginx/ISR), faster backend
  big blue (download)  -> large payload -> compress, resize, code-split
~~~

The **waterfall layout itself** (how bars stack) shows **dependencies and parallelism**: requests starting only after others finish reveal serialization (e.g. CSS @import chains, JS that requests more JS, or render-blocking resources gating others). Look for long sequential chains and high-priority resources delaying the rest.

Why it matters: reading the waterfall segments lets you **localize** a slow request to the right layer — network setup vs server vs payload — and choose the right fix (preconnect vs caching vs compression vs splitting). It's fundamental network debugging. Production angle: large **green/TTFB** on the article document pointed to an uncached origin path (fixed with CDN/Nginx caching/ISR); large **blue** on images pointed to oversized payloads (fixed with AVIF/srcset); **teal/purple** on third-party hosts prompted preconnect. Follow-up: "Big stalled segment cause?" Too many concurrent requests to one host (HTTP/1.1 6-connection limit) or low priority — fix with HTTP/2 multiplexing, fewer requests, or higher priority. "Where's TTFB?" The green 'Waiting' segment — server think time.`,
        },
      ],
      tip: "Waterfall segments: DNS lookup (green), initial connection (orange), TTFB (grey), content download (blue).",
      rajnishAngle:
        "Blocking Taboola/GTM in DevTools Network panel to measure INP improvement — real debugging workflow.",
    },
    {
      title: "Lighthouse & PageSpeed Insights",
      subtopics: [
        "Lighthouse audit categories",
        "Opportunities vs Diagnostics",
        "Lighthouse CI",
        "PSI API",
        "Score vs metric",
      ],
      questions: [
        {
          q: "What is the difference between Lighthouse Opportunities and Diagnostics?",
          answer: `In a Lighthouse Performance report, both sections help you improve the page, but: **Opportunities** are **specific, actionable suggestions with estimated time savings** (e.g. "Serve images in next-gen formats — est. 1.2s"), while **Diagnostics** are **informational findings about the page's characteristics** that affect performance but **don't carry a direct time-savings estimate** (e.g. "Avoid an excessive DOM size", "Minimize main-thread work").

~~~
Opportunities (with estimated savings):       Diagnostics (informational, no savings est):
  - Eliminate render-blocking resources  1.1s    - Avoid excessive DOM size (4,200 nodes)
  - Properly size images                 0.8s    - Minimize main-thread work (3.5s)
  - Serve images in next-gen formats     1.2s    - Reduce JS execution time
  - Reduce unused JS / CSS               0.6s    - Avoid large layout shifts (lists elements)
  - Enable text compression                      - Serve static assets with efficient cache policy
~~~

Key distinctions:
- **Opportunities** quantify a **potential improvement** ("if you fix this, you could save ~X seconds") — useful for **prioritizing** by impact. They're concrete optimizations.
- **Diagnostics** give **context/explanations** — they describe *why* the page might be slow (big DOM, heavy main thread, layout-shift contributors) without promising a specific saving. They often point at root causes the Opportunities don't directly capture.

Important caveat (the senior nuance): the **estimated savings are rough lab estimates**, not guarantees — they're computed from the simulated trace and can be optimistic or not translate to field gains. Use them to **prioritize**, then **verify** with real measurement (and CrUX/RUM). Also, fixing an Opportunity may not move the score much if it's not on the critical path; Diagnostics (like main-thread work) often correlate better with INP/TBT problems.

How to use them together: scan **Opportunities** for the biggest estimated wins (render-blocking, image format/size, unused JS) and **Diagnostics** for systemic issues (DOM size, main-thread/JS execution, cache policy) — the Diagnostics frequently explain INP/responsiveness problems that Opportunities (focused on load) miss.

Why it matters: knowing Opportunities = actionable-with-savings vs Diagnostics = informational-context lets you **triage** a report correctly and not blindly chase savings numbers. Production angle: triaging an articleshow Lighthouse report — leading with high-savings Opportunities (next-gen images, render-blocking) while using Diagnostics (excessive DOM, main-thread work) to explain INP issues that load-focused Opportunities don't surface. Follow-up: "Are the savings reliable?" Lab estimates — prioritize with them, verify in the field. "Why might fixing an Opportunity not raise the score?" If it's not on the critical path or the metric it affects is already good; the score is a weighted composite of metrics, not a sum of opportunities.`,
        },
        {
          q: "How do you integrate Lighthouse into a CI/CD pipeline?",
          answer: `Use **Lighthouse CI (LHCI)** to run Lighthouse automatically on every PR/build, **assert** against performance budgets/thresholds, and **fail the build** (or warn) on regressions — so performance is gated like tests, not checked manually after the fact.

**Setup:**
1. Add \`@lhci/cli\` and a config (\`lighthouserc.js\`).
2. In CI (e.g. GitHub Actions), build the app, start it (or deploy a preview), and run \`lhci autorun\` against the URL(s).
3. Configure **assertions** (budgets) and **upload** results (temporary public storage or your own LHCI server for historical trends).

~~~js
// lighthouserc.js
module.exports = {
  ci: {
    collect: { url: ['http://localhost:3000/', 'http://localhost:3000/article/sample'],
               numberOfRuns: 3 },        // multiple runs -> median (reduce variance)
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'resource-summary:script:size': ['error', { maxNumericValue: 300000 }], // JS budget
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
~~~

~~~yaml
# GitHub Actions step
- run: npm ci && npm run build
- run: npx lhci autorun   # collect + assert + upload; non-zero exit fails the PR
~~~

**Best practices (the senior details):**
- **Run multiple times and take the median** — single Lighthouse runs are noisy; \`numberOfRuns: 3+\` reduces flakiness.
- **Assert on metrics + budgets, not just the score** — gate **LCP/TBT/CLS** and **bundle-size budgets** (JS/CSS bytes) so a 50KB dependency creep fails the PR. Budgets catch regressions a composite score might mask.
- **Run against a production-like build/preview** (e.g. Vercel/Netlify PR preview URL), not dev mode (dev is unoptimized and unrepresentative).
- **warn vs error** — start new metrics as \`warn\` to avoid blocking, promote to \`error\` once stable.
- **Track trends** — an LHCI server stores history so you see gradual drift, not just pass/fail.
- Combine with **bundle-size checks** (size-limit) for fast, deterministic gates alongside the (noisier) Lighthouse runs.

~~~
PR ─▶ build ─▶ deploy preview ─▶ lhci autorun (x3, median)
   ─▶ assert budgets (LCP/TBT/CLS/JS-size) ─▶ pass/fail PR ─▶ upload trend
~~~

Why it matters: it shifts performance **left** — regressions are caught at PR time with hard budgets instead of being discovered in CrUX weeks later. Production angle: LHCI in the deploy pipeline asserting LCP/TBT/CLS + a JS bundle budget on articleshow/home preview URLs, failing PRs that regress — preventing perf creep across many contributors. Follow-up: "Lab in CI vs field reality?" CI Lighthouse is lab (deterministic, good for catching regressions); still validate with RUM/CrUX. "How handle flakiness?" Median of N runs, run on a consistent CI environment, prefer budget assertions (size) which are deterministic over noisy timing metrics.`,
        },
        {
          q: "Why does your Lighthouse score not match your CrUX field data?",
          answer: `Because Lighthouse is **lab/synthetic** data (one simulated load on a controlled device/network) and CrUX is **field** data (real users, real devices/networks, aggregated at the **75th percentile over 28 days**). They measure different things under different conditions, so they routinely disagree — and **CrUX is what Google ranks on**.

~~~
Lighthouse (lab)                  CrUX (field)
single synthetic run               thousands of real sessions
simulated device + throttling      real devices (cheap -> flagship), real networks
NO real interactions               real interactions (real INP)
weighted 0–100 SCORE               raw CWV at p75 (pass/fail)
instant                            28-day rolling lag
debugging / CI                     ranking / truth
~~~

The specific reasons (recite these):
1. **Lab vs field conditions** — Lighthouse's one device/network profile differs from your audience's real mix (often worse: low-end Androids on patchy networks).
2. **INP isn't in Lighthouse** — no real interactions in lab, so it uses **TBT** as a proxy; real **INP** only exists in CrUX. You can score 95 yet fail INP in the field.
3. **Score vs metric** — Lighthouse's number is a **weighted composite**; CrUX reports **actual CWV thresholds**. High score ≠ all CWV pass.
4. **Real-world variance** — ads, personalization, A/B variants, third-party scripts, and real cache states affect field metrics but not a clean lab run.
5. **Timing lag** — a fix improves Lighthouse immediately but takes **~28 days** to show in CrUX (and ranking).
6. **Single-run noise** — one Lighthouse run is variable; CrUX aggregates many.
7. **Coverage/cold cache** — most news visitors arrive **cold from search/Discover** (empty cache), which CrUX captures but a warm lab run may not.

~~~
Lighthouse 96 (lab)  ≠  CrUX INP "poor" (field)
  -> trust CrUX for ranking; use Lighthouse to diagnose; wait ~28d for CrUX to reflect fixes
~~~

The takeaway: **don't chase the Lighthouse number** — optimize the **field metrics** (CrUX/RUM) users actually experience, and use Lighthouse as a **diagnostic and CI-gate** tool. To reconcile them, add **RUM (web-vitals)** so your lab work is validated against real users, and test in lab with **realistic throttling/devices** to approximate field conditions.

Why it matters: it's the canonical "lab vs field" question; understanding that ranking is field-based (and *why* they diverge — especially INP and real conditions) is essential perf literacy. Production angle: an articleshow page with a strong Lighthouse score but a CrUX INP flag in Search Console — reproduced in DevTools, fixed by deferring third-party JS / yielding, then confirmed via CrUX recovery over the following month. Follow-up: "Which do you trust for ranking?" CrUX/field. "How shrink the gap?" RUM + realistic lab throttling + test on mid-range devices. "Why p75 in CrUX?" To represent the slow tail, not just the median.`,
        },
      ],
      tip: "Lighthouse score ≠ CWV status. CrUX is what Google actually uses. Lighthouse helps you find what to fix.",
      rajnishAngle:
        "Running Lighthouse on articleshow pages and triaging the Opportunities list at Times Internet.",
    },
    {
      title: "Memory Panel & Heap Snapshots",
      subtopics: [
        "Heap snapshot",
        "Allocation timeline",
        "Memory leaks detection",
        "Detached DOM nodes",
        "Retained size vs shallow size",
      ],
      questions: [
        {
          q: "How do you detect a memory leak using Chrome DevTools?",
          answer: `A memory leak is memory that's no longer needed but can't be garbage-collected because something still references it. Detect it with the **Memory** panel using the **3-snapshot technique** and the **Allocation instrument on timeline**, looking for memory (and detached DOM/listeners) that **grows and never comes back** across a repeated action.

**The 3-snapshot technique (the canonical method):**
1. Open **Memory** -> **Heap snapshot**. Take a **baseline** snapshot.
2. **Perform the suspect action** (e.g. open and close a modal, navigate to a route and back, mount/unmount a component) — ideally several times.
3. Take snapshot **#2**.
4. Repeat the action again, take snapshot **#3**.
5. In snapshot #3, set the comparison dropdown to **"Objects allocated between Snapshot 1 and 2"** (or compare snapshots). If objects from earlier snapshots **persist and accumulate** (count/retained size keeps growing with each cycle and never drops after GC), you have a leak.

~~~
baseline ─▶ do action x3 ─▶ snapshots ─▶ compare
  healthy: memory rises during action, returns to ~baseline after GC
  LEAK:    memory keeps climbing each cycle, never returns -> objects retained
~~~

**Tools within Memory:**
- **Heap snapshot** + **Comparison view** — see which object types/counts grew between snapshots; sort by **Retained Size** to find what's holding the most memory.
- **Filter "Detached"** — search for **"Detached"** in a snapshot to find **detached DOM nodes** (removed from the document but still referenced in JS — a classic leak; see next question).
- **Allocation instrumentation on timeline** — records allocations over time; **blue bars that stay** (not freed) mark retained allocations; click them to see the allocation stack (where they were created).
- Force **GC** (the trash icon) before snapshots so you measure *retained* memory, not garbage awaiting collection.

**Common leak sources to look for:** un-removed event listeners, uncleared \`setInterval\`/timers, detached DOM held by closures, growing global caches/arrays, subscriptions not unsubscribed, and (in React) effects without cleanup.

~~~
detect: 3 snapshots (or allocation timeline) ─▶ memory grows & stays
attribute: comparison view (what grew) + "Detached" filter + retainers path
fix: remove listeners/timers, cleanup effects, null refs, WeakMap for DOM-keyed caches
~~~

Why it matters: leaks degrade long-lived pages (slowdowns, crashes) and are invisible without these tools; the 3-snapshot method + detached-node hunting is the standard detection workflow. Production angle: long-session news readers (a tab left open for hours) accumulate listener/closure leaks from scroll handlers and ad widgets — detected by repeating navigation/interactions and watching retained size climb across snapshots. Follow-up: "How find what keeps an object alive?" Select it in the snapshot and read the **Retainers** path (the chain of references preventing GC). "Force GC first?" Yes — so snapshots show retained, not collectable, memory.`,
        },
        {
          q: "What are detached DOM nodes and why do they cause leaks?",
          answer: `A **detached DOM node** is an element that has been **removed from the document tree** (no longer rendered) but is **still referenced by JavaScript** — so the garbage collector can't free it (nor its subtree). It's "detached" from the DOM but "attached" to memory via a JS reference. This is one of the most common memory leaks in SPAs.

~~~js
// leak: keep a JS reference to a node, then remove it from the DOM
let cachedList = document.getElementById('list'); // JS holds the node
document.body.removeChild(cachedList);            // removed from DOM...
// ...but cachedList still references it -> the node + ALL its children stay in memory
~~~

~~~
DOM tree:           JS heap:
  (removed)  ✗        cachedList ──▶ <ul>#list (detached)
                                      └─ <li> x1000 (also retained!)
  node gone from page, but reference pins it (and its whole subtree) in memory
~~~

Why they leak: when you remove a node from the DOM, it *should* become eligible for GC. But if **any JS still references it** — a variable, a closure, an array/cache, a React ref, or an **event listener** whose handler closes over it — the reference keeps the **entire detached subtree** alive (even thousands of child nodes you can't see). Over time (repeated open/close, list re-renders, route changes) these accumulate and memory climbs.

**Common causes:**
- Storing DOM nodes in variables/caches/arrays and removing them from the DOM without nulling the reference.
- **Event listeners not removed** — the listener (and its closure capturing the node) keeps the node alive even after removal.
- Closures capturing nodes; detached nodes referenced by a still-running \`setInterval\`.
- Frameworks: holding refs to unmounted component DOM.

**Detect:** Memory panel -> Heap snapshot -> search **"Detached"** — DevTools lists detached HTML nodes; check their **Retainers** to see what's holding them.

**Fix / prevent:**
- **Remove event listeners** before/when removing nodes (\`removeEventListener\`; in React, \`useEffect\` cleanup).
- **Null out references** to removed nodes (\`cachedList = null\`).
- Don't cache DOM nodes long-term; if you must key data by DOM node, use a **\`WeakMap\`** (weak keys let the node be GC'd when detached).

~~~
prevent: remove listeners + null refs + WeakMap for node-keyed data + effect cleanup
detect:  heap snapshot -> filter "Detached" -> inspect Retainers
~~~

Why it matters: detached DOM is the classic SPA leak — invisible in the UI but steadily consuming memory; knowing the cause (lingering JS references/listeners) and the WeakMap/cleanup fixes shows real debugging depth. Production angle: ad widgets and scroll/event handlers that aren't cleaned up on unmount leave detached ad-container subtrees in memory during long news-reading sessions — found via the "Detached" filter, fixed with proper listener removal and effect cleanup. Follow-up: "Why does the whole subtree leak, not just the node?" The reference to the parent keeps its children reachable too. "WeakMap how does it help?" Weak keys don't prevent GC — when the node detaches and nothing else holds it, the entry (and node) are collected.`,
        },
        {
          q: "What is the difference between retained size and shallow size in a heap snapshot?",
          answer: `In a heap snapshot, **shallow size** is the memory held by **the object itself** (its own fields/overhead), while **retained size** is the **total memory that would be freed if that object were garbage-collected** — i.e., the object **plus everything only it keeps alive** (its exclusive retained subtree). Retained size is the metric that reveals the **true cost** of an object and is what you sort by to find leaks.

~~~
shallow size:  memory of the object itself only
retained size: object + all objects reachable ONLY through it
               (everything that becomes garbage if this object is freed)
~~~

~~~
   A ──▶ B ──▶ D
         │
   C ──▶ ┘ (B also referenced by C)

A's shallow size  = just A
A's retained size = A + B? + D?  -> B is also held by C, so freeing A doesn't free B/D
   => A's retained size = A (+ only what's EXCLUSIVELY reachable via A)
~~~

The key distinction: an object can have a **small shallow size but a huge retained size** if it's the **sole owner** of a large structure. Example: a small closure/array that holds the only reference to a 1,000-node detached DOM subtree has tiny shallow size but **massive retained size** — that's exactly the leak you want to find. Conversely, a big object referenced from many places might have a large shallow size but a smaller *retained* size (freeing it wouldn't free the shared things).

Why retained size matters for leak hunting: sorting by **Retained Size** surfaces the objects whose removal would free the most memory — the **dominators** of large subtrees. That points you to the *root cause* (the one reference pinning a big subtree), not just big leaf objects. The snapshot's **Retainers** panel then shows the reference chain keeping it alive.

~~~
leak hunting:  sort by Retained Size ─▶ find the dominator (small shallow, huge retained)
            ─▶ inspect Retainers (who holds it) ─▶ break that reference
~~~

Practical: use the **Comparison** view across snapshots to see which objects **grew in retained size** across a repeated action, then drill via retainers. A growing retained size that never returns to baseline = leak.

Why it matters: understanding retained vs shallow is what lets you read a heap snapshot correctly — chasing shallow size finds big objects, but chasing **retained size** finds **what's actually holding memory hostage** (the leak's root). Production angle: a small event-handler closure with a tiny shallow size but a large retained size (holding a detached ad-widget subtree) is the smoking gun for the long-session leak — found by sorting on retained size and reading retainers. Follow-up: "What's a 'dominator'?" An object through which all paths to a set of objects pass — its retained size includes that whole set; the dominator tree visualizes ownership. "Why not just shallow size?" Shallow misses the subtree a reference keeps alive — the real cost; retained size captures it.`,
        },
      ],
      tip: "Take 3 heap snapshots: baseline → after action → after GC. Growing retained size = leak.",
      rajnishAngle:
        "Long-session news readers (users who leave NBT tab open for hours) can accumulate leaks from event listeners.",
    },
    {
      title: "Application Panel & Storage",
      subtopics: [
        "Service Worker inspection",
        "Cache Storage",
        "IndexedDB",
        "Cookies & localStorage",
        "Background sync",
      ],
      questions: [
        {
          q: "How do you inspect and debug a Service Worker in DevTools?",
          answer: `Use the **Application** panel -> **Service Workers** section (and **Cache Storage**) to see the SW's state, force updates, simulate offline, and debug its lifecycle and caching.

**Application -> Service Workers shows/lets you:**
- **Status** of the registered SW: *installing / waiting / active*, its **scope**, and the script URL. A SW stuck in **"waiting"** means a new version is installed but the old one still controls open pages (it activates after all tabs close, unless \`skipWaiting\`).
- **"Update on reload"** — checkbox that forces the SW to re-fetch and update on every reload — **essential during development** to avoid being served by a stale SW.
- **Update / Unregister** — manually trigger an update check or remove the SW entirely (clean slate).
- **skipWaiting** — promote a waiting SW to active immediately.
- **Offline** checkbox — simulate offline to test the SW's offline behavior/fallbacks.
- **Push / Sync** — trigger test push and background-sync events.
- **Inspect** — open a dedicated DevTools for the SW's own context to set breakpoints in the SW script, view its console, and step through \`install\`/\`activate\`/\`fetch\` handlers.

~~~
Application
 └─ Service Workers
    status: #1234 activated and running   scope: /
    [ ] Offline   [✓] Update on reload    [Update] [Unregister] [skipWaiting]
    Inspect ▸ (debug sw.js: breakpoints, console, network)
 └─ Cache Storage  (what the SW cached: requests/responses per cache name)
~~~

**Debugging workflow:**
1. Confirm the SW is **active** and controlling the page (and the right **scope**).
2. Inspect **Cache Storage** to verify what's cached (cache names, the actual requests/responses) — useful to confirm your caching strategy stored what you expect.
3. **Update on reload** while iterating so you test the latest SW, not a cached one.
4. **Offline** toggle to verify offline fallbacks/network-first behavior.
5. **Inspect** the SW to breakpoint in \`fetch\`/\`install\`/\`activate\` and trace which strategy handled a request.
6. Check **Console** for SW errors; the **Network** panel shows requests served by the SW (marked with a gear icon / "from ServiceWorker").

**Common issues it helps debug:** stale SW serving old assets (fix: Update on reload, versioned caches), a SW stuck in "waiting", wrong cache strategy serving stale content, scope mismatches, and failed precaching.

Why it matters: SWs are powerful but notoriously hard to debug ("why am I seeing the old version?"); knowing the Application panel controls (Update on reload, skipWaiting, Offline, Inspect, Cache Storage) is essential for shipping SW-based caching/offline safely. Production angle: debugging the SW's network-first article caching and offline fallback — using Update on reload during dev, Cache Storage to verify cached HTML, and the Offline toggle to test graceful degradation. Follow-up: "Why 'Update on reload' in dev?" Without it the active SW persists across reloads, serving stale logic/assets — it forces a fresh SW each reload. "How tell a request was served by the SW?" Network panel marks it ("from ServiceWorker" / gear icon).`,
        },
        {
          q: "How do you clear all caches for a site during debugging?",
          answer: `Use the **Application** panel -> **Storage** (a.k.a. **Clear storage**) section, which has a **"Clear site data"** button that wipes **everything** for the origin in one click — or clear individual stores selectively. This is the reliable way to get a clean slate when stale caches/SW/storage are confusing your debugging.

**Application -> Storage ("Clear storage"):**
- A pie chart of usage and a checklist of what to clear: **Service Workers, Cache Storage, IndexedDB, Local/Session Storage, Cookies, Web SQL**, and the **HTTP cache** (via "including third-party cookies" / unregister options).
- **"Clear site data"** button — clears all selected categories at once (unregisters SWs, deletes Cache Storage, IndexedDB, localStorage, cookies). This is the nuclear option for a fresh start.

~~~
Application -> Storage (Clear storage)
  [✓] Unregister service workers
  [✓] Cache Storage     [✓] IndexedDB
  [✓] Local & Session Storage   [✓] Cookies
  [ Clear site data ]   <- wipes everything for this origin
~~~

**Other ways (targeted):**
- **Cache Storage** node -> right-click a cache -> **Delete**, or clear individual entries (when you only want to drop the SW caches, not cookies/storage).
- **Service Workers** -> **Unregister** to remove the SW specifically.
- **Network panel -> Disable cache** (with DevTools open) — bypasses the **HTTP cache** for every request while you debug (doesn't touch SW/Cache Storage/storage, but stops stale asset caching).
- **Hard reload / Empty Cache and Hard Reload** — long-press the reload button (DevTools open) to clear the HTTP cache and reload; note this **doesn't** clear the Service Worker or Cache Storage (a common gotcha — the SW can still serve stale content after a hard reload).
- Programmatic: \`caches.keys().then(ks => ks.forEach(k => caches.delete(k)))\` in the console for Cache Storage.

~~~
need a TRUE clean slate?  -> Application -> Clear site data (covers SW + caches + storage)
just bypass HTTP cache?   -> Network -> Disable cache (DevTools open)
remove stale SW?          -> Service Workers -> Unregister  (hard reload alone won't)
~~~

The key gotcha to mention: **a hard reload does NOT unregister the Service Worker or clear Cache Storage** — so if a SW is serving stale assets, hard-reloading won't help; you must use **Clear site data** / **Unregister** / **Update on reload**. This trips people up constantly.

Why it matters: stale SW/Cache Storage is a frequent source of "I deployed but still see the old version" confusion; knowing **Clear site data** (and that hard reload doesn't touch the SW) is essential for reliable debugging. Production angle: when testing a new SW caching strategy or a deploy, using Application -> Clear site data (or Update on reload + Unregister) to ensure you're testing fresh, not a stale-SW-served version. Follow-up: "Hard reload vs clear site data?" Hard reload clears the HTTP cache only; clear site data also unregisters SWs and wipes Cache Storage/IndexedDB/cookies. "Disable cache scope?" Only affects the HTTP cache while DevTools is open — not the SW.`,
        },
        {
          q: "How do you simulate offline mode to test Service Worker caching?",
          answer: `There are two "offline" toggles in DevTools, and knowing **which** to use matters: the **Application -> Service Workers -> Offline** checkbox (best for testing SW behavior) and the **Network panel -> throttling -> Offline** preset. Both cut network access so you can verify your SW serves cached responses / offline fallbacks.

**Methods:**
1. **Application -> Service Workers -> "Offline" checkbox** — simulates offline **specifically for testing the SW**. With the SW active, toggle Offline and reload/interact: requests should be served from the SW's caches (cache-first assets, the cached article for network-first, the offline fallback page). This is the recommended toggle for SW testing.
2. **Network panel -> throttling dropdown -> "Offline"** — sets the whole page offline (network requests fail). Good for general offline testing; combined with the SW, you see whether the SW intercepts and serves cached content or the page breaks.
3. **Network conditions** -> custom throttling profiles (Slow 3G, etc.) to test **degraded** (not just zero) connectivity, which often reveals network-first-with-timeout behavior.

~~~
test plan:
  1. load page online (let SW install + cache)
  2. Application -> Service Workers -> Offline  (or Network -> Offline)
  3. reload / navigate / interact
  4. verify: cached assets served? article shows cached copy? offline.html fallback?
  5. Network panel: requests marked "from ServiceWorker"; failed ones if not cached
~~~

**What to verify per strategy** (ties to your SW design):
- **Cache-first assets** (hashed JS/CSS) -> still load offline (served from Cache Storage).
- **Network-first article HTML** -> offline, falls back to the **cached** copy (or the offline page if never visited).
- **Cache-only** offline page -> displays when nothing else matches.
- **Network-only** (POST/analytics) -> fails offline (expected) — ensure the UI degrades gracefully / queues via **Background Sync**.

**Confirm in the Network panel:** offline requests served by the SW are marked **"(from ServiceWorker)"** (gear icon); a request that fails (red) means it wasn't cached and there's no fallback — a gap to fix.

**Caveats:** the **Service Workers -> Offline** toggle is more accurate for SW testing than the Network toggle in some cases; also remember to test the **first offline visit** to a never-cached page (does your offline fallback trigger?), and test **Background Sync** (Application can trigger sync events) for deferred actions.

Why it matters: offline support is only real if you **verify** it; knowing the toggles and what each strategy should produce offline is how you ship trustworthy PWA/offline behavior. Production angle: testing the news app's network-first articles with a cached fallback and a pre-cached offline page — toggling Offline to confirm readers see the last-cached article (not a browser error) and an offline notice when truly disconnected. Follow-up: "Which offline toggle?" Application -> Service Workers -> Offline for SW-specific testing; Network -> Offline for general. "How verify the SW served it?" Network panel shows '(from ServiceWorker)'. "Background Sync?" Queue failed writes (e.g. a posted comment) and replay when back online — testable via the Application panel's sync trigger.`,
        },
      ],
      tip: "Application → Service Workers → check 'Update on reload' during development to avoid stale SW issues.",
      rajnishAngle: "",
    },
    {
      title: "Sources Panel & Debugging",
      subtopics: [
        "Breakpoints",
        "Conditional breakpoints",
        "Logpoints",
        "Call stack inspection",
        "Blackboxing scripts",
        "Override files locally",
      ],
      questions: [
        {
          q: "What is a logpoint and when is it more useful than a regular breakpoint?",
          answer: `A **logpoint** is a breakpoint that, instead of **pausing** execution, **logs a message/expression to the console** and keeps running. You set it in the **Sources** panel (right-click a line -> **Add logpoint**) and give it an expression (e.g. \`'user', user.id, count\`). It's like inserting a \`console.log\` **without editing the source** — and it works on **production/minified code you can't modify**.

~~~
regular breakpoint: pauses at the line -> you inspect, then resume
logpoint:           logs your expression to console, NEVER pauses -> execution flows
~~~

~~~js
// equivalent to inserting this WITHOUT touching the file:
console.log('render', props.id, state.count);  // logpoint expression on that line
~~~

**When a logpoint is more useful than a regular breakpoint:**
1. **Observing values without disrupting timing/flow** — pausing changes behavior: it breaks animations, drag/scroll/gesture handlers, race conditions, timers, and anything timing-sensitive. A logpoint records values while the code runs normally, so you see the real sequence.
2. **High-frequency code** — a breakpoint in a scroll/mousemove/render loop pauses on **every** call (unusable); a logpoint streams the values so you can scan the pattern.
3. **Production / read-only / minified code** — you can't add \`console.log\` to a deployed bundle, but you can attach a logpoint live in DevTools (great with source maps).
4. **No source edits / no redeploy** — instrument quickly without changing files, committing, or rebuilding. Cleaner than littering \`console.log\` and forgetting to remove them.
5. **Logging across many iterations** to find *when* a value goes wrong (e.g. log an index/state each loop), which is awkward with manual pausing.

When a **regular breakpoint** is still better: when you need to **inspect the full scope / call stack interactively**, **step** through line-by-line, or **modify** state live — logpoints only emit what you specify and don't let you poke around.

Related: **conditional breakpoints** (pause only when an expression is true) and **logpoints** combine the idea — a conditional logpoint logs only sometimes. Both avoid the "pause on every call" problem.

~~~
use logpoint:     watch values in hot/timing-sensitive/production code, no pausing
use breakpoint:   inspect scope/stack interactively, step through, mutate state
~~~

Why it matters: logpoints are a senior debugging tool — they let you instrument live, production, high-frequency, or timing-sensitive code **without** side-effecting the execution or editing source, which a normal breakpoint or stray \`console.log\` can't. Production angle: diagnosing an intermittent issue in a scroll/feed handler or in a minified production bundle on the live site by attaching logpoints (with source maps) to stream values without pausing scroll or redeploying. Follow-up: "Logpoint vs console.log?" No source edit, works on prod/minified, easy to remove, doesn't get committed. "Conditional logpoint?" A logpoint that only fires when a condition holds — log just the problematic case in a hot loop.`,
        },
        {
          q: "How do you override a production JS file locally to test a fix?",
          answer: `Use **DevTools Local Overrides** (Sources -> Overrides). It lets you **edit a file served by a remote/production server and have DevTools serve YOUR edited version** on subsequent loads — so you can test a fix against the **live site** without deploying, with full persistence across reloads. This is a senior debugging superpower for verifying a fix in production conditions.

**Setup:**
1. **Sources** panel -> **Overrides** tab (or **Workspace**) -> **"Select folder for overrides"** -> pick a local folder and **grant permission**.
2. Open the production file (Sources -> Page -> the JS/CSS/HTML), edit it (you can pretty-print minified code first), and **save (Cmd/Ctrl+S)**.
3. DevTools writes your edited copy to the local folder and **serves it instead of the network version** — a purple dot marks overridden files. On reload, your version loads (DevTools intercepts the request).
4. Test the fix live; remove the override (or uncheck "Enable Local Overrides") to revert.

~~~
network file ──▶ DevTools intercepts ──▶ serves YOUR local edited copy
edit prod main.js -> save -> reload -> live site runs your patched code (no deploy)
~~~

**What you can override:** JS, CSS, HTML, and even **response headers** and **fetch/XHR responses** (newer DevTools can override network response *content/headers* too — handy to simulate an API change or a different cache header without backend changes).

**Why it's powerful (use cases):**
- **Verify a fix in real production conditions** (real data, real third-party scripts, real CDN) before writing/deploying it — confirm the change actually solves the issue.
- **Reproduce/test against prod** when you can't reproduce locally (prod-only data, config, or third-party behavior).
- **Try a hotfix** quickly to confirm root cause, then implement it properly in the codebase.
- **Tweak third-party/minified files** you don't control, to test a workaround.

**Caveats:** overrides are **local only** (your browser) — they don't change anything for users; they persist until you disable them (don't forget you have an override active — it can confuse later debugging); and minified files are best **pretty-printed** before editing. It's a *testing* tool, not a deploy mechanism.

~~~
flow: can't repro locally / want to confirm a fix on prod
   -> Sources -> Overrides -> edit prod file -> save -> reload -> validate
   -> then implement the real fix in code + deploy
~~~

Why it matters: Local Overrides let you **debug and validate fixes against the actual production environment** without a deploy cycle — invaluable for prod-only bugs and confirming root cause; senior engineers lean on this. Production angle: debugging an RSC/stream or third-party issue that only reproduces on the live site — override the production bundle to test a patch, confirm it fixes the issue, then land the real change. Follow-up: "Local only?" Yes — your browser only; never affects users. "Override API responses too?" Newer DevTools can override response bodies/headers (simulate backend/header changes). "Minified code?" Pretty-print first, or use source maps to edit and map back.`,
        },
        {
          q: "How do you blackbox a third-party script to focus on your own code?",
          answer: `**Blackboxing** (now called **"Add script to ignore list"** in DevTools) tells the debugger to **skip over** specified scripts (libraries, frameworks, third-party, polyfills) — so when you step through code or an exception is thrown, you **stay in YOUR code** and don't get dragged into React/lodash/vendor internals. It declutters the **call stack** and makes **stepping** sane.

**How to enable:**
1. **Sources** panel -> right-click a file (in the file tree or an open file) -> **"Add script to ignore list"** (or right-click a frame in the **Call Stack** -> ignore that script).
2. **Settings -> Ignore List** -> add **regex patterns** (e.g. \`/node_modules/\`, \`react-dom\`, \`\\.min\\.js$\`, specific third-party domains) to ignore many files at once.
3. There's also a built-in option to **automatically ignore known third-party scripts** (and content scripts).

~~~
without ignore list — Call Stack while paused:
  yourHandler            <- you care about this
  dispatchEvent          (react-dom)   noise
  batchedUpdates         (react-dom)   noise
  scheduler.flush        (scheduler)   noise
with react-dom/scheduler on the ignore list:
  yourHandler            <- stack shows only YOUR frames
~~~

**What blackboxing does:**
- **Stepping** (Step Into/Over/Out) **skips** ignored scripts — so "Step Into" from your code jumps straight to the next line of *your* code instead of diving into framework internals.
- **Call stack** hides (or collapses) ignored frames, so you see only your application frames.
- **Breakpoints** inside ignored scripts are disabled (won't pause there).
- **"Pause on exceptions"** won't stop inside ignored code (so a vendor lib's internal caught/handled throw doesn't interrupt you).

**Why it's useful:**
- **Focus** — debugging your logic without wading through minified vendor code or deep React internals.
- **Faster stepping** — Step Into doesn't fall into library guts; you trace your own flow.
- **Cleaner stack traces** — easier to see *your* call path that led to a bug.
- **Avoid noise from third-party errors** that you can't fix anyway.

~~~
ignore list patterns:  /node_modules/   \\.min\\.js$   *gtm*  react-dom
result:  step + call stack + pause-on-exception all skip those -> focus on your code
~~~

**Caveat:** don't blackbox something you actually need to debug (e.g. when the bug *is* in how you call a library, you may want to see the boundary). It's about reducing noise, not hiding everything — toggle it per task.

Why it matters: in real apps your code runs amid frameworks and third-party scripts; blackboxing keeps debugging focused on **your** frames, dramatically speeding up tracing — a standard senior workflow. Production angle: debugging an app issue tangled with GTM/ad scripts and React internals — ignoring \`/node_modules/\`, \`react-dom\`, and ad domains so stepping and the call stack show only the application code path to the bug. Follow-up: "Blackbox vs just not opening the file?" Blackboxing changes stepping/stack/exception behavior, not just visibility — it actively keeps the debugger out of those scripts. "Pattern-based?" Yes — Settings -> Ignore List with regex (\`/node_modules/\`) ignores many at once.`,
        },
      ],
      tip: "Local overrides (Sources → Overrides) let you test production fixes without deploying. Senior devs love this workflow.",
      rajnishAngle:
        "Debugging RSC stream corruption on maharashtratimes.com — Sources panel + Network panel combo.",
    },
  ],
};
