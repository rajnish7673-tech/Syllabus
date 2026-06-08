import type { Week } from "../types";

export const week19: Week = {
  week: 16,
  theme: "Monitoring, Observability & Error Tracking",
  color: "#34D399",
  topics: [
    {
      title: "Frontend Error Tracking with Sentry",
      subtopics: [
        "Sentry setup in Next.js",
        "Source maps",
        "Error boundaries integration",
        "User context",
        "Performance monitoring",
        "Releases & commits",
      ],
      questions: [
        {
          q: "How do you set up Sentry in a Next.js App Router project?",
          answer: `Sentry for Next.js App Router must capture errors across **three runtimes** — **client (browser), server (Node), and edge (middleware)** — so it uses three init configs plus build-time source map upload and release tagging. Use the wizard (\`npx @sentry/wizard@latest -i nextjs\`) to scaffold it.

~~~
sentry.client.config.ts  -> browser errors, performance traces, session replay
sentry.server.config.ts  -> Node: SSR / RSC / route handler errors
sentry.edge.config.ts    -> edge runtime (middleware, edge routes)
instrumentation.ts       -> registers server/edge init (App Router startup hook)
next.config.js           -> withSentryConfig: upload source maps + tag release
~~~

~~~ts
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,            // sample performance traces (not 100% at scale)
  replaysOnErrorSampleRate: 1.0,   // always replay sessions that error
  replaysSessionSampleRate: 0.0,
  sendDefaultPii: false,           // don't auto-attach IP/cookies
  beforeSend: (event) => scrubPII(event),
});
~~~

~~~js
// next.config.js
const { withSentryConfig } = require('@sentry/nextjs');
module.exports = withSentryConfig(nextConfig, {
  org: 'org', project: 'web',
  authToken: process.env.SENTRY_AUTH_TOKEN,  // CI-only: upload maps
  // maps uploaded to Sentry, NOT served publicly
});
~~~

Then add **error boundaries** to report React render errors: a root \`app/global-error.tsx\` and per-route \`error.tsx\` that call \`Sentry.captureException\`:
~~~tsx
'use client';
export default function GlobalError({ error }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return <html><body><p>Something went wrong.</p></body></html>;
}
~~~

Why each piece: **three runtimes** because App Router code runs on browser/Node/edge (a server-component error vs a client error land in different runtimes); **\`instrumentation.ts\`** is the App Router hook to init Sentry on server/edge at startup and capture nested RSC/route errors; **source maps uploaded privately** so Sentry de-minifies stack traces without exposing source publicly; **release tagging** (commit SHA) associates errors with the deploy that caused them; **sampling** controls trace/replay volume at scale; **\`beforeSend\` + \`sendDefaultPii:false\`** keep PII out (GDPR). See [[what-are-the-risks-of-exposing-source-maps-in-production]] and [[how-do-you-ensure-pii-is-not-accidentally-sent-to-analytics-or-error-tracking]].

Why it matters: correct App Router Sentry setup is non-trivial — three runtimes, instrumentation, error boundaries, private maps, release tagging, sampling, PII — the senior answer covers it all, not just "add the DSN." Production angle: Sentry on the news properties with client/server/edge configs, CI source-map upload (de-minified traces, not public), release tagging tied to deploys, sampled traces/replay at scale, and PII scrubbing — feeding alerts on error-rate spikes. Follow-up: "Why three configs?" Browser/Node/edge runtimes. "Capture render errors?" \`global-error.tsx\`/\`error.tsx\` boundaries + \`captureException\`. "At scale?" Sample traces/replays; always replay errored sessions.`,
        },
        {
          q: "How do you upload source maps to Sentry without exposing them publicly?",
          answer: `Generate source maps at build time, **upload them to Sentry** (so it can de-minify stack traces server-side), and ensure the \`.map\` files are **not deployed/served from your public web server/CDN**. The goal: readable stack traces **for your team in Sentry**, an **opaque minified bundle** for the public.

**The standard approach with the Sentry Next.js SDK:**
~~~js
// next.config.js — withSentryConfig uploads maps during the build, then handles them
const { withSentryConfig } = require('@sentry/nextjs');
module.exports = withSentryConfig(nextConfig, {
  org: 'org', project: 'web',
  authToken: process.env.SENTRY_AUTH_TOKEN,  // secret, CI-only
  // the SDK uploads source maps to Sentry during build and (by default in recent
  // versions) deletes them from the client output so they aren't served publicly
});
~~~

~~~
build ─▶ generate source maps ─▶ upload to Sentry (private, authenticated)
      ─▶ DELETE / don't deploy the .map files to the public CDN
result: Sentry de-minifies traces internally; public users can't fetch the maps
~~~

**The mechanisms that keep them private:**
1. **Upload + delete** — upload the maps to Sentry (they live in Sentry, tied to the **release**), then **remove the \`.map\` files from the build output** so they're never deployed to the public server. The Sentry Next.js SDK does this (it manages upload and clean-up).
2. **\`hidden-source-map\`** (webpack) — generates full source maps **but omits the \`//# sourceMappingURL=\` comment** in the bundle, so browsers don't fetch/reference them; you upload the maps to Sentry out-of-band. The map exists for the uploader but isn't discoverable/served.
3. **Don't enable \`productionBrowserSourceMaps\`** in Next unless you intend public maps — Next keeps browser source maps **off by default** for exactly this reason.
4. **Server-side restriction** (defense-in-depth) — block \`.map\` requests at Nginx/CDN, or serve them only to internal IPs, if any slip through.

**Tie maps to a release** so Sentry matches a minified frame to the right map version: upload with a **release identifier** (commit SHA), and tag events with the same release. Then a production stack trace de-minifies to the exact original line.

~~~
✅ upload maps to Sentry (private) + delete from public output (or hidden-source-map)
   -> de-minified traces in Sentry, no public exposure
❌ deploy .map next to .js on the CDN -> anyone can reconstruct your source
~~~

Why it matters: it's the standard way to get **debuggable production errors without leaking source code** (and any secrets that minification was obscuring) — see [[what-are-the-risks-of-exposing-source-maps-in-production]]. The senior answer is "upload to Sentry, don't serve publicly (delete from output / hidden-source-map), tie to release," plus the deeper point that **secrets must never be in client code** regardless. Production angle: CI uploads source maps to Sentry per release (commit SHA) while the public build excludes \`.map\` files — the team sees de-minified traces for the news app, the public sees only the minified bundle. Follow-up: "Still get readable traces?" Yes — Sentry has the maps privately. "hidden-source-map?" Generates maps but omits the public sourceMappingURL reference. "Match the right map?" Tag maps + events with the same release/commit.`,
        },
        {
          q: "How do you attach user context to Sentry events?",
          answer: `Use **\`Sentry.setUser()\`** to attach a user identifier (and \`setTag\`/\`setContext\`/\`addBreadcrumb\` for extra metadata) so errors are correlated to **who/what** experienced them — but attach **pseudonymous/opaque identifiers, not PII** (no raw email/name). This turns "an error happened" into "this error affected N specific users on these flows," which is essential for triage and impact assessment.

~~~js
// set once after auth (or on session start)
Sentry.setUser({
  id: user.id,                  // opaque/internal ID — NOT email/name
  // email/username: AVOID PII; use a hashed/pseudonymous value if you need correlation
  segment: user.isSubscriber ? 'subscriber' : 'anon',
});

// tags = indexed, filterable dimensions
Sentry.setTag('route', '/article/[slug]');
Sentry.setTag('release', process.env.RELEASE);

// context = structured extra data (not indexed, shown on the event)
Sentry.setContext('article', { id: articleId, section: 'sports' });

// breadcrumbs = a trail of actions leading to the error
Sentry.addBreadcrumb({ category: 'ui', message: 'clicked share', level: 'info' });

// clear on logout
Sentry.setUser(null);
~~~

~~~
error event now carries:  user (opaque id, segment) + tags (route/release) + context + breadcrumbs
  -> "this error hit X users, on the article route, in release abc123, after clicking share"
~~~

Why attach user context (the value):
1. **Impact assessment** — see **how many distinct users** an issue affects (error-affected-user %), not just raw counts — far more actionable for prioritization/severity.
2. **Triage & reproduction** — filter to a user/segment, see their **breadcrumb trail** (the actions/navigation/network leading to the error) to reproduce it.
3. **Slicing** — tags (route, release, device, segment) let you find patterns ("only subscribers on the new layout," "only after this release").

**The critical caveat — no PII (GDPR/privacy):**
- Don't put **email, name, phone, precise location** in \`setUser\`/context. Use an **opaque internal ID** (or a hashed/pseudonymous value) for correlation. Set \`sendDefaultPii: false\` (so Sentry doesn't auto-attach IP/cookies) and scrub in **\`beforeSend\`** as a backstop.
- Be careful that **breadcrumbs and request/response bodies** don't capture PII (mask inputs, drop sensitive params). See [[how-do-you-ensure-pii-is-not-accidentally-sent-to-analytics-or-error-tracking]].

~~~
attach:  opaque user id + segment + route/release tags + breadcrumbs  (actionable)
avoid:   email/name/phone/PII in user/context/breadcrumbs  (GDPR; scrub in beforeSend)
~~~

Why it matters: user context transforms error tracking from raw counts into **user-impact and reproducibility** — but doing it **without PII** is the senior distinction (privacy/compliance). Production angle: on the news app, attach an opaque user id + subscriber segment + route/release tags + breadcrumbs so you can see an error affected, say, 0.5% of subscribers on the new article layout in release X — while \`beforeSend\` scrubbing and \`sendDefaultPii:false\` keep emails/IPs out. Follow-up: "PII risk?" Don't send email/name — use opaque IDs; scrub in beforeSend; mask replay inputs. "Why user context matters?" Affected-user % + breadcrumbs for impact and reproduction. "Clear on logout?" \`setUser(null)\` so events aren't mis-attributed.`,
        },
      ],
      tip: "sentry.server.config.ts, sentry.client.config.ts, and sentry.edge.config.ts — Next.js needs all three for full coverage.",
      rajnishAngle:
        "Sentry on Maharashtra Times — source map upload in CI, release tagging, error rate dashboards.",
    },
    {
      title: "Real User Monitoring (RUM)",
      subtopics: [
        "web-vitals library",
        "Custom metrics",
        "Sending to analytics",
        "Percentile analysis (p75, p95)",
        "CrUX API",
      ],
      questions: [
        {
          q: "How do you set up RUM for Core Web Vitals in a Next.js app?",
          answer: `Use the **\`web-vitals\`** library (or Next's **\`useReportWebVitals\`** hook) to capture LCP, INP, CLS (plus TTFB/FCP) from **real users**, then send those measurements to your analytics/RUM backend, aggregated at **p75** by page type/device/country. This gives you the **field** data Google ranks on, with element-level attribution.

~~~jsx
// app/components/WebVitals.tsx
'use client';
import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    const body = JSON.stringify({
      name: metric.name, value: metric.value, id: metric.id, rating: metric.rating,
      // dimensions for slicing:
      path: window.location.pathname, device: getDeviceType(),
    });
    // sendBeacon survives page unload (critical for CLS/INP final values)
    navigator.sendBeacon?.('/rum', body) || fetch('/rum', { body, method: 'POST', keepalive: true });
  });
  return null;
}
// render <WebVitals/> in the root layout
~~~

Or use \`web-vitals\` directly with the **attribution build** for *why* a metric was bad:
~~~js
import { onLCP, onINP, onCLS } from 'web-vitals/attribution';
onINP((m) => send({ ...m, target: m.attribution.interactionTarget })); // which element caused slow INP
~~~

~~~
real user ─▶ web-vitals captures LCP/INP/CLS (+ attribution) ─▶ sendBeacon('/rum') on page hide
          ─▶ store ─▶ dashboard: p75 by template (article/home), device, country
~~~

Key implementation details (the parts that matter):
- **Report at the right time** — CLS and INP **accumulate over the page's life**, so the library reports the **final** value on \`visibilitychange\`/page hide. Use **\`navigator.sendBeacon\`** (or \`fetch(..., {keepalive:true})\`) so the report survives unload — a regular fetch on unload gets dropped.
- **Attribution build** (\`web-vitals/attribution\`) — captures *which* element was the LCP, *which* interaction caused the worst INP, *which* node shifted for CLS — turning "INP is 400ms" into "INP is 400ms on the comment button" (actionable).
- **Send dimensions** — page template, device type, connection, country, A/B variant — so you can slice and find where it's slow.
- **Aggregate at p75**, not average — that's what Google uses and what reflects the slow tail.

Send to a RUM backend / analytics (GA4 via dataLayer, BigQuery, Datadog RUM, or your own endpoint) and dashboard it.

Why it matters: RUM is the **only** way to see what users actually experience (lab can't), it's the **field** data that affects ranking, and **attribution** tells you exactly what to fix. The senior answer covers **sendBeacon-on-hide, attribution, dimensions, and p75**. Production angle: \`web-vitals\` + dataLayer push sending LCP/INP/CLS into GA4/BigQuery, dashboarded at p75 by template (articleshow vs home) and device, with attribution to pinpoint the slow element/interaction. Follow-up: "Why sendBeacon?" Survives unload — needed to capture final CLS/INP. "Why p75?" Captures the slow tail; matches CrUX/ranking. "Attribution?" Tells you the LCP element / slow interaction target — what to fix.`,
        },
        {
          q: "What is the difference between p50, p75, and p95 for performance metrics?",
          answer: `These are **percentiles** — they describe the **distribution** of a metric across all users, not a single number. **p50 (median)** = 50% of users experienced this value or better; **p75** = 75% had this or better (the slowest 25% had worse); **p95** = 95% had this or better (only the worst 5% were slower). They answer "how bad is it for the slower users," which **averages hide**.

~~~
sorted LCP values across users (fast -> slow):
  |--------- 50% --------|------- 25% -------|--- 20% ---|-5%-|
  p50 (median) ─┘        p75 ─┘             p95 ─┘
  p50: half of users are at/under this    (typical experience)
  p75: 3/4 are at/under this              (Google's CWV threshold point)
  p95: 19/20 are at/under this            (the bad tail — worst 5%)
~~~

Why percentiles, not averages (the crucial point): the **average is misleading** for performance because the distribution is **skewed** — a few very slow users (slow devices/networks) inflate the mean, while the mean can also hide a bad tail. Percentiles describe **specific users' experiences**:
~~~
example: most users 1s, a few users 10s
  average ≈ could look "okay" but represents NOBODY's real experience
  p50 = 1s (typical), p95 = 10s (the suffering tail) -> you SEE the problem
~~~

What each is used for:
- **p50 (median)** — the **typical** user's experience; good baseline but ignores the tail.
- **p75** — **what Google uses for Core Web Vitals** thresholds (LCP/INP/CLS must be "good" at p75). So a few slow users dragging up your p75 can **fail you / hurt ranking** even if the median is fine. This is *the* number to monitor for CWV.
- **p95 / p99** — the **worst-case tail**; surfaces problems affecting a meaningful minority (slow devices/regions, edge cases). Often used for latency SLOs (e.g. "p95 TTFB < 800ms") because you care about not failing your slowest users.

~~~
p50: typical experience           p75: Google CWV ranking point (monitor this for CWV)
p95/p99: the bad tail / SLOs       average: misleading for skewed perf data -> avoid
~~~

The senior framing: **monitor the tail (p75/p95), not the average** — optimizing the median can leave a quarter of users with a poor experience that still hurts ranking. "Improving p75" specifically means **pulling up the slower users** (better caching for cold visitors, smaller payloads for low-end devices), not just the median.

Why it matters: percentiles are how real performance is measured; knowing **p75 = Google's CWV point, p95 = tail/SLOs, and why averages mislead** is essential RUM/CWV literacy. Production angle: dashboards track **p75 LCP/INP/CLS** (ranking) and **p95 TTFB** (SLO) by template/device — and the work targets the **slow tail** (cold-cache search visitors on mid-range Androids) since that's what determines p75 and rankings. Follow-up: "Why p75 for CWV?" Google chose it to represent the broad majority while accounting for the slower tail, not the lucky median. "Why not average?" Skewed distributions — average hides the tail and represents no real user. "How improve p75?" Help the slow users (caching, smaller bundles, image optimization), not just the median.`,
        },
        {
          q: "How do you use the CrUX API to get field data for a specific URL?",
          answer: `The **CrUX API** (Chrome UX Report API) returns **real-world field data** — the Core Web Vitals distribution from actual Chrome users — for a given **URL or origin**, programmatically (JSON). It's the same field data behind PageSpeed Insights and Search Console, queryable so you can build dashboards, track trends, and monitor competitors. It returns **75th-percentile** values and the **good/needs-improvement/poor distribution** per metric, over a **28-day** window.

~~~js
// POST to the CrUX API with your API key
const res = await fetch(
  \`https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=\${API_KEY}\`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://navbharattimes.indiatimes.com/some-article',  // or { origin: '...' }
      formFactor: 'PHONE',                                        // PHONE | DESKTOP | TABLET
      metrics: ['largest_contentful_paint', 'interaction_to_next_paint', 'cumulative_layout_shift'],
    }),
  }
);
const data = await res.json();
// data.record.metrics.largest_contentful_paint.percentiles.p75  -> e.g. 2400 (ms)
// .histogram -> [{good %}, {needs-improvement %}, {poor %}]
~~~

~~~
request: { url | origin, formFactor, metrics }
response: per metric -> p75 value + histogram (good / NI / poor distribution), 28-day field data
~~~

Key points:
- **URL vs origin** — query a **specific URL** for that page's data, or an **origin** (whole site) for aggregate data. **Low-traffic URLs may have no data** (CrUX needs enough samples) — fall back to **origin-level** data then.
- **formFactor** — split by PHONE/DESKTOP/TABLET (mobile is usually the binding constraint for news).
- **Returns p75 + histogram** — the p75 value (ranking threshold) and the distribution (% of loads good/NI/poor).
- **28-day rolling window** — it lags, so a fix takes weeks to reflect (same as CrUX in Search Console).
- Related: the **CrUX History API** (trends over time) and the **public BigQuery dataset** (deep historical/origin analysis).

Use cases: build internal CWV dashboards per URL/template, **track trends** after a fix, **benchmark competitors** (you can query any public URL/origin), and alert on field regressions — complementing your own **RUM** (which gives you faster, more granular, attribution-rich data) and **Lighthouse** (lab diagnosis).

~~~
CrUX API:  field truth (what Google ranks on), p75 + distribution, 28-day, by URL/origin/device
   pair with: own RUM (faster, attributed) + Lighthouse (lab diagnosis)
~~~

Why it matters: the CrUX API is how you **programmatically access the field data that affects ranking** for specific URLs — for dashboards, trend tracking, and competitive benchmarking; knowing **URL-vs-origin fallback, p75+histogram, 28-day lag, and form factor** shows real CWV-operations experience. Production angle: querying the CrUX API per article-template URL (and origin fallback for low-traffic pages) on PHONE to dashboard p75 LCP/INP/CLS and watch recovery after a fix — alongside web-vitals RUM for faster, attributed signals. Follow-up: "URL has no data?" Low traffic — fall back to origin-level data. "CrUX API vs your RUM?" CrUX = Google's authoritative field data (lagged, p75, aggregated); your RUM = real-time, granular, attribution-rich, but only your users. "Trends?" CrUX History API / BigQuery dataset.`,
        },
      ],
      tip: "Google ranks based on p75 field data. A few slow users dragging up your p75 can hurt rankings even if median is good.",
      rajnishAngle:
        "web-vitals + dataLayer push on NBT/Maharashtra Times — sending LCP, INP, CLS to GA4 for dashboarding.",
    },
    {
      title: "Logging & Observability",
      subtopics: [
        "Structured logging",
        "Log levels",
        "Server-side logging in Next.js",
        "Correlation IDs",
        "OpenTelemetry basics",
      ],
      questions: [
        {
          q: "What is structured logging and why is it better than plain string logs?",
          answer: `**Structured logging** emits logs as **machine-parseable structured data** (typically **JSON**) with **consistent named fields** — timestamp, level, message, plus context like \`traceId\`, \`userId\`, \`route\`, \`duration\` — instead of **unstructured free-text strings**. This makes logs **queryable, filterable, and aggregatable** by log platforms (Kibana/Elasticsearch, Grafana Loki, Datadog, CloudWatch).

~~~js
// ❌ plain string log — hard to parse/query reliably
console.log(\`User \${userId} fetched article \${articleId} in 230ms\`);

// ✅ structured log — consistent JSON fields
logger.info({
  msg: 'article.fetch',
  userId, articleId, durationMs: 230,
  traceId: ctx.traceId, route: '/article/[slug]', level: 'info',
  timestamp: new Date().toISOString(),
});
// -> {"msg":"article.fetch","userId":"u1","articleId":"a9","durationMs":230,"traceId":"...","level":"info",...}
~~~

~~~
plain string:   "User u1 fetched article a9 in 230ms"  -> regex-parse, fragile, inconsistent
structured:     {userId, articleId, durationMs, traceId, level}  -> query/filter/aggregate directly
~~~

**Why structured is better:**
1. **Queryable** — search/filter by field in your log platform: \`level:error AND route:"/checkout"\`, \`durationMs > 1000\`, \`userId:u1\`. With plain strings you'd write brittle regex/grep.
2. **Aggregatable** — compute metrics from logs: avg/p95 \`durationMs\`, count of errors by \`route\`, group by \`userId\` — because fields are typed/consistent.
3. **Correlation** — include a **\`traceId\`/correlation ID** so you can pull **every log line for one request** across services (frontend -> Nginx -> Node -> API) — impossible to do reliably with free-text.
4. **Consistency** — every log has the same shape (level, timestamp, context), so dashboards/alerts are reliable.
5. **Machine-friendly** — log pipelines, alerting, and anomaly detection work on fields, not on parsing prose.

**Best practices:** include consistent fields (timestamp, level, message/event name, traceId, userId, service, env), use **log levels** appropriately (debug/info/warn/error), **don't log PII/secrets** (scrub), and use a logger library (**pino**, **winston**, **bunyan**) rather than \`console.log\` for structured output + transport + performance.

~~~
core fields: timestamp, level, message/event, traceId(correlation), userId, route, durationMs, service, env
   -> query/aggregate/correlate; alert on fields; trace a request end-to-end
~~~

Why it matters: structured logging is the foundation of **observability at scale** — it's the difference between grepping prose and **querying/aggregating/correlating** across a distributed system; the senior answer covers **JSON fields, correlation IDs, queryability/aggregation, and PII scrubbing**. Production angle: server-side Next.js SSR logs as JSON (pino) with a \`traceId\` propagated from the request, so a user's request can be traced through Nginx -> Node -> API in Kibana, and metrics (p95 SSR duration, error counts by route) are computed directly from log fields. Follow-up: "How trace one request?" A correlation/traceId field on every log line for that request. "Library?" pino/winston for JSON output + transports. "PII?" Never log PII/secrets — scrub; structured fields make it easier to control what's emitted.`,
        },
        {
          q: "How do you add a correlation ID to trace a request from frontend to backend?",
          answer: `A **correlation ID** (a.k.a. request/trace ID) is a **unique identifier generated per request** and **propagated through every layer** (frontend -> Nginx -> Next.js server -> backend APIs -> logs), so you can **stitch together all logs/events for a single request** across the whole system. It's the key to debugging distributed flows: filter every log by one ID and see the request's entire journey.

**How to implement (propagate via a header):**
~~~js
// 1. Generate at the edge/entry (or reuse an incoming one)
// Nginx can inject one:  proxy_set_header X-Request-Id $request_id;
// or in Next.js middleware:
export function middleware(req) {
  const id = req.headers.get('x-request-id') ?? crypto.randomUUID();
  const res = NextResponse.next();
  res.headers.set('x-request-id', id);   // pass it along / back
  return res;
}

// 2. Include it in EVERY log line on the server
logger.info({ msg: 'rendering article', traceId: requestId, route });

// 3. FORWARD it to downstream API calls so they log the SAME id
await fetch(apiUrl, { headers: { 'X-Request-Id': requestId } });

// 4. (Frontend) generate/attach on client requests too, and send it to Sentry
Sentry.setTag('request_id', requestId);
~~~

~~~
client ─(X-Request-Id: abc)─▶ Nginx ─(abc)─▶ Next.js SSR ─(abc)─▶ backend API
   every layer LOGS with traceId=abc  ─▶ filter logs by abc = full request timeline
~~~

The mechanics:
1. **Generate once** at the entry point (load balancer/Nginx/middleware) — or **reuse** an incoming \`X-Request-Id\`/\`traceparent\` if the caller already set one (so a chain shares an ID).
2. **Propagate** it through the call chain via a header (\`X-Request-Id\`, or W3C **\`traceparent\`** for OpenTelemetry).
3. **Log it on every line** (structured logging field \`traceId\`) at each service.
4. **Return it** to the client (response header) and/or attach to **Sentry** events, so a user-reported error's ID can be tied back to the exact server logs.

**Why it's essential:** in a distributed system one user action touches many services; without a correlation ID you can't tell which log lines belong to the same request (timestamps are ambiguous under load). With it, you **filter by one ID** and reconstruct the request end-to-end — find where it slowed down or failed.

**Relation to distributed tracing/OpenTelemetry:** correlation IDs are the simple form; **OpenTelemetry** standardizes this with **trace IDs + span IDs** propagated via \`traceparent\`, giving a full **trace** (parent/child spans with timings) across services — the same idea, richer.

~~~
generate/reuse at entry ─▶ propagate via header ─▶ log on every line ─▶ return to client/Sentry
   = filter by one id to see the whole request across frontend + Nginx + Node + API
~~~

Why it matters: correlation IDs are fundamental to **debugging distributed/SSR systems** — the senior answer covers **generate-or-reuse, propagate via header, log everywhere, return to client/Sentry**, and ties it to **OpenTelemetry tracing**. Production angle: a request ID injected at Nginx (\`$request_id\`), propagated into Next.js SSR logs and forwarded to backend API calls, and tagged on Sentry events — so a user's error or a slow article render can be traced through Nginx -> Node -> API by one ID. Follow-up: "Reuse incoming ID?" Yes — if upstream set one, reuse it so the whole chain shares it. "OpenTelemetry?" Standardizes propagation (\`traceparent\`) + spans for full distributed traces. "Tie to user error?" Return the ID to the client / attach to Sentry so a report maps to server logs.`,
        },
        {
          q: "What is OpenTelemetry and how does it relate to Next.js observability?",
          answer: `**OpenTelemetry (OTel)** is a **vendor-neutral, open standard** (CNCF) for generating, collecting, and exporting **telemetry data** — the **three pillars: traces, metrics, and logs** — from your applications. It provides standard **APIs/SDKs** and a wire format (OTLP) so you instrument your code **once** and export to **any** compatible backend (Datadog, Grafana/Tempo, Honeycomb, Jaeger, New Relic) without vendor lock-in.

~~~
the three pillars of observability (OTel unifies them):
  Traces  — the path + timing of a request across services (spans: parent/child, durations)
  Metrics — numeric measurements over time (request rate, latency, error count, CPU)
  Logs    — timestamped event records (ideally structured, correlated by trace id)
~~~

~~~
your app ─instrument with OTel SDK─▶ traces/metrics/logs (OTLP)
   ─▶ OTel Collector ─▶ ANY backend (Datadog / Grafana / Jaeger / Honeycomb...)
   instrument once, export anywhere (no vendor lock-in)
~~~

**How it relates to Next.js (App Router has first-class support):**
1. **\`instrumentation.ts\`** — Next.js has a built-in hook (\`register()\` in \`instrumentation.ts\`) to **initialize OpenTelemetry** at server startup. Next.js **auto-instruments** key operations — **route rendering, RSC, data fetching, and route handlers** — emitting spans so you can see, per request, where server time goes (which fetch was slow, render duration, etc.).
2. **\`@vercel/otel\`** (or the OTel SDK) sets this up quickly:
~~~ts
// instrumentation.ts
import { registerOTel } from '@vercel/otel';
export function register() {
  registerOTel({ serviceName: 'news-web' });   // emits traces to your OTLP backend
}
~~~
3. **Distributed tracing** — OTel propagates a **trace context** (\`traceparent\` header) across services, so a request's spans link **frontend -> Next.js SSR -> backend APIs** into **one trace** — a richer version of the correlation-ID idea (see [[how-do-you-add-a-correlation-id-to-trace-a-request-from-frontend-to-backend]]).
4. **Correlate with errors/RUM** — trace IDs can tie OTel traces to **Sentry** errors and **RUM** events, so a slow/failed request connects its trace, logs, and the user-facing error.

**What you get for a Next.js app:** per-request **traces** showing render + data-fetch timings (find the slow SSR dependency), **metrics** (request rate, p95 latency, error rate) for dashboards/alerts, and **correlated logs** — all exportable to your chosen observability backend. It's the standard way to get **deep server-side observability** for SSR/RSC beyond just error tracking.

~~~
Next.js instrumentation.ts + @vercel/otel ─▶ auto spans for render/RSC/fetch/route handlers
   ─▶ distributed trace across frontend/SSR/API ─▶ exported to your backend
   ─▶ find slow data fetches, see request timing, correlate with Sentry/RUM
~~~

Why it matters: OTel is the **industry-standard observability framework**, and Next.js App Router supports it natively via \`instrumentation.ts\` — knowing the **three pillars, vendor-neutral export, Next's auto-instrumentation of render/fetch, and distributed tracing** shows modern observability depth (beyond "we use Sentry"). Production angle: \`instrumentation.ts\` + \`@vercel/otel\` on the news app emits traces for SSR/RSC/data-fetch (revealing which backend call slows article TTFB), propagates trace context to backend APIs for end-to-end traces, and exports to the observability backend — correlated with Sentry errors and web-vitals RUM. Follow-up: "Three pillars?" Traces, metrics, logs. "Next.js hook?" \`instrumentation.ts\` \`register()\` — auto-instruments render/RSC/fetch/route handlers. "Why vendor-neutral matters?" Instrument once, switch/observe across any OTLP backend — no lock-in. "Relation to correlation IDs?" OTel is the standardized, richer form (trace + spans via traceparent).`,
        },
      ],
      tip: "Structured logs = JSON with consistent fields (timestamp, level, traceId, userId). Makes log querying in Kibana/Grafana trivial.",
      rajnishAngle:
        "Server-side logging for Next.js SSR errors on Times Internet — tracing a user's request through Nginx → Node.",
    },
    {
      title: "Alerting & Dashboards",
      subtopics: [
        "Key metrics to alert on",
        "Alert fatigue",
        "Grafana / Datadog basics",
        "SLOs & SLAs",
        "Runbooks",
      ],
      questions: [
        {
          q: "What frontend metrics would you create alerts for?",
          answer: `Alert on metrics that signal **user-facing or revenue impact**, tied to **SLOs**, and prefer **anomaly/rate-of-change** detection over static thresholds. Group them: errors/availability, performance (field), and business.

~~~
ERRORS & AVAILABILITY (highest priority)
  - JS error RATE spike (Sentry) — esp. error-affected-USER % jumping
  - Uptime / synthetic checks failing (homepage, article, search down)
  - 5xx rate (origin/CDN/Nginx) above baseline
  - SSR/RSC error rate, hydration error spike
  - Failed-request rate to critical APIs

PERFORMANCE (field / RUM)
  - Core Web Vitals p75 regression: LCP >2.5s, INP >200ms, CLS >0.1
  - TTFB p95 elevated (origin/SSR slow) — leading indicator
  - CDN/Nginx cache HIT-ratio drop (predicts origin overload)
  - Bundle size / First Load JS regression (CI gate, not runtime alert)

BUSINESS / UX (revenue-impacting)
  - Ad revenue / fill rate / viewability drop (ad-funded site!)
  - Conversion (subscribe/newsletter) drop
  - Traffic anomaly (sudden drop = something broke / spike = capacity risk)
~~~

The principles behind the choices (senior reasoning):
1. **Alert on impact, not noise** — page on things that affect **users or revenue**: availability, error-affected-user %, CWV regressions, ad revenue. A noisy non-breaking log spike is not page-worthy.
2. **Rate-of-change / anomaly, not just static thresholds** — a **sudden 5x jump** in JS errors is far more actionable than an absolute count (traffic varies; baselines shift). Alert on deviation from the expected pattern.
3. **Tie alerts to SLOs / error budgets** — e.g. "availability < 99.9%," "p75 LCP good % < target," "p95 TTFB > 800ms" — alert on **SLO burn rate** so you fire before the budget is blown.
4. **Severity tiers** — page (wake someone) for user-down/revenue-down; ticket/Slack for slow degradations.
5. **News-specific** — **cache hit-ratio drop** (predicts origin overload before the next spike), **5xx/TTFB under load** (breaking-news/IPL spikes), and **ad metrics** (the revenue) are first-class.

~~~
page on:  availability/error-rate spike, 5xx, CWV p75 regression, ad-revenue drop, cache-hit cliff
   anomaly-based, SLO-tied, impact-prioritized — NOT every metric, NOT static-only thresholds
~~~

Why it matters: choosing **what to alert on** (and how — anomaly + SLO-based, impact-first) is what separates a useful alerting setup from one that causes alert fatigue; the senior answer covers the right metrics across errors/perf/business **and** the alerting philosophy. Production angle: for the news properties — page on availability/synthetic failures, error-affected-user % spikes (Sentry), 5xx/TTFB under traffic spikes, CWV p75 regressions, and ad-revenue/viewability drops, with anomaly detection and SLO burn-rate alerts. Follow-up: "Static threshold problem?" Traffic varies — absolute counts mislead; use rate-of-change/anomaly. "Most important?" Availability + error-affected-user %, and (news) field CWV + ad revenue. "Why cache hit-ratio?" A drop predicts origin overload during the next spike — a leading indicator.`,
        },
        {
          q: "What is the difference between an SLO and an SLA?",
          answer: `These define and commit to reliability targets, at different levels of formality. **SLI** (the measurement), **SLO** (the internal target), **SLA** (the external contract) form a hierarchy:

~~~
SLI (Service Level Indicator)  — the METRIC you measure
   e.g. % of requests served < 800ms; % of successful requests (availability)
SLO (Service Level Objective)  — your INTERNAL TARGET for that SLI
   e.g. "99.9% availability over 30 days"; "p75 LCP good for 90% of pageviews"
SLA (Service Level Agreement)  — an EXTERNAL CONTRACT with consequences
   e.g. "99.95% uptime or we credit you 10%" — legally/financially binding
~~~

~~~
SLI -> measured value          (what IS happening)
SLO -> internal goal           (what we AIM for; stricter, no penalties)
SLA -> customer promise        (what we GUARANTEE; looser than SLO, has penalties)
~~~

The key distinctions:
- **SLO is internal, SLA is external/contractual.** The SLO is the **engineering target** you hold yourselves to; the SLA is a **promise to customers** with **financial/legal consequences** (service credits, refunds, penalties) if breached.
- **SLO is usually STRICTER than the SLA** — you set the internal target **higher** than the contractual one to give yourself a **buffer**: if your SLA promises 99.9%, you might run to a 99.95% SLO so you catch problems before you breach the customer-facing SLA. The gap is your safety margin.
- **SLA needs SLOs/SLIs underneath** — you can't honor an SLA without measuring SLIs and tracking SLOs.

**Error budget (the operational tool that ties it together):** \`error budget = 1 - SLO\`. A 99.9% availability SLO means a **0.1% error budget** (~43 min/month of allowed downtime). You **spend** the budget on incidents/risky deploys; while budget remains, you can ship aggressively; if you're **burning** it too fast (or it's exhausted), you **slow down and prioritize reliability** over features. **Burn-rate alerts** fire when you're consuming the budget faster than sustainable.

~~~
SLO 99.9%  ->  error budget 0.1% (~43 min/month)
   budget remaining -> ship features;  budget burning fast -> freeze, fix reliability
   burn-rate alerting fires before you breach the SLA
~~~

Most **frontend** teams care about **SLIs/SLOs + error budgets** (availability, latency, CWV) for **internal** reliability management; **SLAs** are more common for paid B2B/infra services. For a consumer news site, you'd set internal **SLOs** (uptime, p75 CWV, p95 TTFB) and manage to error budgets, even without formal customer SLAs.

Why it matters: SLI/SLO/SLA + error budget is the **language of reliability engineering**; knowing **SLO=internal target (stricter), SLA=external contract (penalties), error budget = 1−SLO drives ship-vs-stabilize decisions** shows operational maturity. Production angle: the news team runs internal SLOs (e.g. 99.9% availability, p75 LCP "good", p95 TTFB < 800ms) with error budgets and burn-rate alerts to decide when to slow feature work and focus on reliability — formal customer SLAs apply more to the infra/ad-partner side. Follow-up: "Why is the SLO stricter than the SLA?" Internal buffer to catch issues before breaching the customer contract. "Error budget?" 1−SLO; spend it on risk/incidents; freeze when exhausted. "SLI vs SLO?" SLI is the measured metric; SLO is the target for it.`,
        },
        {
          q: "How do you avoid alert fatigue in a monitoring system?",
          answer: `**Alert fatigue** is when too many alerts — especially **noisy, non-actionable, or false-positive** ones — desensitize the on-call team, so they start ignoring/muting alerts and **miss the real incidents**. It's a serious reliability risk (the "boy who cried wolf"). Avoiding it is about making **every alert meaningful, actionable, and appropriately urgent.**

**Strategies:**
1. **Alert on symptoms (user impact), not causes** — page on "users are seeing errors / the site is slow" (SLO-based), not on every internal metric blip (a single high-CPU spike that didn't affect users). Symptom-based alerting reduces volume dramatically and focuses on what matters.
2. **Every alert must be ACTIONABLE** — if there's nothing to do, it shouldn't page. Non-actionable alerts become noise. Each page should map to a clear response (ideally a **runbook**).
3. **Anomaly / rate-of-change over static thresholds** — static thresholds fire constantly under normal variance (traffic swings); alert on **deviation from baseline** so you fire on real anomalies, not noise.
4. **Severity tiers & routing** — **page** (wake someone) only for urgent user/revenue impact; send **warnings to Slack/tickets** for slow degradations. Don't page for non-urgent things.
5. **Tune thresholds & require duration** — require a condition to **persist** (e.g. "5xx > X for 5 min," not a single spike) and set thresholds from real baselines to cut transient false positives.
6. **Deduplicate & group** — collapse related alerts into **one** incident (a downstream outage shouldn't fire 50 separate alerts); use grouping/correlation so one root cause = one alert.
7. **SLO burn-rate alerts** — alert on **error-budget burn rate** (fast burn = page, slow burn = ticket) rather than raw metrics — inherently impact- and urgency-aware.
8. **Continuously prune** — **review alerts regularly**: delete/mute ones that are consistently noisy or ignored, fix flaky ones. Track alert volume and **per-alert actionability**; an alert that's never acted on should be removed.
9. **Quiet hours / maintenance windows / auto-resolve** — suppress during known deploys/maintenance; auto-resolve when the condition clears.

~~~
reduce noise:  symptom/SLO-based + actionable-only + anomaly(not static) + duration/grouping
prioritize:    severity tiers (page vs ticket) + burn-rate alerting + routing
maintain:      regular alert review/pruning + runbooks + maintenance windows
~~~

The mindset (senior framing): **fewer, higher-quality alerts.** An on-call rotation should get a **small number of pages, each meaning "a human must act now."** If people are muting alerts, the system is broken — fix the alerts, don't blame the team. Pair every page with a **runbook** (what to check, how to mitigate) so responding is fast and consistent, and run **blameless post-mortems** that include "was this alert useful?" action items.

Why it matters: alert fatigue causes **missed real incidents** — designing alerts to be **actionable, impact-based, anomaly-driven, tiered, deduplicated, and regularly pruned** is core to a healthy on-call/observability practice; the senior answer covers all of it plus the **symptom-over-cause** and **burn-rate** principles. Production angle: the news team pages only on SLO-impacting symptoms (availability, error-affected-user %, 5xx/CWV regressions, ad-revenue drops) with anomaly detection + duration windows + dedup, routes non-urgent degradations to Slack, attaches runbooks to each page, and reviews/prunes alerts regularly so on-call stays trustworthy. Follow-up: "Symptom vs cause alerting?" Page on user-visible symptoms (SLO), not every internal cause — fewer, more meaningful alerts. "Static threshold issue?" Fires on normal variance; use anomaly/rate-of-change + duration. "Runbooks?" Every page links a response guide so mitigation is fast and consistent.`,
        },
      ],
      tip: "Alert on rate of change, not just thresholds. Sudden 5x spike in JS errors is more actionable than absolute count.",
      rajnishAngle:
        "Times Internet SLOs for page load time and error rate — what thresholds trigger on-call for your team.",
    },
    {
      title: "Senior Ownership & Delivery",
      subtopics: [
        "Production issue storytelling",
        "Task estimation",
        "Engineering quality",
        "Technical debt management",
        "Decision-making under constraints",
      ],
      questions: [
        {
          q: "Tell me about a production issue you solved.",
          answer: `Use a concise **STAR** structure, but keep the emphasis on technical judgment.

Good answer flow:
- **Situation**: what broke and what the user/business impact was
- **Task**: what you personally owned
- **Action**: how you investigated, mitigated, fixed, and verified
- **Result**: measurable outcome and the prevention step added afterward

What interviewers want to hear:
- you quantified impact
- you mitigated first when needed
- you used data, not guesswork
- you added a guardrail so the issue class does not repeat

Strong one-liner:
"I focus on impact, mitigation, root cause, and prevention, not just the bug fix itself."`,
        },
        {
          q: "How do you estimate tasks realistically?",
          answer: `I estimate by breaking work into **scope, unknowns, dependencies, implementation, and validation** instead of guessing one large number.

My approach:
- confirm acceptance criteria
- split work into design, coding, testing, rollout, and cleanup
- surface unknowns separately
- call out cross-team dependencies
- give a range when uncertainty is real

~~~text
estimate = implementation + integration + validation + rollout + risk buffer
~~~

Strong interview line:
"I avoid false precision. I break work down, separate known effort from unknown risk, and explain the assumptions behind the estimate."`,
        },
        {
          q: "How do you improve engineering quality in a frontend team?",
          answer: `I improve quality by making the safest path the easiest path.

That usually means:
- strong code review standards
- linting, typing, and CI checks
- shared architecture/component conventions
- production observability
- post-mortems that create reusable guardrails

Quality is broader than tests alone. It also includes:
- maintainability
- performance discipline
- rollout safety
- debugging visibility
- consistency across the team

Interview one-liner:
"Engineering quality improves when good defaults, automation, observability, and shared standards reduce the number of mistakes a developer can make in the first place."`,
        },
        {
          q: "How do you manage technical debt without blocking delivery?",
          answer: `I manage technical debt by prioritizing it by **interest rate**, not by guilt.

My approach:
- classify debt by impact on speed, reliability, performance, or security
- fix high-interest debt that repeatedly slows delivery or causes incidents
- pay down small debt opportunistically during nearby feature work
- give larger systemic debt its own scoped initiative
- document intentionally deferred debt instead of pretending it does not exist

~~~text
high-interest debt -> fix proactively
low-impact debt -> track and defer intentionally
~~~

Strong interview line:
"Not all debt deserves equal urgency. I prioritize the debt that taxes every future change or creates operational risk, and I avoid turning debt discussions into an unbounded cleanup wishlist."`,
        },
      ],
      tip: "For senior interview questions, give a framework first, then anchor it with a real example.",
      rajnishAngle:
        "Use your own production stories here: performance regressions, stream issues, deploy rollbacks, and the guardrails you added afterward.",
    },
  ],
};
