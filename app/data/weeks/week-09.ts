import type { Week } from "../types";

export const week09: Week = {
  week: 12,
  theme: "Caching Strategy (Full Stack)",
  color: "#0EA5E9",
  topics: [
    {
      title: "Caching Mental Model — The 5 Layers",
      subtopics: [
        "Memory cache",
        "Browser cache",
        "Service Worker cache",
        "Nginx proxy cache",
        "CDN edge cache",
      ],
      questions: [
        {
          q: "Explain each layer of caching a request goes through on a news site.",
          answer: `Visualize the layers as concentric circles — **closer to the user = faster + cheaper, but smaller/more private**; **closer to origin = larger/shared but slower**. A request tries each in order; the first hit wins and shields everything behind it.

~~~
[ User ] → Memory → Browser disk → Service Worker → CDN edge → Nginx → Next.js caches → Origin/DB
            ns        ms             ms              ~10-50ms    origin    app             slow
   private/per-tab ........................ shared/global ..................... source of truth
~~~

1. **Memory cache (browser RAM)** — the browser's in-memory cache for resources already fetched **this session/page**. Fastest (nanoseconds), tiny, cleared on tab close. Handles repeat references to the same asset on a page.

2. **Browser disk (HTTP) cache** — persistent on-disk cache governed by \`Cache-Control\`/\`ETag\`. Serves hashed assets (\`immutable\`) instantly across visits; revalidates HTML via 304. Private to the user.

3. **Service Worker cache (Cache Storage API)** — programmable cache you control via a SW: cache-first for static assets, network-first for article HTML, offline fallback. Intercepts requests before they hit the network. Enables offline + custom strategies.

4. **CDN edge cache** — first **shared** cache, replicated across global POPs near users. Absorbs the bulk of read traffic with low latency; honors \`s-maxage\`/surrogate keys. The biggest spike-absorber.

5. **Nginx proxy cache** — **origin-side shield**: serves CDN misses from disk so even a cold edge often doesn't reach the app; adds TLS, compression, stampede protection.

6. **Next.js caches** (Request Memo, Data Cache, Full Route Cache, Router Cache) — app-level caching of fetches and rendered routes.

7. **Origin / DB / CMS** — the source of truth; reached only on a full miss/regeneration.

~~~
hit at memory/browser = instant, no network
hit at SW            = instant, offline-capable
hit at CDN           = ~edge latency, shields origin entirely
hit at Nginx         = origin shield for CDN misses
miss to origin       = slowest; minimize via all the above
~~~

Why it matters: a senior answer maps **what's cached where, the TTL/invalidation per layer, and what's private vs shared** — and notes personalized content can only be cached in the **private** layers (browser/SW), never the shared ones. Production angle: walk a real article request — hashed JS/CSS from browser disk (immutable), article HTML from CDN edge (s-maxage+SWR) backed by Nginx proxy_cache, regenerated via ISR/\`revalidateTag\` on publish, with the SW giving offline fallback. Follow-up: "Where cache personalized content?" Only browser/SW (private) or render dynamically; shared caches would leak it. "Which layer first on a repeat asset?" Memory, then disk.`,
        },
        {
          q: "Which cache layer gives the highest latency savings and why?",
          answer: `It depends on framing, and a strong answer covers both interpretations:

**Per-request latency saved (closest layer wins):** the **browser caches (memory/disk)** and **Service Worker** give the **highest latency saving for the user** because they serve from the **local device with zero network round-trip** — nanoseconds/milliseconds vs tens-to-hundreds of ms for any network hop. A cache-hit in the browser is literally as fast as it gets.

~~~
browser memory/disk : 0 network  -> ~0–1ms      (biggest per-hit saving)
Service Worker      : 0 network  -> ~ms         (offline-capable)
CDN edge            : 1 short RTT -> ~10–50ms
Nginx (origin)      : full RTT to origin region
origin render+DB    : slowest
~~~

**Aggregate/system impact (the layer that matters most at scale):** the **CDN edge cache** delivers the **highest *total* latency savings across all users and the biggest origin-load reduction**, because (a) it serves the **majority of traffic** globally from POPs near users, and (b) it's **shared** — one cached copy serves everyone, including first-time visitors (who have empty browser caches). Browser/SW caches only help **repeat** visits of the **same** user; the CDN helps **everyone, including the first hit**.

~~~
browser/SW: helps ONE user's REPEAT visits (empty on first visit)
CDN edge:  helps ALL users including FIRST visit -> biggest aggregate win + shields origin
~~~

The senior synthesis: **for a single repeat request, the browser/SW layer saves the most latency (no network at all); for the whole system and first-time visitors, the CDN saves the most** — which is why news sites invest heavily in CDN caching (most readers arrive cold from search/Discover with empty browser caches, so browser caching can't help that first, ranking-critical pageview — only the CDN can).

Why it matters: it shows you distinguish **per-request** vs **aggregate/cold-visit** impact and understand that **first impressions (cold cache) are dominated by the CDN/origin path**, which is what affects LCP/ranking for search/Discover traffic. Production angle: news readers mostly land cold from Google/Discover, so CDN edge caching (+ fast origin via Nginx/ISR) drives the LCP they actually experience; browser/SW caching then speeds their subsequent navigations within the session. Follow-up: "Why can't browser cache help the news use case much?" Most pageviews are first/cold from search — empty browser cache — so the CDN/origin path determines the experience. "Where does SW shine?" Returning/engaged users and offline.`,
        },
        {
          q: "At which layer would you cache personalised content vs public content?",
          answer: `The rule: **public/shared content can be cached in shared layers (CDN, Nginx, server route cache); personalized/per-user content must NOT be cached in shared layers** — cache it only in **private** layers (the user's browser/Service Worker) or don't cache it at all (render dynamically). Caching personalized HTML at a shared layer is a serious bug: one user's data gets served to others (privacy leak + cache poisoning).

~~~
                      can cache at...
Public (same for all):  Browser ✓  SW ✓  CDN ✓  Nginx ✓  Next route cache ✓
Personalized (per user): Browser ✓  SW ✓  CDN ✗  Nginx ✗  Next route cache ✗ (dynamic)
~~~

How to handle each:

**Public content** (article body, category lists, anonymous homepage) — cache aggressively at **CDN + Nginx + Next ISR/route cache** with \`Cache-Control: public, s-maxage=...\`. Shared, high hit-rate.

**Personalized content** (logged-in header, "for you" feed, saved articles, recommendations) — options in order of preference:
1. **Cache the public shell, personalize on the client** — serve a fully-cached, shared HTML/RSC shell from the CDN, then fetch the personalized bits **client-side** (React Query) after load. Best of both: edge-cached performance + per-user data. The personal API responses use \`Cache-Control: private\` (browser-only) or \`no-store\`.
2. **Edge personalization** — compute light personalization at the edge (middleware) using a cookie, but be careful with cache keys (bucket into few segments, don't fragment per user).
3. **SSR dynamic + private cache** — render per-request with \`Cache-Control: private, no-store\` so only the browser may cache it, never shared caches. Add \`proxy_no_cache\`/\`proxy_cache_bypass\` on the session cookie in Nginx.

~~~
recommended pattern:
  CDN-cached public shell  ─▶ fast first paint (shared)
        + client-side fetch of /api/me  (Cache-Control: private)
        ─▶ personalization hydrated per user, never shared-cached
~~~

Guardrails to mention: ensure personalized responses carry **\`Cache-Control: private\`/\`no-store\`** and a **\`Vary\`** that prevents shared caching, set **\`proxy_no_cache $cookie_session\`** in Nginx, and never let \`Set-Cookie\` responses get shared-cached. Segment-level caching (e.g. cache by \`region\` or \`subscriber: yes/no\` — low cardinality) is fine; per-user-ID cache keys are not (no hit rate + risk).

Why it matters: it's the **correctness + privacy** dimension of caching, not just performance — getting it wrong leaks user data. The "cache the shell, personalize client-side" pattern is the standard senior answer. Production angle: anonymous article/category pages fully CDN-cached; logged-in personalization (saved items, recommendations) fetched client-side over a cached shell with \`private\` cache headers and Nginx bypass on the session cookie. Follow-up: "Caching by user segment?" Acceptable if cardinality is low (a few buckets) via cache key/surrogate; per-user is not. "What header bug commonly leaks personalized data?" Missing \`private\`/\`no-store\` (or a \`Set-Cookie\`) on a personalized response that a shared cache then stores.`,
        },
      ],
      tip: "Visualize the layers as concentric circles — Memory → Browser → SW → Nginx → CDN → Origin. Closer = faster.",
      rajnishAngle:
        "Walk through a real article page request on NBT: which layers it hits, what TTL each has.",
    },
    {
      title: "HTTP Cache Headers — Complete Guide",
      subtopics: [
        "Cache-Control directives",
        "max-age vs s-maxage",
        "no-cache vs no-store vs must-revalidate",
        "ETag & Last-Modified",
        "Vary header",
        "immutable",
      ],
      questions: [
        {
          q: "What is the difference between no-cache and no-store?",
          answer: `**\`no-store\`** = never store the response in any cache; fetch fully from origin every time. **\`no-cache\`** = you *may* store it, but you must **revalidate** with the origin (via ETag/Last-Modified) before serving it; on a 304 you reuse the cached body. So \`no-cache\` still benefits from cached bytes (304 saves the download); \`no-store\` never caches at all.

~~~
no-store : [client] ─────full request────▶ [origin]    (no caching, no reuse)
no-cache : [client] ─If-None-Match: etag─▶ [origin]
             304 ─▶ reuse cached body (no re-download)
             200 ─▶ new body replaces cache
~~~

Use **\`no-store\`** for sensitive/never-cacheable responses (auth pages, PII, tokens). Use **\`no-cache\`** for content that must be verified fresh on each use but where 304-revalidation saves bandwidth (HTML that's usually unchanged).

The trap: **\`no-cache\` does not mean "don't cache"** — for "don't cache," use \`no-store\`. And \`no-cache\` without an ETag/Last-Modified validator just becomes an unconditional re-fetch (no 304 benefit). See [[etag-validation]] for the revalidation mechanism. Production angle: \`no-store\` on personalized/auth API responses; \`no-cache\` + ETag on HTML you want validated. Follow-up: "must-revalidate?" Adds that once stale, the cache must not serve stale on error — must revalidate. "private?" Allows browser cache but forbids shared caches (different axis from no-store).`,
        },
        {
          q: "What does Cache-Control: immutable do and when should you use it?",
          answer: `**\`immutable\`** tells the browser the response **will never change** for the life of its \`max-age\`, so it should **not revalidate it — ever — even on a manual reload (F5)**. Normally a user reload triggers conditional revalidation requests (If-None-Match) for cached resources; \`immutable\` suppresses those, so reloads are truly instant (no network at all for those assets).

~~~
Cache-Control: public, max-age=31536000, immutable
  normal cached asset on reload: GET (If-None-Match) -> 304 (still a round-trip)
  immutable asset on reload:     served straight from cache, NO request
~~~

When to use it: **only on content-hashed / versioned URLs** — files whose URL changes whenever their content changes (webpack/Next emit \`main.4f3a9c.js\`, \`/_next/static/...\`). Since a new content = new URL, the old URL's bytes are genuinely immutable, so promising "never revalidate" is safe.

~~~
✅ /static/app.4f3a9c.js   -> immutable (URL changes on rebuild)
❌ /index.html             -> NOT immutable (same URL, content changes) -> would serve stale
❌ /logo.png (unversioned) -> NOT immutable (you couldn't update it)
~~~

Why it's valuable: on a site where users reload often, \`immutable\` removes a pile of needless 304 revalidation round-trips for static assets — meaningful for repeat-visit performance and origin load. It's the perfect complement to **cache busting via versioned URLs**: long \`max-age\` says "cache for a year," \`immutable\` says "and don't even check."

The danger: applying \`immutable\` to a **non-versioned** URL (like \`style.css\` or HTML) means users can be **stuck with a stale asset for a year** with no way to revalidate — you'd have to change the URL to update it. So: immutable ⇔ the URL is content-addressed.

Why it matters: shows you understand the interplay of **versioned URLs + long max-age + immutable** as the clean, purge-free invalidation strategy for assets. Production angle: \`public, max-age=31536000, immutable\` on all hashed \`/_next/static/\` bundles and versioned images; never on HTML (which uses short s-maxage + revalidation). Follow-up: "How do you update an immutable asset?" You don't — you ship a new hashed URL; the old one expires unused. "Browser support?" Honored by major browsers; others just ignore it and fall back to normal max-age revalidation (still safe).`,
        },
        {
          q: "How does the Vary header affect caching and what are its pitfalls?",
          answer: `**\`Vary\`** tells caches that the response **depends on specific request headers**, so the cache must store and serve a **separate variant per distinct value** of those headers. It's how one URL can have multiple cached representations (compressed vs not, per language, per device). Getting it wrong either **fragments the cache** (low hit rate) or **serves the wrong variant** (correctness bug).

~~~
Vary: Accept-Encoding
  -> cache stores a gzip variant AND an identity variant of the SAME url;
     serves the right one based on the client's Accept-Encoding. (correct, low cardinality)

cache key becomes:  URL + (values of all Vary'd headers)
~~~

Correct, common uses:
- **\`Vary: Accept-Encoding\`** — essential when compressing (gzip/brotli) so a compressed body isn't served to a client that can't decode it. Low cardinality (a few encodings) -> safe.
- **\`Vary: Accept\`** for content negotiation (JSON vs HTML), **\`Vary: Accept-Language\`** for localized responses (moderate cardinality).

The pitfalls (this is the meat of the answer):
1. **\`Vary: User-Agent\`** — **disastrous**. There are millions of UA strings, so the cache stores a near-unique variant per browser/version/device -> hit rate collapses (effectively no caching). Avoid; do device adaptation responsively or with a coarse device-type signal, not raw UA.
2. **\`Vary: Cookie\`** — also disastrous + dangerous. Every distinct cookie value (often per-user) becomes its own variant -> no sharing, and if mishandled, risk of serving one user's cached personalized page to another. For personalized content, don't shared-cache at all (use \`private\`/\`no-store\`), don't \`Vary: Cookie\`.
3. **High-cardinality Vary in general** fragments the cache so each variant is rarely reused -> you pay cache storage cost with little hit-rate benefit, and origin load barely drops.
4. **Inconsistent normalization** — if upstreams send the header in varying forms, caches treat them as different variants. Normalize.

~~~
safe:        Vary: Accept-Encoding   (2–3 variants)
risky:       Vary: Accept-Language   (bounded set of locales — ok if small)
DON'T:       Vary: User-Agent        (millions of variants -> cache useless)
DON'T:       Vary: Cookie            (per-user -> no sharing + leak risk)
~~~

The senior rule: **\`Vary\` only on low-cardinality headers that genuinely change the response, and keep the dimension count minimal.** For per-user differences, segment into a few buckets (cache by a coarse \`device\`/\`region\`/\`subscriber\` flag via a normalized header or surrogate key) rather than \`Vary\`-ing on raw user-specific headers.

Why it matters: \`Vary\` is a frequent cause of mysterious low CDN hit rates ("why is everything a MISS?") — usually a \`Vary: Cookie\`/\`User-Agent\` or a stray \`Set-Cookie\`. Production angle: \`Vary: Accept-Encoding\` (with gzip/brotli), localized pages via path-based locales (not \`Vary: Cookie\`), personalized data fetched client-side so the shared HTML doesn't need to vary per user. Follow-up: "How debug low hit rate from Vary?" Inspect response headers for \`Vary\`/\`Set-Cookie\`; high-cardinality Vary or per-request Set-Cookie kills caching. "Alternative to Vary for variants?" Distinct URLs per variant (e.g. \`/en/\`, \`/hi/\`) cache cleanly without Vary.`,
        },
        {
          q: "When would you use ETag vs Last-Modified for cache validation?",
          answer: `Both are **cache validators** used to revalidate a stale cached copy cheaply (return \`304 Not Modified\` if unchanged). **\`Last-Modified\`** is a **timestamp**; **\`ETag\`** is a **content fingerprint/version id**. Prefer **ETag** when you need precision or have content that changes within a second or whose mtime isn't reliable; **Last-Modified** is fine for static files with a meaningful modification time.

~~~
Last-Modified (timestamp):
  resp: Last-Modified: Sat, 07 Jun 2026 08:00:00 GMT
  revalidate: If-Modified-Since: <that date> -> 304 if not changed since

ETag (fingerprint):
  resp: ETag: "v2-abc123"
  revalidate: If-None-Match: "v2-abc123" -> 304 if same version
~~~

When to use which:
~~~
ETag is better when:                        Last-Modified is fine when:
  content can change within 1 second          static files with accurate mtime
    (Last-Modified has 1s resolution -> misses)  (CSS/JS/images on disk)
  mtime is unreliable / not meaningful        you want a simpler, cheaper validator
    (dynamic responses, multi-server)         single-origin static serving
  you need byte-exact precision
  content reverts to an earlier state
~~~

Why ETag is more precise: \`Last-Modified\` has **one-second granularity**, so two changes within the same second look "unmodified" (false 304 -> stale served). It also assumes a trustworthy mtime, which dynamic/generated content or multi-server setups may not have. ETag hashes the actual content, catching **any** change (and detecting reverts). For dynamic HTML/API responses, ETag is the safer validator.

Servers often send **both**; per spec, if a request includes \`If-None-Match\`, the validator **ETag takes precedence** over \`If-Modified-Since\`. Static-file servers (Nginx) generate both automatically for files.

The multi-server pitfall (great follow-up): default ETags on some servers are derived from **inode/size/mtime**, which **differ across machines** for byte-identical files — so a load-balanced fleet returns different ETags for the same asset, breaking 304s (constant 200 re-downloads). Fix: use **content-hash-based ETags** (or disable inode-based ETags) so all nodes agree. For hashed/immutable assets you skip revalidation entirely (\`immutable\`) and don't need either validator.

Why it matters: choosing the right validator (and avoiding the multi-server ETag trap) is the difference between effective 304-based revalidation and silently re-downloading everything. Production angle: content-hash ETags on dynamic article HTML for precise revalidation across the SSR fleet; \`immutable\` on hashed static assets (no validation needed); \`Last-Modified\` acceptable for simple static files. Follow-up: "Strong vs weak ETag?" \`"x"\` strong (byte-identical) vs \`W/"x"\` weak (semantically equal — allows gzip/whitespace differences); weak is common for dynamic content. "When neither?" Immutable hashed assets — revalidation is unnecessary.`,
        },
      ],
      tip: "no-cache = revalidate before using. no-store = never cache at all. Most devs confuse these — knowing it precisely impresses interviewers.",
      rajnishAngle:
        "JS bundles: Cache-Control: public, max-age=31536000, immutable. Article HTML: Cache-Control: public, s-maxage=60, stale-while-revalidate=300.",
    },
    {
      title: "Nginx Proxy Cache Configuration",
      subtopics: [
        "proxy_cache_path & zones",
        "proxy_cache_valid",
        "proxy_cache_bypass",
        "proxy_cache_lock",
        "X-Cache-Status header",
        "Cache purging",
      ],
      questions: [
        {
          q: "Write the Nginx config to cache article pages for 60s but bypass cache for logged-in users.",
          answer: `The pattern: define a cache zone, cache 200 responses for 60s, and use **\`proxy_cache_bypass\`** (don't read cache) + **\`proxy_no_cache\`** (don't store) keyed on the **session cookie** so logged-in users always get fresh, never-shared responses.

~~~nginx
# http{} — define the cache store + key zone
proxy_cache_path /var/cache/nginx/articles
                 levels=1:2 keys_zone=articles:50m
                 max_size=5g inactive=120m use_temp_path=off;

server {
  listen 443 ssl http2;
  server_name nbt.example.com;

  location / {
    proxy_pass http://nextjs;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_cache articles;
    proxy_cache_key "$scheme$host$request_uri";
    proxy_cache_valid 200 301 60s;     # cache article HTML 60s
    proxy_cache_valid 404 10s;         # brief negative cache

    # --- logged-in users: bypass + don't store ---
    proxy_cache_bypass $cookie_session;  # if 'session' cookie present -> fetch fresh
    proxy_no_cache    $cookie_session;   # ...and never store their response

    # resilience + visibility
    proxy_cache_lock on;                                  # anti-stampede
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503;
    add_header X-Cache-Status $upstream_cache_status always;  # HIT/MISS/BYPASS
  }
}
~~~

~~~
anonymous request (no session cookie):
  -> cache lookup -> HIT (60s window) or MISS -> store -> serve   (fast, shared)
logged-in request (session cookie set):
  -> proxy_cache_bypass -> fetch from origin (BYPASS), proxy_no_cache -> not stored
~~~

Why each line:
- **\`proxy_cache_valid 200 60s\`** — the 60s TTL for article HTML.
- **\`proxy_cache_bypass $cookie_session\`** — when the cookie is non-empty the variable is truthy, so Nginx **skips reading** the cache (serves fresh from origin). \`X-Cache-Status\` shows \`BYPASS\`.
- **\`proxy_no_cache $cookie_session\`** — also **don't store** the logged-in response (critical: prevents caching a personalized page and serving it to anonymous users — a privacy/poisoning bug).
- **\`proxy_cache_lock\`** + **\`use_stale updating\`** — only one request regenerates on expiry while others serve stale (stampede protection for hot articles).
- **\`X-Cache-Status\`** — expose HIT/MISS/BYPASS for debugging/monitoring.

Why it matters: it demonstrates the exact mechanism for **mixing cached public pages with uncached personalized ones safely** — the most common real Nginx caching requirement. Production angle: anonymous article reads cached 60s (shielding the SSR pods during spikes), logged-in/personalized requests bypassed and never stored, with cache_lock + stale-on-error for resilience. Follow-up: "Why both bypass AND no_cache?" Bypass alone would fetch fresh but could still *store* the personalized response; no_cache prevents storing it. "How exclude only certain paths?" Put caching in specific \`location\` blocks (e.g. \`/article/\`) and not on \`/api/\` or \`/account/\`.`,
        },
        {
          q: "What is proxy_cache_lock and why is it important for high-traffic sites?",
          answer: `**\`proxy_cache_lock on;\`** ensures that when a cache entry is **missing or expired** and **multiple requests arrive simultaneously**, only **one** request is allowed to go to the origin to **populate the cache** — the others **wait** for that single response (up to \`proxy_cache_lock_timeout\`) and are then served the freshly-cached result. Without it, every concurrent miss independently hits the origin — a **cache stampede / thundering herd**.

~~~
Without proxy_cache_lock (stampede):
  cache expires -> 1000 concurrent requests all MISS
                -> 1000 simultaneous origin requests for the SAME page -> overload

With proxy_cache_lock on:
  cache expires -> 1st request gets the LOCK -> goes to origin, fills cache
                -> other 999 WAIT -> served the cached result (1 origin hit total)
~~~

~~~nginx
proxy_cache_lock on;
proxy_cache_lock_timeout 5s;     # how long others wait before they too go to origin
proxy_cache_lock_age 5s;         # if the filler is too slow, allow another attempt
~~~

Why it's critical at high traffic: popular content (a breaking-news article, the homepage) can receive **thousands of requests per second**. The instant its cache entry expires, *all* in-flight requests miss at once. Without a lock, that's thousands of identical expensive SSR renders hitting the origin in the same moment — which can **overload the app servers/DB**, spike latency, and cascade into errors (and the errors may prevent caching, repeating the storm). The lock **collapses N concurrent origin requests into 1**, protecting the origin precisely when it's most vulnerable.

Complementary protections (mention together):
- **\`proxy_cache_use_stale updating\`** — instead of making others *wait*, serve them the **stale** copy while the one request refreshes (stale-while-revalidate; better UX — no waiting). Often used **with** the lock.
- **TTL jitter** — randomize TTLs so many keys don't expire at the same instant.
- **Background pre-warming** of hot keys before expiry.

~~~
proxy_cache_lock + proxy_cache_use_stale updating
  = one request refreshes, everyone else gets stale instantly (no origin storm, no waiting)
~~~

Why it matters: stampede is a top production failure mode for cached high-traffic sites; \`proxy_cache_lock\` is the Nginx-level request-coalescing defense. Production angle: a viral article expiring during an IPL/breaking-news traffic surge would stampede the SSR pods without the lock; with \`proxy_cache_lock\` + \`use_stale updating\` + jittered TTLs, the origin sees one regeneration request while readers get instant (stale-then-fresh) responses. Follow-up: "Lock vs use_stale — which?" Use both: \`use_stale updating\` serves stale (no wait) while the locked single request refreshes — best UX + origin protection. "App-layer equivalent?" Single-flight/mutex per key (or Next.js ISR, which already serves stale while regenerating once).`,
        },
        {
          q: "How do you implement cache purging in Nginx without the commercial module?",
          answer: `Stock (open-source) Nginx has **no native selective purge** (\`proxy_cache_purge\` is Nginx Plus). Without paying, you have three practical routes: the **third-party \`ngx_cache_purge\` module**, **deleting the cache file by its key hash**, or **avoiding manual purge entirely** via short TTL + versioned URLs.

**1. \`ngx_cache_purge\` (open-source module — compile it in):**
~~~nginx
location ~ /purge(/.*) {
  allow 127.0.0.1; allow 10.0.0.0/8;   # restrict to internal/CMS only!
  deny all;
  proxy_cache_purge articles "$scheme$host$1";  # MUST match proxy_cache_key
}
# CMS on publish -> GET http://nginx-internal/purge/article/breaking-news
~~~
This deletes the matching entry; next request is a MISS and re-fills.

**2. Delete the cache file by hashing the key.** Nginx stores each entry at a path derived from the **MD5 of the cache key**, sharded per \`levels\`. Reproduce the key, hash it, remove the file:
~~~bash
# proxy_cache_key "$scheme$host$request_uri"; levels=1:2
KEY='httpsnbt.example.com/article/breaking-news'
H=$(printf '%s' "$KEY" | md5sum | awk '{print $1}')
# levels=1:2 -> /cache/<last1>/<last3:2>/<hash>
rm -f "/var/cache/nginx/articles/\${H: -1}/\${H: -3:2}/$H"
~~~
Scriptable from a publish webhook. (Brittle: you must reproduce the *exact* key, including any \`Vary\`/key additions.)

**3. Design to avoid purge (preferred where possible):**
- **Versioned/content-hashed URLs** for assets — URL changes on content change, so old entries expire unused. No purge needed (the cleanest invalidation).
- **Short \`proxy_cache_valid\` + \`proxy_cache_use_stale updating\`** so content self-refreshes within seconds — bounded staleness without explicit purge.
- A **cache-key version token** you can bump to invalidate a whole class at once.

~~~
publish event ─▶ webhook ─▶ { ngx_cache_purge GET  OR  rm hashed file }
              ─▶ (in the full stack also: CDN tag purge + revalidateTag in Next)
~~~

The real-world answer: in a layered stack you rarely purge Nginx alone — on publish you coordinate **CDN surrogate-key purge + Next \`revalidateTag\` + Nginx purge** so all shared layers refresh together; and you lean on **short TTL + SWR + versioned URLs** so manual purging is the exception, not the rule. Restrict any purge endpoint to internal IPs/auth (an open purge URL is a cache-busting DoS vector).

Why it matters: shows you know OSS Nginx's purge limitation and the pragmatic workarounds, plus the senior preference for **design-based invalidation** over fragile file deletion. Production angle: breaking-news publish webhook hits an internal-only \`ngx_cache_purge\` endpoint (and CDN tag purge + \`revalidateTag\`), backed by short TTL + SWR so even a missed purge self-heals in seconds. Follow-up: "Wildcard/tag purge in OSS?" Not natively — emulate with a key version bump or full-zone clear (\`rm -rf\` the cache dir + reload, heavy-handed). "Security of the purge endpoint?" Lock to internal IPs/auth — otherwise attackers can force-miss your cache and stampede the origin.`,
        },
      ],
      tip: "proxy_cache_lock prevents cache stampede — only one request goes to origin while others wait for the cached response.",
      rajnishAngle:
        "Your Nginx proxy_cache config for Times Internet SSR pages — proxy_cache_valid 200 60s, bypass on cookie checks.",
    },
    {
      title: "CDN Caching & Invalidation",
      subtopics: [
        "CDN vs origin pull model",
        "Cache-Control vs CDN-specific headers",
        "Surrogate keys / cache tags",
        "Purge API",
        "Stale-while-revalidate at CDN",
        "Cache stampede",
      ],
      questions: [
        {
          q: "How do surrogate keys (cache tags) make CDN invalidation more precise?",
          answer: `**Surrogate keys / cache tags** let you **tag each cached response with one or more labels** (e.g. \`article:123\`, \`section:sports\`, \`author:45\`), then **purge by tag** — invalidating **every cached object carrying that tag across all edges with a single API call**, regardless of their URLs. This solves the core CDN invalidation problem: a piece of content appears on **many** URLs, and enumerating them all to purge is fragile and incomplete.

~~~
origin sets on each response:
  Surrogate-Key: article:123 section:sports homepage   (Fastly)
  Cache-Tag: article:123,section:sports                (Cloudflare/Akamai)

on publish/edit of article 123:
  PURGE by key 'article:123'  -> invalidates the article page,
  the homepage, the sports section page, the "related" sidebars —
  every cached object tagged 'article:123' — in ONE call, all POPs.
~~~

~~~
URL-based purge (fragile):          Tag-based purge (precise):
  purge /article/123                  purge tag 'article:123'
  purge /                       VS      -> hits ALL pages showing it,
  purge /sports                          even ones you didn't enumerate
  purge /related?... (miss one -> stale)  no enumeration, no misses
~~~

Why it's more precise *and* more robust:
1. **Invalidate by data identity, not URL** — you tag by the *entity* (\`article:123\`). One purge refreshes everywhere that entity is rendered, even pages you forgot exist. URL purging requires knowing every URL (and you'll miss some).
2. **Surgical** — purge exactly the affected content, not the whole site/section (which would cold-start the cache and hammer the origin). Compare to a blunt "purge everything," which triggers a stampede.
3. **Composable tags** — tag with multiple keys (\`article:123\`, \`section:sports\`, \`type:news\`) so you can purge at different granularities: one article, a whole section, or all of a type.

This mirrors Next.js **\`revalidateTag\`** — same concept at the framework layer. In the full stack you tag both: \`fetch(url, { next: { tags: ['article:123'] }})\` + \`Surrogate-Key: article:123\` on the CDN, so one publish event purges both Next's cache and the CDN edges by the same identity.

~~~
publish ─▶ revalidateTag('article:123')  (Next cache)
        ─▶ CDN purge surrogate-key 'article:123'  (all edges, all URLs showing it)
        ─▶ seconds-fresh everywhere, origin barely touched
~~~

Why it matters: tag-based purging is THE scalable invalidation strategy for CMS-backed sites where one entity surfaces across dozens of pages — it's precise (no over-purge stampede), complete (no missed URLs), and a single call. Production angle: breaking-news article publish purges CDN by \`article:id\` (refreshing the article + homepage + section + sidebars) plus \`revalidateTag\` in Next — readers see fresh content in seconds without a section-wide cache flush. Follow-up: "Over-purge risk?" Broad tags (\`section:sports\`) purge a lot at once -> origin load; use granular tags for targeted refresh, broad ones only when intended. "Which CDNs support it?" Fastly (Surrogate-Key), Cloudflare (Cache-Tag, Enterprise), Akamai (cache tags) — concept is standard.`,
        },
        {
          q: "What is cache stampede and what are 3 ways to prevent it?",
          answer: `A **cache stampede** (thundering herd / dog-pile) is when a popular cached item **expires** and **many concurrent requests miss simultaneously**, all hitting the origin to regenerate the **same** expensive resource at once — overloading the backend, spiking latency, and potentially cascading into an outage (and the resulting errors may prevent re-caching, repeating the storm).

~~~
t=expiry: 5000 concurrent requests for /article/viral
  -> all MISS at the same instant
  -> 5000 simultaneous origin renders of the SAME page -> origin overload -> 503s
~~~

**Three prevention techniques:**

**1. Stale-while-revalidate (serve stale, refresh once in background).** When the entry expires, keep serving the **stale** copy instantly to all requests while **one** background request revalidates it. No one waits; the origin sees a single request.
~~~
Cache-Control: s-maxage=60, stale-while-revalidate=300   (CDN)
Nginx: proxy_cache_use_stale updating;                    (origin shield)
~~~

**2. Request coalescing / cache lock (single-flight).** Allow only **one** request through to the origin to fill the cache; the rest **wait** for that result. Collapses N concurrent misses into 1 origin fetch.
~~~
Nginx: proxy_cache_lock on;  (CDNs do origin-shield/collapsed-forwarding internally)
App:   a per-key mutex / single-flight around the origin fetch
~~~

**3. TTL jitter + probabilistic early expiration.** Add **randomness** to TTLs so thousands of keys (or thousands of edge copies of one key) don't expire at the **same instant**, and refresh **before** expiry probabilistically (XFetch) so regeneration is spread over time rather than synchronized.
~~~
ttl = base + random(0, jitter)        // de-synchronize expiries
refresh early with probability rising as expiry approaches (XFetch)
~~~

(Honorable mentions: **background pre-warming** of hot keys before expiry; **negative caching** of errors/404s so bad-request floods don't stampede; a **circuit breaker** so a struggling origin sheds load instead of being hammered.)

~~~
best combo:  stale-while-revalidate (no waiting) + cache lock (coalesce) + jitter (spread)
             = origin sees ~1 refresh per key; users always get instant responses
~~~

Why it matters: stampede is the canonical high-traffic cache failure; knowing **SWR + coalescing + jitter** (and that they compose) shows real operational depth. Production angle: a viral/breaking article expiring during a traffic surge — protected by CDN \`stale-while-revalidate\` + Nginx \`proxy_cache_lock\`/\`use_stale\` + jittered TTLs + on-publish pre-warm, so the origin sees one regeneration while millions of readers get instant responses. Follow-up: "SWR vs cache lock difference?" SWR serves users **stale** (no wait) while one refreshes; lock makes users **wait** for the single refresh — SWR is better UX, often combined. "How does ISR relate?" Next.js ISR is framework-level SWR — serves stale while regenerating once in the background.`,
        },
        {
          q: "How does stale-while-revalidate improve perceived performance?",
          answer: `**\`stale-while-revalidate\` (SWR)** is a \`Cache-Control\` directive that says: after a response becomes stale (past its fresh \`max-age\`/\`s-maxage\`), the cache may **serve the stale copy immediately** for an additional window **while it revalidates in the background**. The user gets an **instant** response (no waiting for the origin), and the cache is refreshed for the *next* request — decoupling freshness work from the user's critical path.

~~~
Cache-Control: max-age=60, stale-while-revalidate=300

0–60s   : FRESH    -> serve from cache (fast)
60–360s : STALE-OK -> serve STALE instantly + kick off background revalidation
> 360s  : must revalidate synchronously (or treat as miss)
~~~

~~~
Without SWR (on expiry):
  request ─▶ MISS ─▶ WAIT for origin render ─▶ slow response (user waits)

With SWR (on expiry within window):
  request ─▶ serve STALE now (instant)
          └─(background)─▶ revalidate ─▶ cache fresh for next request
~~~

How it improves *perceived* performance:
1. **No one waits on regeneration** — the costly origin render happens **off the user's critical path**. Users see a (slightly stale, usually fine) response at cache speed instead of origin speed.
2. **Smooths out expiry cliffs** — without SWR, every expiry causes a slow synchronous refetch for whoever hits it; with SWR, responses stay fast continuously.
3. **Prevents stampede** — only **one** background revalidation runs while everyone else is served stale (instant) — so it doubles as origin protection (see [[what-is-cache-stampede-and-what-are-3-ways-to-prevent-it]]).
4. **Better resilience** — combined with \`stale-if-error\`, you can serve stale content when the origin is down, keeping the site up.

The trade-off: users may see content **slightly stale** (up to the SWR window). For most content (article body, lists) that's an excellent trade — seconds of staleness for guaranteed fast responses. For content that must be exactly current (live ticker, prices), use a short/zero window or \`no-store\` and push updates instead.

This is the same model as **Next.js ISR** (serve the static page while regenerating in the background) and React Query's stale-while-revalidate client behavior — the pattern recurs at every layer.

~~~
news article: max-age=60, stale-while-revalidate=300
  -> readers always get instant responses; content is at most ~minutes stale,
     refreshed in the background; origin sees ~1 refresh per window (no stampede)
~~~

Why it matters: SWR is the key technique for "fast AND fresh" — it removes regeneration latency from the user experience while keeping content reasonably current and shielding the origin. Production angle: article/category HTML served with \`s-maxage\` + \`stale-while-revalidate\` at the CDN (and Nginx \`use_stale updating\`), so even at expiry users get edge-speed responses while a single background fetch refreshes — central to handling breaking-news traffic without slow refetches or origin overload. Follow-up: "stale-if-error?" Serve stale when the origin returns errors/is unreachable — availability safety net. "Where is the freshness trade-off unacceptable?" Live/real-time data — there, short TTL/no-store + push (SSE/WebSocket), not SWR.`,
        },
      ],
      tip: "Surrogate keys let you tag cached responses (e.g. 'article:12345') and purge all CDN edges with one API call on publish.",
      rajnishAngle:
        "Breaking news on NBT — on article publish, trigger CDN purge by article ID tag so readers get fresh content within seconds.",
    },
    {
      title: "Next.js Caching — All 4 Layers",
      subtopics: [
        "Request memoization",
        "Data cache (fetch)",
        "Full Route Cache",
        "Router cache (client)",
        "revalidatePath / revalidateTag",
        "cache: 'no-store' vs force-dynamic",
      ],
      questions: [
        {
          q: "What is the difference between the Data Cache and Full Route Cache in Next.js?",
          answer: `Both are **persistent server-side caches**, but they cache **different things at different granularities**. The **Data Cache** caches the **results of individual \`fetch()\` calls** (raw data). The **Full Route Cache** caches the **fully rendered output of a route** (the RSC payload + HTML). Data Cache is the *input* layer; Full Route Cache is the *output* layer.

~~~
Data Cache:        caches  fetch(url) -> JSON     (per data source, reusable across routes)
Full Route Cache:  caches  /article/123 -> rendered RSC payload + HTML  (per route)

render flow:  fetch() ──[Data Cache]──▶ render route ──[Full Route Cache]──▶ HTML
~~~

**Data Cache:**
- Stores \`fetch\` responses across requests **and deployments**, keyed by URL + options.
- Controlled per fetch: \`cache: 'force-cache'\` (default cache), \`'no-store'\` (never), \`next: { revalidate: N }\` (time-based), \`next: { tags: [...] }\` (tag-based).
- Shared: the same cached data can serve **multiple routes**.

**Full Route Cache:**
- At build/revalidation, Next caches the **rendered result** of **statically-renderable** routes, so requests are served without re-rendering React at all.
- Only applies to **static** routes. A route becomes **dynamic** (skips Full Route Cache, renders per request) if it uses \`cookies()\`/\`headers()\`/\`searchParams\`, a \`no-store\` fetch, or \`dynamic = 'force-dynamic'\`.
- Invalidated by \`revalidatePath\`/\`revalidateTag\` or a new deploy.

~~~
relationship:
  Data Cache stale/invalidated  -> route re-renders with fresh data
  Full Route Cache invalidated  -> route output re-rendered (re-runs render, may reuse Data Cache)
  A 'no-store' fetch makes the route dynamic -> NO Full Route Cache
~~~

Why two layers: the Data Cache lets **different routes share** the same fetched data (and dedupe across rebuilds), while the Full Route Cache avoids **re-rendering** entirely for static pages (cheapest possible serve). You can have data cached but a route dynamic (re-render each request but reuse cached fetches), or a fully static route (both layers serve it).

Why it matters: explains "my data updated but the page didn't" (you invalidated one layer, not the other) and how rendering mode (static vs dynamic) interacts with caching. Production angle: article \`fetch\` tagged \`article:id\` (Data Cache), the article route statically rendered (Full Route Cache); on publish \`revalidateTag('article:id')\` invalidates the Data Cache and triggers re-render, refreshing the Full Route Cache. Follow-up: "If a route is force-dynamic, is the Data Cache still used?" Yes — fetches can still be cached even though the route re-renders per request (unless \`no-store\`). "Which do cookies() affect?" Makes the route dynamic -> opts out of the Full Route Cache (renders per request).`,
        },
        {
          q: "How does revalidateTag work and how is it better than revalidatePath?",
          answer: `**\`revalidateTag(tag)\`** invalidates **every cached \`fetch\` tagged with that tag**, across **any route** that used it — then those entries refetch on next access (and dependent routes re-render). You tag fetches when you read them; one \`revalidateTag\` call refreshes all of them. **\`revalidatePath(path)\`** invalidates the cache for a **specific route/path** only.

~~~ts
// tag fetches at read time (the data's identity):
await fetch(url, { next: { tags: ['article', \`article:\${id}\`] } });

// on publish/edit — refresh by DATA IDENTITY, everywhere it appears:
revalidateTag(\`article:\${id}\`);   // article page + homepage feed + section + sidebar

// path-based — only this route:
revalidatePath('/article/breaking');   // one URL, regardless of which fetches it used
~~~

~~~
revalidatePath('/article/123') ─▶ refreshes ONE route
revalidateTag('article:123')   ─▶ refreshes EVERY route whose fetch was tagged 'article:123'
                                  (article page, homepage list, category, related — all at once)
~~~

Why \`revalidateTag\` is usually better (the senior point):
1. **Decouples invalidation from URL structure.** A CMS entity appears on **many** pages. With \`revalidatePath\` you must **enumerate every route** that shows it (fragile — you'll miss some, and routes change). With \`revalidateTag\` you invalidate by the **data's identity** (\`article:123\`); Next refreshes everywhere it's used, even pages you didn't think of.
2. **Surgical at scale.** Tag granularly (\`article:123\` vs broad \`article\`) to refresh exactly what changed without re-rendering the whole site.
3. **Mirrors CDN surrogate keys** — the same "purge by tag" model end-to-end, so one publish event can \`revalidateTag\` + CDN tag-purge with the same identity.

When \`revalidatePath\` is still right: you know the exact route, the data isn't widely shared, or you want to refresh a whole page regardless of which fetches it used (e.g. after a layout/content change scoped to one URL).

~~~
publish ─▶ revalidateTag('article:123')  (Next Data + Full Route caches refresh)
        ─▶ + CDN purge tag 'article:123'  (edges)
        ─▶ fresh everywhere, no URL enumeration
~~~

Why it matters: tag-based invalidation is the scalable pattern for CMS-backed sites where content fans out across pages — precise, complete, and one call. Production angle: every article fetch tagged \`article:\${id}\`; on publish, \`revalidateTag\` refreshes the article + all feeds/lists it appears in (paired with a CDN surrogate-key purge), giving seconds-fresh breaking news without enumerating routes. Follow-up: "Do these clear the client Router Cache?" They invalidate server caches; the client may need a navigation/\`router.refresh()\` to see changes. "Cost of a broad tag like 'article'?" Invalidates *all* articles at once — heavy; use granular \`article:id\` tags for targeted refresh.`,
        },
        {
          q: "When would you use cache: 'no-store' on a fetch vs using force-dynamic on a route?",
          answer: `They opt out of caching at **different scopes**. **\`cache: 'no-store'\`** is **per-fetch** — *this one* data call always hits the origin and is never stored, while the **rest of the route** can still be cached/static. **\`export const dynamic = 'force-dynamic'\`** is **route-level** — the **entire route** renders **per request** (no Full Route Cache), affecting all rendering in that segment.

~~~ts
// PER-FETCH opt-out: only this data is always fresh
const live = await fetch(tickerUrl, { cache: 'no-store' }); // uncached
const article = await fetch(articleUrl, { next: { revalidate: 60 } }); // still cached
// NOTE: a single no-store fetch makes the ROUTE dynamic too (it can't be fully static)

// ROUTE-LEVEL opt-out: everything in this route renders per request
export const dynamic = 'force-dynamic';
~~~

~~~
no-store (per fetch)   : that fetch -> origin always; other fetches/render still cacheable
                         (but using it forces the route to render dynamically)
force-dynamic (route)  : whole route -> rendered per request; nothing statically cached
~~~

When to use **\`no-store\`**: you have a **specific piece of always-fresh data** (a live score, stock price, "currently online" count) mixed into an otherwise cacheable page. You target just that fetch; the rest of the data can still be cached. It's the **granular** tool.

When to use **\`force-dynamic\`**: the **whole route is inherently dynamic** — personalized per user (reads \`cookies()\`/\`headers()\`), or every part depends on request-time data, so there's nothing worth statically caching. It's the **route-wide** declaration of intent (also achieved implicitly by using \`cookies()\`/\`headers()\`).

The important relationship: **a single \`no-store\` fetch already opts the route out of the Full Route Cache** (the route becomes dynamic because part of its data can't be cached). So \`force-dynamic\` is rarely needed *just* to make one fetch fresh — \`no-store\` does that. Use \`force-dynamic\` when you want to **declare the route dynamic explicitly** (clarity), force *all* fetches dynamic (\`fetchCache: 'force-no-store'\` is the per-fetch-all version), or guarantee per-request rendering regardless of fetch settings.

~~~
mostly-static page + one live number  -> no-store on THAT fetch (keep the rest cached)
fully personalized/per-request route  -> force-dynamic (or just use cookies()/headers())
~~~

Why it matters: shows you control caching at the **right granularity** — don't make a whole page dynamic when one fetch needs freshness (you'd lose all the caching benefit unnecessarily). Production angle: an article page (cached/ISR) with a live "trending now" widget fetched \`no-store\`; a logged-in account/dashboard route as \`force-dynamic\`. Follow-up: "Prefer revalidate over no-store?" Yes when seconds of staleness are fine — \`revalidate: N\` keeps caching benefits; \`no-store\` hits origin every time (load). "How force the opposite (static despite dynamic APIs)?" \`dynamic = 'force-static'\` (with care) to statically render and ignore some dynamic signals.`,
        },
      ],
      tip: "revalidateTag is more surgical — invalidate all pages that depend on 'articles' tag at once on publish, instead of specific paths.",
      rajnishAngle:
        "Your Next.js App Router setup on Maharashtra Times — which routes are static, which use ISR, which are force-dynamic.",
    },
    {
      title: "Browser & Service Worker Cache",
      subtopics: [
        "Cache Storage API",
        "SW caching strategies (cache-first, network-first, stale-while-revalidate)",
        "Workbox",
        "Cache versioning",
        "Offline support",
      ],
      questions: [
        {
          q: "What are the 5 common Service Worker caching strategies?",
          answer: `A Service Worker intercepts \`fetch\` events and decides how to respond using the **Cache Storage API**. The five canonical strategies trade **freshness vs speed vs offline-resilience** differently:

~~~
1. Cache First (cache falling back to network)
   check cache -> hit? serve it : fetch + cache + serve
   FAST, offline-friendly. Best for: hashed/static assets that never change.

2. Network First (network falling back to cache)
   try network -> ok? serve + update cache : serve cached fallback
   FRESH, resilient. Best for: article HTML/API where freshness matters but
   you want an offline fallback.

3. Stale-While-Revalidate
   serve cache immediately AND fetch in background to update cache for next time
   FAST + eventually fresh. Best for: avatars, non-critical data, feeds.

4. Cache Only
   serve from cache, never hit network (fails if absent)
   Best for: pre-cached app shell / offline page installed at SW install.

5. Network Only
   always go to network, never cache
   Best for: non-idempotent/real-time requests (POST, analytics, live data).
~~~

~~~
              freshness ◀──────────────────────▶ speed/offline
  Network Only  Network First  SWR  Cache First  Cache Only
~~~

~~~js
// Network-first example for article HTML
self.addEventListener('fetch', (e) => {
  if (isArticle(e.request)) {
    e.respondWith(
      fetch(e.request)
        .then((res) => { caches.open('html').then((c) => c.put(e.request, res.clone())); return res; })
        .catch(() => caches.match(e.request))  // offline fallback
    );
  }
});
~~~

How to choose (the mapping is the point):
- **Static, content-hashed assets** -> **Cache First** (they never change; serve instantly).
- **News article HTML** -> **Network First** (always try for the latest news; fall back to cache offline).
- **Avatars / non-critical / feeds** -> **Stale-While-Revalidate** (instant, refresh in background).
- **App shell / offline page** -> **Cache Only** (pre-cached, guaranteed available offline).
- **Live data / POST / analytics** -> **Network Only** (must be real-time / can't be cached).

In practice you use **Workbox** to declare these per-route rather than hand-writing fetch handlers, and combine them (precache the shell, runtime-cache assets cache-first, HTML network-first).

Why it matters: choosing per resource type is the whole skill — a wrong strategy means stale news (cache-first HTML) or no offline support (network-only everything). Production angle: news article pages **network-first** with a cached fallback (always-fresh news + graceful offline), hashed static assets **cache-first**, an offline page **cache-only**, live/analytics **network-only**. Follow-up: "Why network-first for news, not cache-first?" Freshness is paramount for news; cache-first would risk showing yesterday's article. "How avoid stale SW logic?" Cache versioning + cleanup on activate (next question).`,
        },
        {
          q: "How do you version Service Worker caches and clean up old versions?",
          answer: `**Version your cache names** (include a version string), pre-cache into the new version during **\`install\`**, and **delete old-version caches during \`activate\`**. This guarantees that when you ship new assets, clients get the fresh set and stale caches are purged — avoiding the classic "users stuck on an old SW/asset" bug.

~~~js
const VERSION = 'v3';                       // bump on each deploy
const STATIC = \`static-\${VERSION}\`;
const HTML   = \`html-\${VERSION}\`;

// INSTALL: pre-cache the new version's shell/assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC).then((c) => c.addAll(['/offline.html', '/app.css', '/app.js']))
  );
  self.skipWaiting();                        // activate the new SW immediately
});

// ACTIVATE: delete caches that aren't the current version
self.addEventListener('activate', (e) => {
  const keep = new Set([STATIC, HTML]);
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())       // control open pages now
  );
});
~~~

~~~
deploy v3:
  install   -> open 'static-v3', 'html-v3', precache new assets
  activate  -> delete 'static-v2','html-v2',... (anything not v3)
  skipWaiting + clients.claim -> new SW controls pages without a manual reload
~~~

Key mechanics:
- **\`install\`** — set up the **new** version's caches; \`skipWaiting()\` lets the new SW activate without waiting for all tabs to close (otherwise the old SW lingers until every tab is gone).
- **\`activate\`** — the safe place to **delete old caches** (no requests are using them yet); \`clients.claim()\` makes the new SW take control of already-open pages immediately.
- **Versioned names** — including \`VERSION\` in cache keys means a deploy creates fresh caches and orphans the old ones (which activate then deletes), so there's no unbounded growth or stale mixing.

Gotchas to mention: \`skipWaiting\` + \`clients.claim\` can cause a running page to suddenly get assets from a new version (potential mismatch) — many teams instead **prompt the user to reload** ("New version available") for controlled updates. Also keep the **SW script itself** served with **\`no-cache\`/short TTL** so browsers pick up the new SW promptly (a long-cached \`sw.js\` delays updates). **Workbox** automates precache versioning + cleanup (revision hashes per file) so you don't hand-roll this.

Why it matters: cache versioning/cleanup is what makes SW caching safe to ship — without it users get stuck on stale assets or caches grow forever. Production angle: versioned precache + activate-cleanup (or Workbox) with an in-app "update available -> reload" prompt, and \`sw.js\` served \`no-cache\` so updates roll out reliably. Follow-up: "skipWaiting risk?" Mixing old-page + new-asset versions; safer to prompt-and-reload. "How does Workbox handle this?" Per-file revision hashes -> only changed files re-cached, old precache entries auto-removed on activate.`,
        },
        {
          q: "When would you choose network-first vs cache-first for a news article page?",
          answer: `For a **news article page**, choose **network-first**: always try the network for the **latest** content, and **fall back to the cache only if offline/slow**. News is freshness-critical — an article can be updated/corrected, and showing a stale cached version (cache-first) is unacceptable. **Cache-first** is for assets that **never change** (content-hashed JS/CSS/images), not for mutable news HTML.

~~~
Network First (news HTML):
  try network ─ok─▶ serve fresh + update cache
              └─fail/offline─▶ serve cached copy (graceful degradation)
  => always-fresh when online, still works offline

Cache First (hashed assets):
  check cache ─hit─▶ serve instantly (no network)
              └─miss─▶ fetch + cache
  => fastest, but serves whatever is cached -> WRONG for mutable content
~~~

~~~js
// network-first for article HTML, with offline fallback
async function articleHandler(request) {
  try {
    const fresh = await fetch(request);                 // latest news
    const cache = await caches.open('html-v3');
    cache.put(request, fresh.clone());                  // refresh cache
    return fresh;
  } catch {
    return (await caches.match(request)) || caches.match('/offline.html');
  }
}
~~~

Why network-first for news specifically:
1. **Correctness/freshness** — breaking news updates, corrections, and new developments mean the cached copy can be wrong/outdated; readers expect current content.
2. **Offline resilience without staleness risk online** — the cache is a **fallback**, not the primary source. Online users always get fresh; offline users get the last-seen version (better than an error).
3. **Cache-first would trap users on stale articles** — e.g. show yesterday's headline or an uncorrected version. Unacceptable for a news product.

Refinement: you can add a **timeout** to network-first (network-first-with-timeout) — try the network for, say, 3s, then fall back to cache if it's slow — balancing freshness with not making slow-network users wait. For **non-article** resources on the same site, mix strategies: hashed assets **cache-first**, avatars/feeds **stale-while-revalidate**, the offline page **cache-only**.

~~~
news site SW routing:
  article HTML  -> network-first (+ timeout)   (fresh, offline fallback)
  /_next/static -> cache-first                 (immutable assets)
  avatars/feeds -> stale-while-revalidate       (instant, bg refresh)
  /offline.html -> cache-only                   (guaranteed offline page)
~~~

Why it matters: it shows you map strategy to **content mutability** — the core SW decision — and don't blanket-apply one strategy. Production angle: article pages network-first with a cached fallback so readers always get fresh news but the page still loads (last version + offline notice) on a flaky connection; static assets cache-first. Follow-up: "Why not SWR for articles?" SWR serves stale-first (shows the old article instantly, updates next visit) — acceptable for low-stakes content but risky for breaking news where the *current* request should be fresh; network-first prioritizes the latest now. "Add a network timeout?" Yes — network-first-with-timeout avoids penalizing slow networks while still preferring fresh.`,
        },
      ],
      tip: "News articles: network-first (always fresh). Static assets: cache-first (never change). Offline page: cache-only (pre-cached at SW install).",
      rajnishAngle:
        "NBT article pages should be network-first with a cached fallback — users always get fresh news, graceful offline handling.",
    },
    {
      title: "Cache Invalidation Patterns",
      subtopics: [
        "TTL-based expiry",
        "Event-driven purge",
        "Write-through cache",
        "Cache-aside pattern",
        "Versioned URLs (cache busting)",
      ],
      questions: [
        {
          q: "What are the two hard problems in computer science, and how do you approach cache invalidation in practice?",
          answer: `The joke: *"There are only two hard things in computer science: cache invalidation, naming things, and off-by-one errors."* The point behind it is real — **cache invalidation is genuinely hard** because you're trying to keep a copy consistent with a source of truth that changes independently, across multiple layers, without serving stale data or melting the origin.

Why it's hard: you must decide **when** data is stale, **propagate** that across every cache layer (browser, SW, CDN, Nginx, app, DB cache), handle **concurrency** (a write during a read), avoid **stampedes** on invalidation, and balance **freshness vs performance** — all while content fans out across many cached representations.

How to approach it in practice — pick the pattern per content type:

1. **TTL-based expiry** — let entries auto-expire after a duration. Simple, no coordination, but a fixed staleness window and blunt. Good default for content where seconds/minutes of staleness is fine. Combine with **stale-while-revalidate** so expiry isn't a latency cliff.

2. **Event-driven purge** — on a write/publish, actively invalidate (CDN tag purge + \`revalidateTag\` + Nginx purge). Precise and near-instant freshness; needed for breaking news. More moving parts (webhooks, coordination).

3. **Versioned URLs (cache-busting)** — change the URL when content changes (content hash). The old URL expires unused; **no explicit invalidation needed**. The cleanest pattern — used for JS/CSS/images.

4. **Write-through / write-behind** — update the cache as part of the write (write-through: write cache+DB together; write-behind: write cache, flush to DB async). Keeps cache consistent on writes; adds write-path complexity.

5. **Cache-aside (lazy)** — app checks cache, on miss loads from DB and populates. Simple, common; risk of stampede on popular misses (mitigate with single-flight).

~~~
practical mapping:
  static assets     -> versioned URLs (no invalidation needed)
  article HTML      -> short TTL + SWR + event-driven purge on publish
  app data (DB)     -> cache-aside or write-through, with TTL backstop
  breaking news     -> event-driven tag purge across all layers
~~~

The senior framing: **prefer designs that minimize manual invalidation** (versioned URLs, short TTL + SWR) and use **event-driven tag-based purge** where true freshness is required — and accept **bounded staleness** as a deliberate trade rather than chasing perfect consistency everywhere. "When in doubt, a short TTL + SWR fails safe."

Why it matters: it signals you respect the difficulty and have a **toolbox mapped to content types**, rather than one hammer. Production angle: hashed assets via versioned URLs (zero purge), article HTML via short TTL + SWR + on-publish tag purge across CDN/Nginx/Next, app/DB data via cache-aside with TTL — bounded staleness by design. Follow-up: "Why is naming/off-by-one in the joke?" It's a self-referential off-by-one. "Hardest part of invalidation specifically?" Propagation + concurrency across layers — which is why tag-based purge + short-TTL-SWR backstops are the pragmatic answer.`,
        },
        {
          q: "How does content hashing in webpack/Next.js solve cache invalidation for JS bundles?",
          answer: `Content hashing embeds a **hash of the file's contents** into its filename (e.g. \`main.4f3a9c2b.js\`). When the content changes, the **hash changes, so the URL changes** — which means you can cache the old URL **forever** (\`immutable\`) and updates are picked up automatically because the new build references a **new URL** the browser has never seen (guaranteed cache miss -> fresh download). No manual purge, no stale-asset bugs. This is **cache busting via versioned URLs** — the cleanest form of cache invalidation.

~~~
build 1:  <script src="/static/main.4f3a9c.js">   Cache-Control: max-age=1y, immutable
build 2 (code changed):
          <script src="/static/main.9b2e71.js">   <- NEW url -> guaranteed fresh fetch
          old main.4f3a9c.js stays cached but is simply never requested again
~~~

~~~
content unchanged -> same hash -> same URL -> browser reuses cached copy (instant, no request)
content changed   -> new hash  -> new URL  -> browser must fetch (fresh) — automatic invalidation
~~~

Why this is brilliant (the reasoning):
1. **Long-term caching is now SAFE.** Without hashing, you couldn't cache \`main.js\` for a year — you'd have no way to push an update except waiting for TTL or purging. With hashing, the URL is content-addressed, so "cache forever + immutable" is correct: that exact URL's bytes never change.
2. **No invalidation step.** Deploys don't need to purge anything — the HTML now points at new hashed URLs; old ones age out unused. Eliminates the hardest part (propagation) for assets.
3. **Granular** — only files that **changed** get new hashes, so unchanged chunks (vendor, shared) keep their URLs and stay cached across deploys (great repeat-visit performance).
4. **No stale-asset bugs** — users can never be stuck on an old JS that mismatches the HTML, because the HTML references the exact new hashes.

The remaining piece: the **HTML that references the hashes** can't itself be content-hashed (it's the entry point at a stable URL like \`/article/x\`). So **HTML needs a different strategy** — short TTL + revalidation/event-driven purge — while the **assets it links** are immutable-cached. This split is the standard: *immutable hashed assets, revalidated HTML.*

~~~
HTML (stable URL, mutable)      -> short s-maxage + SWR + purge on publish
hashed JS/CSS/img (URL=content) -> Cache-Control: public, max-age=31536000, immutable
~~~

Next.js does this automatically for \`/_next/static/...\` (chunks + CSS get content hashes), and webpack via \`[contenthash]\` in \`output.filename\`.

Why it matters: it's the elegant solution to asset invalidation and the reason \`immutable\` long-cache is safe — a frequently-asked "how do you cache-bust JS?" question. Production angle: \`/_next/static\` chunks served \`max-age=31536000, immutable\` (content-hashed, so deploys auto-invalidate by new URLs), while article HTML uses short TTL + SWR + on-publish revalidation — the two halves of the caching strategy. Follow-up: "Why can't HTML be content-hashed too?" It's the stable entry URL users/search hit; its URL must persist while content changes -> needs revalidation/purge. "contenthash vs chunkhash vs hash?" \`contenthash\` is per-file content (best for long-term caching/granularity); \`hash\` is per-build (changes everything every build — defeats granular caching).`,
        },
        {
          q: "Compare TTL-based invalidation vs event-driven purge for a CMS-backed news site.",
          answer: `These are the two ends of the freshness spectrum. **TTL-based**: set an expiry; the cache auto-refreshes after the duration — simple, no coordination, but **bounded staleness** (content can be up to TTL old) and refreshes even when nothing changed. **Event-driven purge**: on a CMS publish/edit, actively invalidate the affected entries (CDN tag purge + \`revalidateTag\` + Nginx purge) — **near-instant freshness**, refreshes **only when content changes**, but requires **coordination/infra** (webhooks, purge APIs, multi-layer fan-out).

~~~
                 TTL-based                      Event-driven purge
freshness        stale up to TTL                seconds after publish
complexity       trivial (set a number)         webhooks + purge API + coordination
origin load      refresh on schedule (even if   refresh only on actual change
                 unchanged) -> some waste        (efficient)
failure mode     fails safe (just stale a bit)  purge can fail/miss -> need backstop
best for         content that drifts slowly      breaking news, corrections, edits
~~~

For a **CMS-backed news site**, you **combine both** — that's the real answer:
1. **Event-driven purge for freshness** — on publish/edit, the CMS fires a webhook that triggers **tag-based invalidation** across layers (\`revalidateTag('article:id')\` + CDN surrogate-key purge + Nginx purge), so breaking news and corrections go live in **seconds**, exactly where the content appears (article + homepage + section + sidebars).
2. **Short TTL + stale-while-revalidate as the backstop** — because purges can **fail, be delayed, or miss an edge**, a short base TTL guarantees content self-refreshes within a bounded window regardless. SWR ensures expiry never causes a latency spike. So even if the event pipeline hiccups, staleness is bounded to minutes, not hours.

~~~
publish event ─▶ event-driven purge (CDN tag + revalidateTag + Nginx)  [primary: seconds-fresh]
       meanwhile every entry also has  s-maxage=60 + stale-while-revalidate  [backstop: bounded staleness]
   = fast freshness on publish, AND self-healing if a purge is missed
~~~

Why pure TTL is insufficient for news: a 5-minute TTL means breaking news/corrections lag up to 5 minutes — too slow for a news product. Why pure event-driven is risky: if a webhook or edge purge fails silently, content could be stale **indefinitely** with no safety net. The combination gives **event-driven speed with TTL-driven safety**.

Why it matters: it shows you don't treat it as either/or — you use **event-driven purge as the primary freshness mechanism and short-TTL+SWR as the resilience backstop**, which is exactly how production CMS-backed caching is built. Production angle: CMS publish webhook -> \`revalidateTag\` + CDN tag purge for seconds-fresh breaking news, with all article HTML also carrying \`s-maxage=60, stale-while-revalidate=300\` so a missed purge self-heals fast and the origin is never stampeded. Follow-up: "What if the purge webhook is down?" The short TTL + SWR still bounds staleness (graceful degradation). "How granular should purge tags be?" Per-entity (\`article:id\`) for targeted refresh; section/type tags for broader updates — balance precision vs over-purge.`,
        },
      ],
      tip: "JS bundles use content hash in filename (cache busting) — URL changes = new cache entry, old one expires naturally. HTML needs event-driven purge on publish.",
      rajnishAngle:
        "NBT publish workflow: article saved in CMS → webhook → purge CDN by article tag + revalidateTag in Next.js.",
    },
    {
      title: "Cache Eviction Algorithms (code in JS)",
      subtopics: [
        "FIFO",
        "LRU (Least Recently Used)",
        "LFU (Least Frequently Used)",
        "TTL (time-based expiry)",
        "When to use each",
      ],
      questions: [
        {
          q: "What are the common cache eviction policies (FIFO, LRU, LFU, TTL) and when do you use each?",
          answer: `A cache has **finite size**, so when it's full you must **evict** something to make room. The **eviction policy** decides *what* to remove — and the choice dramatically affects hit rate. The four classics:

~~~
FIFO (First In, First Out)
  evict the OLDEST inserted item (regardless of usage)
  simple; ignores access patterns -> can evict a hot item just because it's old

LRU (Least Recently Used)
  evict the item not accessed for the longest time
  assumes "recently used = likely used again" (temporal locality) — great default

LFU (Least Frequently Used)
  evict the item with the FEWEST accesses (lowest hit count)
  keeps popular items; but a once-hot item can get "stuck" (needs aging/decay)

TTL (Time To Live)
  each item expires after a fixed duration; evict on expiry (not on size)
  guarantees freshness — used for data that goes stale (API responses, sessions)
~~~

~~~
                 evicts based on        best for
FIFO             insertion order         simple/streaming, order matters, low overhead
LRU              recency of access       general caching (browser, CDN, app) — temporal locality
LFU              access frequency        skewed popularity (a few items dominate traffic)
TTL              age/expiry              data that becomes STALE (freshness over hit rate)
~~~

When to use each (the reasoning):
- **LRU** — the **default** for most caches (HTTP/browser cache, Next.js route cache, image caches, LRU memoization). It exploits **temporal locality**: things used recently tend to be used again. O(1) with a HashMap + doubly linked list.
- **LFU** — when **popularity is skewed and stable** (a small set of items gets most of the traffic — e.g. the top news stories). It keeps the genuinely popular items even if not *recently* touched. Downside: a formerly-popular item can hog the cache forever, so production LFU uses **aging/decay** (LFU-with-decay, or hybrids like **LFRU**, **W-TinyLFU** used by Caffeine).
- **TTL** — when **freshness matters more than hit rate**: API response caches, sessions, rate-limit counters, DNS — you *want* entries to expire so you don't serve stale data. Often **combined** with LRU/LFU (size eviction + time eviction together).
- **FIFO** — simplest/lowest overhead; fine when access order ≈ usefulness (queues, streaming buffers), but generally worse hit rate than LRU because it ignores access patterns.

Real systems **combine** them: e.g. Redis offers \`allkeys-lru\`, \`allkeys-lfu\`, \`volatile-ttl\`, etc.; a CDN uses LRU-ish eviction **plus** TTL freshness; an app cache might be "LRU with a max size **and** a TTL per entry."

~~~
production reality:  LRU/LFU (size eviction)  +  TTL (freshness)  -> both at once
   e.g. "keep at most 1000 entries (LRU) and expire each after 60s (TTL)"
~~~

Why it matters: eviction policy is a core systems/caching concept and a common interview topic (often paired with "now code LRU"); knowing **what each evicts on, their trade-offs, and that real caches combine size + TTL** shows depth. Production angle: an in-memory app cache for the news site uses **LRU + per-entry TTL** (recency eviction for size, TTL for freshness); the CDN/browser layers are LRU-with-TTL; top-stories caching benefits from LFU/W-TinyLFU since popularity is heavily skewed. Follow-up: "Why is LRU the usual default?" Temporal locality + O(1) implementation. "LFU's flaw?" Stale popularity — fixed with decay/aging (W-TinyLFU). "Combine policies?" Yes — size-based (LRU/LFU) + time-based (TTL) together.`,
        },
        {
          q: "Implement an LRU Cache in JavaScript (O(1) get and put).",
          answer: `**LRU (Least Recently Used)** evicts the item that hasn't been accessed for the longest time. The optimal design gives **O(1) get and put** by combining a **HashMap** (key -> node, O(1) lookup) with a **doubly linked list** ordered by recency (most-recent at head, least-recent at tail, O(1) move/evict).

~~~js
class LRUCache {
  constructor(capacity) {
    this.cap = capacity;
    this.map = new Map();             // key -> node
    this.head = {}; this.tail = {};   // dummy boundary nodes
    this.head.next = this.tail; this.tail.prev = this.head;
  }
  _remove(node) { node.prev.next = node.next; node.next.prev = node.prev; }
  _addFront(node) {                   // insert right after head (most recent)
    node.next = this.head.next; node.prev = this.head;
    this.head.next.prev = node; this.head.next = node;
  }
  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    this._remove(node); this._addFront(node);  // touch -> mark most-recently-used
    return node.val;
  }
  put(key, val) {
    if (this.map.has(key)) this._remove(this.map.get(key));
    const node = { key, val };
    this._addFront(node); this.map.set(key, node);
    if (this.map.size > this.cap) {            // over capacity -> evict LRU
      const lru = this.tail.prev;              // the node before tail = least recent
      this._remove(lru); this.map.delete(lru.key);
    }
  }
}

const c = new LRUCache(2);
c.put(1, 1); c.put(2, 2); c.get(1);   // 1 (now 1 is most-recent)
c.put(3, 3);                          // capacity exceeded -> evict 2 (least recent)
c.get(2);                             // -1 (evicted)
~~~

~~~
HashMap: key -> node (O(1) find)
DLL:  head <-> [most recent] <-> ... <-> [least recent] <-> tail
  get/put: move/insert node at head (O(1));  evict: remove node before tail (O(1))
~~~

Why this structure: you need **two** O(1) operations — **lookup by key** (HashMap) and **reorder-by-recency / evict-oldest** (doubly linked list lets you unlink/move *any* node in O(1) given its pointer, and the tail gives instant access to the LRU). A singly linked list can't remove in O(1) (no \`prev\`); an array reorders in O(n). Dummy head/tail nodes remove null-edge bugs.

**JS shortcut (mention it):** JavaScript's **\`Map\` preserves insertion order**, so you can write LRU with just a Map — on \`get\`, delete and re-set the key (moves it to "newest"); evict the oldest via \`map.keys().next().value\`:
~~~js
class LRU {
  constructor(cap) { this.cap = cap; this.map = new Map(); }
  get(key) {
    if (!this.map.has(key)) return -1;
    const v = this.map.get(key);
    this.map.delete(key); this.map.set(key, v);   // re-insert -> becomes newest
    return v;
  }
  put(key, v) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, v);
    if (this.map.size > this.cap) this.map.delete(this.map.keys().next().value); // evict oldest
  }
}
~~~
Cleaner to write under interview pressure — but be ready to explain the **HashMap + DLL** version, since interviewers usually want to see you understand the data structures (and \`Map\`-order tricks aren't available in every language).

Complexity: **O(1) get and put, O(capacity) space.** Production tie-in: LRU is exactly how browser caches, Next.js in-memory route caches, and image caches decide what to evict. Follow-up: "Why a DLL not a singly linked list?" Need O(1) removal of an arbitrary node -> requires \`prev\`. "Map-order version?" Works in JS; explain the explicit version too. "Add TTL?" Store an \`expiresAt\` per node and treat expired entries as misses (see the TTL question).`,
        },
        {
          q: "Implement an LFU Cache in JavaScript and a TTL/FIFO cache.",
          answer: `**LFU (Least Frequently Used)** evicts the item with the **lowest access count** (ties broken by least-recently-used). The O(1) design keeps, per frequency, a **bucket (ordered set/list) of keys**, plus a pointer to the **minimum frequency** — so you can find and evict the least-frequent-least-recent item in O(1).

~~~js
class LFUCache {
  constructor(capacity) {
    this.cap = capacity;
    this.keyToVal = new Map();           // key -> value
    this.keyToFreq = new Map();          // key -> frequency count
    this.freqToKeys = new Map();         // freq -> Set of keys (insertion-ordered = LRU within freq)
    this.minFreq = 0;
  }
  _bump(key) {                           // increase a key's frequency
    const f = this.keyToFreq.get(key);
    this.keyToFreq.set(key, f + 1);
    this.freqToKeys.get(f).delete(key);
    if (this.freqToKeys.get(f).size === 0) {
      this.freqToKeys.delete(f);
      if (this.minFreq === f) this.minFreq++;     // min bucket emptied -> advance
    }
    if (!this.freqToKeys.has(f + 1)) this.freqToKeys.set(f + 1, new Set());
    this.freqToKeys.get(f + 1).add(key);
  }
  get(key) {
    if (!this.keyToVal.has(key)) return -1;
    this._bump(key);
    return this.keyToVal.get(key);
  }
  put(key, val) {
    if (this.cap === 0) return;
    if (this.keyToVal.has(key)) { this.keyToVal.set(key, val); this._bump(key); return; }
    if (this.keyToVal.size >= this.cap) {         // evict LFU (and LRU within it)
      const lfuSet = this.freqToKeys.get(this.minFreq);
      const evict = lfuSet.values().next().value; // oldest key in the min-freq bucket
      lfuSet.delete(evict); this.keyToVal.delete(evict); this.keyToFreq.delete(evict);
    }
    this.keyToVal.set(key, val); this.keyToFreq.set(key, 1);
    if (!this.freqToKeys.has(1)) this.freqToKeys.set(1, new Set());
    this.freqToKeys.get(1).add(key);
    this.minFreq = 1;                              // new item -> min freq is 1
  }
}
~~~

~~~
LFU buckets by frequency; minFreq pointer finds the victim in O(1):
  freq 1: { D, E }   <- evict from here (least frequent); D is oldest -> LRU tiebreak
  freq 3: { A }
  freq 5: { B, C }
~~~

**FIFO** — evict the **oldest inserted** (ignore access). JS \`Map\` insertion order makes it trivial:
~~~js
class FIFOCache {
  constructor(cap) { this.cap = cap; this.map = new Map(); }
  get(key) { return this.map.has(key) ? this.map.get(key) : -1; } // get does NOT reorder
  put(key, val) {
    if (!this.map.has(key) && this.map.size >= this.cap) {
      this.map.delete(this.map.keys().next().value);   // evict first-inserted
    }
    this.map.set(key, val);
  }
}
~~~

**TTL** — each entry expires after a duration; expired entries are treated as misses (lazy eviction on read, optionally a timer for active eviction):
~~~js
class TTLCache {
  constructor(ttlMs) { this.ttl = ttlMs; this.map = new Map(); } // key -> {val, expiresAt}
  get(key) {
    const e = this.map.get(key);
    if (!e) return -1;
    if (Date.now() > e.expiresAt) { this.map.delete(key); return -1; } // expired -> miss
    return e.val;
  }
  set(key, val, ttl = this.ttl) {
    this.map.set(key, { val, expiresAt: Date.now() + ttl });
    // optional active eviction: setTimeout(() => this.map.delete(key), ttl)
  }
}
~~~

Key points: **LFU** is the hardest — the trick is **freq -> ordered-set buckets + a minFreq pointer** for O(1) eviction, with **insertion-order Sets giving LRU tiebreaking** within a frequency. **FIFO/TTL** are simple with \`Map\`. Production caches **combine** size + TTL (e.g. LRU/LFU eviction **and** per-entry \`expiresAt\`).

Complexity: LFU **O(1)** get/put; FIFO **O(1)**; TTL **O(1)** with lazy eviction. Production tie-in: top-stories caching suits LFU/W-TinyLFU (skewed popularity); API/session caches use TTL; combine LRU+TTL for an app cache that's both bounded and fresh. Follow-up: "LFU's real-world flaw?" Stale popularity — add decay/aging (W-TinyLFU). "Active vs lazy TTL eviction?" Lazy (on read) is cheap but lets dead entries linger; a timer/sweeper reclaims memory proactively. "Tiebreak in LFU?" Least-recently-used within the lowest-frequency bucket (insertion-ordered Set).`,
        },
      ],
      tip: "LRU = HashMap + doubly linked list for O(1). In JS, Map preserves insertion order — handy shortcut, but know the explicit version too.",
      rajnishAngle:
        "LRU/LFU/TTL map to real caches you manage: browser/CDN eviction (LRU), top-stories (LFU), API/session caches (TTL).",
    },
  ],
};
