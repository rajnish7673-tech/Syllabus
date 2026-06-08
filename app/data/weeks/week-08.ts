import type { Week } from "../types";

export const week08: Week = {
  week: 13,
  theme: "Nginx Caching & Server Layer",
  color: "#14B8A6",
  topics: [
    {
      title: "Nginx Fundamentals",
      subtopics: ["nginx.conf structure", "server/location blocks", "proxy_pass", "upstream"],
      questions: [
        {
          q: "What is the difference between a server block and a location block in Nginx?",
          answer: `A **server block** defines a **virtual server** — it matches an incoming request to a site based on **listen port + \`server_name\`** (the Host header). A **location block** lives *inside* a server block and matches the **URI path** of the request, deciding how that specific path is handled (proxy, serve files, redirect, apply caching, etc.).

~~~nginx
http {
  server {                          # virtual host: which SITE
    listen 443 ssl;
    server_name nbt.example.com;

    location / {                    # which PATH within the site
      proxy_pass http://nextjs_upstream;
    }
    location /static/ {             # different handling per path
      root /var/www;
      expires 1y;
      add_header Cache-Control "public, immutable";
    }
    location = /health { return 200; }   # exact match
  }

  server {                          # a SECOND site on the same Nginx
    server_name mt.example.com;
    location / { proxy_pass http://mt_upstream; }
  }
}
~~~

~~~
request: GET https://nbt.example.com/static/app.js
  1) match SERVER block by listen + server_name (Host: nbt.example.com)
  2) within it, match LOCATION block by URI (/static/) -> serve from disk
~~~

Location matching precedence (a common deep follow-up):
~~~
1. =        exact match            (highest priority)
2. ^~       prefix, stop searching regex
3. ~ / ~*   regex (case-sensitive / insensitive), first match wins (order matters)
4. (none)   longest prefix match   (lowest)
~~~

Why the distinction matters: server blocks = **routing to the right site/host**; location blocks = **routing to the right handler within that site**. You can have many server blocks (multi-tenant) and many locations per server (per-path behavior — caching for HTML, immutable for assets, proxy for API).

Production angle: one Nginx fronting multiple portals (server block per \`server_name\`), each with locations: \`/\` -> proxy to Next.js SSR upstream, \`/_next/static/\` -> immutable long-cache, \`/api/\` -> proxy to backend, \`/health\` -> exact-match health check. Follow-up: "What's the default_server?" The server block that handles requests not matching any \`server_name\`. "Can location blocks nest?" Yes (limited) — nested locations for finer path handling.`,
        },
        {
          q: "How do you configure Nginx as a reverse proxy for a Next.js app?",
          answer: `A reverse proxy means Nginx accepts client requests and forwards them to the Next.js Node server (\`next start\`, typically on \`localhost:3000\`), then returns the response — while adding TLS, caching, compression, and the right forwarded headers. The essentials: \`upstream\`, \`proxy_pass\`, forwarded headers, and special handling for Next's static assets.

~~~nginx
upstream nextjs {
  server 127.0.0.1:3000;            # one or more Next.js instances
  keepalive 64;                     # reuse connections to the app
}

server {
  listen 443 ssl http2;
  server_name nbt.example.com;
  # ssl_certificate / ssl_certificate_key ...

  # immutable static assets — cache hard, bypass the app
  location /_next/static/ {
    proxy_pass http://nextjs;
    proxy_cache_valid 200 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  # everything else -> Next.js SSR
  location / {
    proxy_pass http://nextjs;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;   # so Next knows it's https
    proxy_set_header Connection "";                # enable upstream keepalive
  }
}
~~~

~~~
browser ─TLS─▶ Nginx ─(keepalive, forwarded headers)─▶ Next.js :3000 ─▶ response
        ◀───── (cache, gzip/brotli, add headers) ─────┘
~~~

Why each piece matters:
- **\`upstream\` + \`keepalive\`** — connection pooling to Node reduces per-request TCP/handshake overhead (lower TTFB). Requires \`proxy_http_version 1.1\` + \`Connection ""\`.
- **Forwarded headers** — \`X-Forwarded-For\`/\`-Proto\`/\`Host\` so the app sees the real client IP and scheme (Next/middleware/auth rely on these; without \`X-Forwarded-Proto\` it may think requests are http and redirect-loop).
- **TLS termination** at Nginx (offload from Node), \`http2\` for multiplexing.
- **Static assets** (\`/_next/static/\`) cached hard / served efficiently so they don't burden the Node app.

Add-ons usually configured here: \`gzip\`/brotli, \`proxy_cache\` for SSR HTML, rate limiting, security headers, and \`proxy_read_timeout\` tuned for streaming SSR. Production angle: this is the Nginx -> Next.js SSR topology for the portals — TLS + keepalive + forwarded headers + immutable static caching + proxy_cache for HTML. Follow-up: "Why keepalive to upstream?" Avoids re-establishing TCP to Node per request — meaningful at high RPS. "Streaming/RSC?" Ensure buffering/timeouts don't break chunked streaming (\`proxy_buffering\` considerations) for App Router streaming responses.`,
        },
        {
          q: "What is upstream in Nginx and why is it useful?",
          answer: `An **\`upstream\`** block defines a **named group of backend servers** that Nginx can proxy to, with **load balancing**, **health checks/failover**, and **connection pooling (keepalive)**. Instead of hardcoding one backend in \`proxy_pass\`, you reference the upstream name — enabling scale and resilience.

~~~nginx
upstream nextjs_pool {
  least_conn;                       # load-balancing method
  server 10.0.0.1:3000 weight=3;    # more capacity -> more weight
  server 10.0.0.2:3000;
  server 10.0.0.3:3000 backup;      # only used if others are down
  server 10.0.0.4:3000 max_fails=3 fail_timeout=30s;  # passive health check
  keepalive 64;                     # pooled connections to backends
}

server {
  location / { proxy_pass http://nextjs_pool; }  # reference by name
}
~~~

~~~
                 ┌─▶ app server 1
client ─▶ Nginx ─┼─▶ app server 2     (distributes load, removes dead nodes)
   (upstream pool)└─▶ app server 3
                 └─▶ backup (only if all primaries down)
~~~

Why it's useful (the value):
1. **Load balancing** across multiple Next.js/Node instances — handle more traffic than one process can. Methods: \`round_robin\` (default), \`least_conn\` (fewest active connections — good for uneven request durations like SSR), \`ip_hash\` (sticky by client IP), or hash-based.
2. **High availability / failover** — \`max_fails\`/\`fail_timeout\` mark a node unhealthy and stop sending it traffic (passive health checks); \`backup\` servers take over; the pool degrades gracefully instead of erroring.
3. **Connection pooling** — \`keepalive\` reuses TCP connections to backends, cutting handshake overhead and TTFB at high RPS.
4. **Scaling & deploys** — add/remove nodes, do **rolling deploys** (drain one node, update, rejoin) without downtime; weights let you canary or account for heterogeneous capacity.

Why it matters: it's how a single Nginx fronts a horizontally-scaled, fault-tolerant app tier — essential for a high-traffic site that must survive node failures and spikes. Production angle: Nginx \`upstream\` with \`least_conn\` over several autoscaled Next.js SSR pods, passive health checks for failover, keepalive for low TTFB, weights for canary/rolling deploys. Follow-up: "least_conn vs round_robin for SSR?" SSR request times vary, so \`least_conn\` balances better than blind round-robin. "Sticky sessions?" \`ip_hash\` or a cookie-based method — but stateless SSR pods usually don't need stickiness; prefer stateless for easy scaling.`,
        },
        {
          q: "What is the difference between a forward proxy, a reverse proxy, and a load balancer?",
          answer: `All three sit "in the middle" of network traffic, but they serve **different sides** and **purposes**. The key distinction: a **forward proxy** acts on behalf of **clients** (hides who's making the request); a **reverse proxy** acts on behalf of **servers** (hides the backend); a **load balancer** is a *specific function* (distributing traffic across servers), usually implemented **as part of a reverse proxy**.

~~~
FORWARD PROXY (client-side):
  [clients] ─▶ [forward proxy] ─▶ internet ─▶ [any server]
   proxy represents the CLIENTS; the destination server doesn't know the real client

REVERSE PROXY (server-side):
  [clients] ─▶ internet ─▶ [reverse proxy] ─▶ [your backend servers]
   proxy represents the SERVERS; the client doesn't know which backend served it

LOAD BALANCER (a function of the reverse proxy):
                              ┌─▶ server 1
  [clients] ─▶ [load balancer]┼─▶ server 2   distributes requests across a pool
                              └─▶ server 3
~~~

**Forward proxy** — sits in front of **clients**, forwarding their outbound requests to the internet. The destination server sees the proxy's IP, not the client's. Used for: corporate egress control / content filtering, caching outbound requests, **anonymizing** clients (VPN-like), bypassing geo-restrictions. It's about **client-side** concerns. Example: a company proxy that all employee browsers route through.

**Reverse proxy** — sits in front of **your backend servers**, receiving client requests and forwarding them to the appropriate backend, then returning the response. The client only ever talks to the proxy; it doesn't know how many backends exist or which one served it. **Nginx as a reverse proxy** is the classic case. Used for: **TLS termination, caching, compression, request routing, security/WAF, rate limiting, hiding/protecting the backend topology, load balancing.** It's about **server-side** concerns.

**Load balancer** — its job is specifically to **distribute incoming requests across multiple backend servers** for **scalability** (handle more load than one server) and **high availability** (route around failed nodes). It's not a separate "place" so much as a **capability** — Nginx's \`upstream\` block makes the reverse proxy *also* a load balancer. Dedicated LBs exist too (AWS ELB/ALB, HAProxy, F5) operating at **L4 (transport/TCP)** or **L7 (application/HTTP)**.

~~~
                 represents      hides           primary purpose
forward proxy    the CLIENTS      the client       egress control, filtering, anonymity
reverse proxy    the SERVERS      the backend      TLS, cache, routing, security, LB
load balancer    the SERVERS      backend topology distribute load + HA (often part of rev proxy)
~~~

The relationships to state clearly (this is what interviewers check):
1. **Forward = client side, reverse = server side** — the single sentence that captures the core difference ("who does the proxy represent?").
2. **A load balancer is usually a reverse proxy** — load balancing is one of the functions a reverse proxy performs (via \`upstream\`). All load balancers are reverse proxies in spirit; not all reverse proxies do load balancing.
3. **L4 vs L7 load balancing** — L4 balances on IP/port (fast, protocol-agnostic, no inspection); L7 balances on HTTP content (path/host/cookie — smarter routing, can do caching/SSL/header rules). Nginx is an **L7** reverse proxy + LB.

~~~js
// Nginx config: reverse proxy + load balancer in one
upstream app { least_conn; server 10.0.0.1:3000; server 10.0.0.2:3000; }  // load balancing
server {
  listen 443 ssl;                 // TLS termination (reverse-proxy duty)
  location / { proxy_pass http://app; }  // reverse proxy to the backend pool
}
~~~

Why it matters: this is a frequently-asked fundamentals question; the senior answer nails **client-side vs server-side (who the proxy represents)** and that **load balancing is a reverse-proxy function**, plus **L4 vs L7**. Production angle: Nginx fronting the news app is a **reverse proxy** doing TLS termination, caching, compression, routing, and **load balancing** (\`upstream\`/\`least_conn\`) across autoscaled Next.js pods — while a **forward proxy** would be an internal-network/egress concern, not part of serving the site. Follow-up: "Is Nginx a forward or reverse proxy?" Both are possible, but for serving your app it's a **reverse** proxy. "Where does CDN fit?" A CDN is a globally-distributed reverse proxy + cache (and can load-balance) in front of your origin. "L4 vs L7?" L4 = fast IP/port routing (no inspection); L7 = HTTP-aware routing (path/host/cookie) with caching/SSL — Nginx is L7.`,
        },
      ],
      tip: "Draw the request flow: browser → Nginx → Node/Next.js → response. Walk through it in the interview.",
      rajnishAngle:
        "Your Times Internet Nginx setup proxying to Next.js SSR servers — explain the architecture.",
    },
    {
      title: "Nginx Caching Deep Dive",
      subtopics: [
        "proxy_cache_path",
        "proxy_cache_valid",
        "Cache-Control headers",
        "cache BYPASS vs HIT vs MISS",
        "Stale-while-revalidate",
      ],
      questions: [
        {
          q: "How do you configure proxy caching in Nginx?",
          answer: `Nginx proxy caching stores upstream (e.g. Next.js SSR) responses on disk and serves subsequent matching requests from cache — shielding the origin and cutting TTFB. The core directives: **\`proxy_cache_path\`** (define the cache store/zone), **\`proxy_cache\`** (enable it in a location), **\`proxy_cache_key\`** (what identifies a cache entry), and **\`proxy_cache_valid\`** (how long to cache by status).

~~~nginx
# define the on-disk cache + shared-memory key zone (in http{})
proxy_cache_path /var/cache/nginx levels=1:2
                 keys_zone=app_cache:100m   # 100MB of KEYS in shared memory
                 max_size=10g               # 10GB on-disk cap
                 inactive=60m               # evict if unused for 60m
                 use_temp_path=off;

server {
  location / {
    proxy_pass http://nextjs;
    proxy_cache app_cache;
    proxy_cache_key "$scheme$host$request_uri";     # what makes an entry unique
    proxy_cache_valid 200 301 60s;                   # cache 200/301 for 60s
    proxy_cache_valid 404 10s;                        # negative caching
    proxy_cache_lock on;                              # stampede protection
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503;
    add_header X-Cache-Status $upstream_cache_status; # HIT/MISS/BYPASS visibility

    # don't cache logged-in users
    proxy_cache_bypass $cookie_session;   # skip cache (still updates it)
    proxy_no_cache    $cookie_session;    # don't store their responses
  }
}
~~~

~~~
request ─▶ key = scheme+host+uri ─▶ in cache & fresh? ─yes─▶ HIT (serve from disk)
                                                     └─no──▶ MISS -> fetch upstream -> store -> serve
~~~

Key pieces explained:
- **\`proxy_cache_path\`** — \`keys_zone\` holds keys in RAM (fast lookup); \`max_size\`/\`inactive\` bound disk and evict cold entries; \`levels\` shards the dir tree.
- **\`proxy_cache_key\`** — controls cache granularity (add \`$cookie_lang\`/\`$http_accept_encoding\` if responses vary; keep cardinality low or hit rate drops).
- **\`proxy_cache_valid\`** — per-status TTLs (cache 200s short, also cache 404s briefly to absorb bad-URL floods). Origin \`Cache-Control\`/\`Expires\` can override these (\`proxy_ignore_headers\` to force Nginx's TTLs).
- **\`proxy_cache_lock\`** + **\`proxy_cache_use_stale\`** — prevent cache stampede and serve stale on origin errors/while updating (Nginx's stale-while-revalidate).
- **\`X-Cache-Status\`** — expose HIT/MISS/BYPASS for debugging.

Why it matters: this is the layer that lets a few Node pods serve millions of reads. Production angle: \`proxy_cache_valid 200 60s\` for SSR article HTML, \`proxy_cache_lock\` for spikes, bypass on session cookie, \`X-Cache-Status\` header monitored. Follow-up: "How do you vary cache by language/encoding?" Add the relevant variable to \`proxy_cache_key\` (or honor \`Vary\`). "Cache key cardinality risk?" Too many key dimensions = low hit rate — keep keys minimal.`,
        },
        {
          q: "What does proxy_cache_bypass do and when would you use it?",
          answer: `**\`proxy_cache_bypass\`** tells Nginx to **skip reading from the cache** (go to the origin) when its condition is truthy — but it **still stores** the fresh response in cache (so the cache stays warm/updated). It's paired with **\`proxy_no_cache\`**, which prevents *storing* the response. Together they handle "this particular request must be fresh / must not be cached."

~~~nginx
location / {
  proxy_cache app_cache;
  proxy_pass http://nextjs;

  # bypass the cache (fetch fresh) for these conditions:
  proxy_cache_bypass $cookie_session $http_cache_control $arg_nocache;
  # do NOT store the response for logged-in users:
  proxy_no_cache     $cookie_session;
}
~~~

~~~
proxy_cache_bypass truthy ─▶ ignore cached copy, fetch from origin (still may STORE)
proxy_no_cache     truthy ─▶ do NOT store the origin response in cache
both for logged-in users  ─▶ always fresh AND never cached (personalized)
~~~

When to use **\`proxy_cache_bypass\`**:
1. **Logged-in / personalized requests** — a session cookie present means the page is user-specific; bypass so they don't get someone else's cached page (and add \`proxy_no_cache\` so their personalized response isn't stored for others).
2. **Force-refresh / cache-busting** — honor a \`Cache-Control: no-cache\` request header or a \`?nocache=1\` query param to fetch fresh (handy for editors previewing, or a purge-ish refresh).
3. **Preview/draft modes** — editors viewing unpublished content must bypass the public cache.
4. **A/B or debug** — a debug cookie/header to see origin output.

The crucial distinction (a classic interview point):
- **\`proxy_cache_bypass\`** = don't **read** from cache (but may still **write**).
- **\`proxy_no_cache\`** = don't **write** to cache.
- Use **both** for truly personalized responses; use just **bypass** when you want a fresh fetch that *also refreshes* the shared cache.

Why it matters: it's how you safely mix cached public pages and uncached personalized ones on the same site without serving a logged-in user's page to anonymous visitors (a serious cache-poisoning/privacy bug). Production angle: bypass + no_cache on the session cookie so anonymous article reads are cached (fast, shared) while logged-in/personalized requests always hit the origin and are never stored. Follow-up: "Difference from \`proxy_cache_valid 0\`?" That sets TTL per status globally; bypass/no_cache are *conditional* per request. "Risk if you forget no_cache for logged-in users?" A personalized response could be cached and served to others — leak + poisoning.`,
        },
        {
          q: "How do you invalidate/purge Nginx cache for a specific URL?",
          answer: `Open-source Nginx has **no built-in selective purge** (that's a Nginx Plus / commercial feature, \`proxy_cache_purge\`). On stock Nginx you achieve targeted invalidation a few ways — most commonly the **\`ngx_cache_purge\` third-party module**, **deleting the cache file by its key hash**, or **design patterns that avoid manual purge** (short TTL + versioned URLs).

**Option 1 — \`ngx_cache_purge\` module (most common OSS approach):**
~~~nginx
location ~ /purge(/.*) {
  allow 10.0.0.0/8;   # restrict to internal/CMS IPs
  deny all;
  proxy_cache_purge app_cache "$scheme$host$1";  # purge by the SAME key
}
# CMS on publish: GET http://nginx/purge/article/breaking-news
~~~

**Option 2 — delete the cache file directly.** The cache key is **MD5-hashed** to a path under \`proxy_cache_path\` (\`levels=1:2\`). Compute the hash and \`rm\` it:
~~~bash
# key = "httpsnbt.example.com/article/x"
KEY="httpsnbt.example.com/article/x"
HASH=$(printf '%s' "$KEY" | md5sum | cut -d' ' -f1)
rm "/var/cache/nginx/\${HASH: -1}/\${HASH: -3:2}/$HASH"   # levels=1:2 path
~~~

**Option 3 — design so you rarely purge:**
- **Versioned/hashed URLs** for assets (URL changes on content change -> old entry just expires; no purge needed) — the cleanest invalidation.
- **Short TTL + \`stale-while-revalidate\`** so content self-refreshes within seconds (acceptable for most HTML).
- **Cache key with a version param** you can bump.

~~~
publish event ─▶ CMS webhook ─▶ purge URL (module) OR rm hashed file
              ─▶ also revalidateTag in Next.js + CDN surrogate-key purge
              ─▶ next request = MISS -> fresh content cached
~~~

**The real-world answer:** in a multi-layer stack you usually don't purge Nginx in isolation — on publish you trigger a **coordinated invalidation**: \`revalidateTag\`/\`revalidatePath\` in Next.js (clears its data/route cache so the regenerated HTML is fresh), **CDN purge by surrogate key/tag**, and (if needed) the Nginx purge. For breaking news you want all layers fresh within seconds.

Why it matters: shows you know OSS Nginx lacks native purge and the practical workarounds, plus the senior preference for **versioned URLs / short-TTL+SWR** over fragile manual purging. Production angle: breaking-news publish -> webhook -> CDN tag purge + \`revalidateTag('article:id')\` + Nginx purge endpoint (module), restricted to internal IPs. Follow-up: "Why is purge-by-key fiddly?" You must reproduce the exact \`proxy_cache_key\` (scheme+host+uri and any vary dims) to hit the right file. "Wildcard purge?" Not in stock Nginx — needs Plus or rm-by-pattern (risky) or full-cache clear.`,
        },
      ],
      tip: "Know the difference: X-Cache-Status: HIT means served from cache, MISS means went to origin. Interviewers love this.",
      rajnishAngle:
        "Your Nginx caching implementation at Times Internet — what TTLs, what pages, how you invalidate on publish.",
    },
    {
      title: "HTTP Cache Headers",
      subtopics: [
        "Cache-Control directives",
        "ETag & Last-Modified",
        "Vary header",
        "max-age vs s-maxage",
        "no-cache vs no-store",
      ],
      questions: [
        {
          q: "What is the difference between no-cache and no-store?",
          answer: `These are constantly confused, and knowing them precisely signals depth. **\`no-store\`** = never store the response **anywhere** (no browser, proxy, or CDN cache) — fetch fresh every time. **\`no-cache\`** = you **may store** it, but you **must revalidate** with the origin before using it (via ETag/Last-Modified) — if unchanged (304), the cached copy is reused.

~~~
Cache-Control: no-store
  -> nothing is cached. Every request goes fully to origin. (sensitive data)

Cache-Control: no-cache
  -> cache it, but revalidate before each use:
     request ─▶ "If-None-Match: <etag>" ─▶ origin
       304 Not Modified ─▶ reuse cached body (saves bandwidth)
       200 + new body   ─▶ replace cache
~~~

~~~
no-store : [client] ──full request──▶ [origin]   (no cache at all)
no-cache : [client] ─If-None-Match─▶ [origin] ─304─▶ reuse cache (validated)
~~~

When to use which:
- **\`no-store\`** — genuinely sensitive/never-cacheable data: banking pages, responses with PII/tokens, anything that must never persist on disk. It's the strictest; also the most wasteful (no reuse).
- **\`no-cache\`** — content that changes unpredictably but where **bandwidth-saving revalidation** is worthwhile: HTML that's usually unchanged but must be verified fresh. The 304 path reuses the cached body without re-downloading it.

The subtle point most people miss: **\`no-cache\` does NOT mean "don't cache"** — it means "cache but always validate." If you actually want "don't cache," you need **\`no-store\`**. Pair \`no-cache\` with an **ETag/Last-Modified** so revalidation can return 304; without a validator, \`no-cache\` degenerates into always re-fetching.

Often combined: \`Cache-Control: no-cache, no-store, must-revalidate\` (belt-and-suspenders for legacy proxies), though \`no-store\` alone suffices for "never cache."

Why it matters: misusing them causes either stale sensitive data (using no-cache when you needed no-store) or wasted bandwidth (no-store when no-cache+ETag would save re-downloads). Production angle: \`no-store\` for authenticated/personalized API responses; \`no-cache\` (with ETag) for HTML that must be validated; immutable long max-age for hashed assets. Follow-up: "must-revalidate?" Once stale, the cache MUST revalidate (can't serve stale on error) — stricter than default. "private vs no-store?" \`private\` allows the *browser* to cache but not shared caches; \`no-store\` forbids all caching.`,
        },
        {
          q: "What does s-maxage do and how is it different from max-age?",
          answer: `Both set how long a response is **fresh**, but they target different caches. **\`max-age\`** applies to **all** caches (notably the **browser/private** cache). **\`s-maxage\`** applies **only to shared caches** (CDN, Nginx proxy) and **overrides \`max-age\` for those shared caches**. This lets you cache aggressively at the edge while keeping the browser copy short — the standard pattern for SSR/HTML behind a CDN.

~~~
Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=300
  browser:      max-age=0  -> don't reuse without revalidating (always check)
  CDN/Nginx:    s-maxage=60 -> serve from edge for 60s (origin shielded)
                + SWR 300   -> serve stale up to 5 min more while refreshing
~~~

~~~
              browser cache        shared cache (CDN/Nginx)
max-age=N     N seconds            N seconds (unless overridden)
s-maxage=M    (ignored)            M seconds (OVERRIDES max-age here)
~~~

Why this split is useful: for HTML you usually want the **CDN to absorb traffic** (long-ish \`s-maxage\` so most requests never reach origin) but **not the browser to hold stale HTML** (short/zero \`max-age\` so a returning user revalidates and can get fresh content/purges quickly). Setting only \`max-age\` would force the same TTL on browsers and CDN; \`s-maxage\` decouples them.

Concrete recipes:
~~~
hashed JS/CSS:  Cache-Control: public, max-age=31536000, immutable
   (same everywhere — safe because URL changes on content change)

article HTML:   Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=300
   (browser revalidates; CDN serves edge copy 60s + stale-while-revalidate)

personalized:   Cache-Control: private, no-store
   (browser-only or not at all; never shared-cached)
~~~

Both require **\`public\`** (or at least not \`private\`/\`no-store\`) for shared caches to store the response. Also note **\`s-maxage\` implies the response is shared-cacheable**.

Why it matters: it's the precise lever for "cache hard at the edge, lightly in the browser" — central to serving SSR at scale. Production angle: article HTML with \`max-age=0, s-maxage=60, stale-while-revalidate=300\` so the CDN/Nginx serve millions of reads from the edge while browsers always revalidate (enabling fast purge on breaking-news edits). Follow-up: "Which wins if both set, for a CDN?" \`s-maxage\`. "Why max-age=0 not omit it?" Explicit max-age=0 makes the browser always revalidate the HTML rather than guessing a heuristic freshness.`,
        },
        {
          q: "How does ETag work for cache validation?",
          answer: `An **ETag** (Entity Tag) is an opaque **fingerprint/version identifier** the origin assigns to a specific version of a resource (often a hash of the content). The client stores it and, on the next request, asks "do you still have this version?" via **\`If-None-Match\`**. If the resource is unchanged, the origin replies **\`304 Not Modified\`** with **no body** — the client reuses its cached copy, saving bandwidth. If changed, it sends \`200\` + the new body + a new ETag.

~~~
First request:
  client ─GET /style.css──────────────▶ origin
  origin ◀─200 + body + ETag: "abc123"─┘   (client caches body + etag)

Later (revalidation):
  client ─GET /style.css, If-None-Match: "abc123"─▶ origin
  origin ◀─304 Not Modified (no body)────────────┘  -> reuse cache (saved download)
     OR ◀─200 + new body + ETag: "def456"─────────┘  -> replace cache
~~~

~~~nginx
# Nginx serves ETags for static files automatically; for proxied content
# the upstream (Next.js) sets them. You can toggle:
etag on;
~~~

Key points:
- **Strong vs weak**: \`ETag: "abc"\` (strong = byte-for-byte identical) vs \`ETag: W/"abc"\` (weak = semantically equivalent, allows minor differences like whitespace/gzip). Weak is common for dynamic content.
- **\`If-None-Match\`** (used with ETag) for GET revalidation; **\`If-Match\`** for safe writes (optimistic concurrency — "only update if the version still matches," prevents lost updates on PUT).
- **Pairs with \`no-cache\`/\`must-revalidate\`** — those say "revalidate before use," and the ETag is *how* you revalidate cheaply.

**ETag vs Last-Modified** (the usual follow-up):
~~~
ETag (If-None-Match)        Last-Modified (If-Modified-Since)
content fingerprint         timestamp (1-second resolution)
precise (any change)        can miss sub-second changes; weaker
ideal for dynamic/hashed    fine for static files with mtime
~~~
ETag is more precise (catches any change, even within the same second, and changes that don't alter mtime). Servers often send both; ETag takes precedence.

Why it matters: ETags enable **cheap freshness validation** — confirm "still current" with a tiny 304 instead of re-downloading. Crucial for HTML/API responses that are usually-unchanged but must be verified. Production angle: ETag/Last-Modified on article HTML so returning readers (or the CDN) revalidate with 304s, saving bandwidth while guaranteeing freshness; \`If-Match\` for concurrency-safe content edits in the CMS. Follow-up: "Caveat with ETags behind multiple servers?" Different nodes may compute different ETags for identical content (e.g. inode-based) -> false 200s; use content-hash ETags or disable inode-based ones. "ETag vs immutable?" \`immutable\` skips revalidation entirely (best for hashed assets); ETag is for resources you *do* revalidate.`,
        },
      ],
      tip: "max-age = browser cache. s-maxage = CDN/proxy cache. Both can be set simultaneously.",
      rajnishAngle:
        "Different TTLs for article HTML (short) vs JS bundles (immutable, 1yr) — real config you manage.",
    },
    {
      title: "CDN & Edge Caching",
      subtopics: [
        "CDN vs origin",
        "Cache invalidation strategies",
        "Purge APIs",
        "Stale content handling",
        "Cloudflare/Akamai patterns",
      ],
      questions: [
        {
          q: "How does CDN caching interact with Nginx caching?",
          answer: `They're **two shared-cache layers in series**: the CDN sits at the **edge (near users, many POPs)**, Nginx sits at the **origin (in front of your app)**. A request flows **browser -> CDN edge -> Nginx proxy_cache -> Next.js -> origin data**, and each layer can satisfy it without troubling the layers behind. They cooperate via **\`Cache-Control\`/\`s-maxage\`** headers and coordinated invalidation.

~~~
browser ─▶ CDN edge cache ─▶ Nginx proxy_cache ─▶ Next.js SSR ─▶ DB/CMS
   (private)   (global edge)     (origin shield)     (app caches)
   hit here = fastest; each layer absorbs load for the ones behind
~~~

How they interact:
- **CDN is the first/outer shared cache** — most reads are served at the edge (lowest latency, biggest traffic absorber). It honors your **\`s-maxage\`**/\`Surrogate-Control\`.
- **Nginx is the origin shield** — for CDN **misses** (cold edge, new POP, after TTL), the request hits Nginx, which serves from its own \`proxy_cache\` if it has the object — so even a CDN miss often **doesn't reach the Node app**. Nginx also protects against stampede with \`proxy_cache_lock\`/\`use_stale\`.
- **TTL coordination** — typically the CDN holds the longer edge TTL (it's closest to users); Nginx holds a similar/short TTL as a backstop. Both read the same origin \`Cache-Control\`. You can give the CDN a different TTL via \`Surrogate-Control\` while Nginx/browser see \`Cache-Control\`.
- **Invalidation must be coordinated** — on publish you purge the **CDN** (by surrogate key/tag) **and** the **Nginx** cache (and \`revalidateTag\` in Next), or a purged CDN will just re-pull a stale copy from Nginx. Order/coordination matters.

~~~
publish ─▶ purge CDN (tag) + purge/short-TTL Nginx + revalidateTag(Next)
        ─▶ next request: CDN miss -> Nginx miss -> Next regenerates -> caches up the chain
~~~

Why have both? Defense in depth: the **CDN** gives global low-latency and spike absorption; **Nginx** gives an origin-side shield (so CDN misses/stampedes don't hammer Node), plus TLS, compression, rate limiting, request routing, and a place to cache when you don't fully control the CDN. Together the origin app does minimal work.

Why it matters: shows you understand **layered shared caching** and the **invalidation coordination** gotcha (purging only one layer leaves staleness). Production angle: CDN edge (long \`s-maxage\` + SWR + surrogate keys) over Nginx \`proxy_cache\` (short TTL + cache_lock) over Next.js — on breaking-news publish, purge CDN by article tag AND invalidate Nginx/Next so all layers refresh. Follow-up: "If you only purge the CDN?" It re-fetches from Nginx, which may still hold the stale copy -> still stale; purge both. "Why not just one layer?" CDN alone leaves the origin exposed on misses/stampedes; Nginx alone lacks global edge latency.`,
        },
        {
          q: "What is cache stampede and how do you prevent it?",
          answer: `A **cache stampede** (a.k.a. thundering herd / dog-piling) happens when a cached item **expires** under high traffic and **many simultaneous requests all miss the cache at once**, so they **all hit the origin together** to regenerate the same expensive item — overwhelming the backend (which can cascade into an outage). It's worst for popular, expensive-to-render content.

~~~
t=60s  cached article expires
       1000 concurrent requests ─▶ all MISS ─▶ all stampede the origin
       origin: 1000 simultaneous renders of the SAME page -> overload -> 503s
       (and the resulting errors can mean nothing gets cached -> repeat)
~~~

Prevention techniques (name several — they want breadth):

1. **Request coalescing / cache lock** — let **one** request regenerate while the others **wait** for that result (or get served stale). Nginx: \`proxy_cache_lock on;\`. Application caches: a mutex/single-flight per key so only one origin fetch happens.
~~~nginx
proxy_cache_lock on;            # only one request fills the cache
proxy_cache_lock_timeout 5s;
~~~

2. **Stale-while-revalidate** — serve the **stale** copy instantly to everyone while **one** background request refreshes it. No one waits, origin gets one request. \`Cache-Control: stale-while-revalidate=300\` (CDN) / Nginx \`proxy_cache_use_stale updating\`.
~~~nginx
proxy_cache_use_stale updating error timeout http_500 http_502 http_503;
~~~

3. **TTL jitter / probabilistic early expiration** — add randomness to TTLs so many keys don't expire at the **same instant**, and refresh *before* expiry probabilistically (XFetch algorithm) so regeneration is spread out.

4. **Background/scheduled regeneration** — proactively refresh hot keys before they expire (cron/worker), so user requests never trigger a cold regenerate.

5. **Negative caching** — cache errors/404s briefly so a flood of bad requests doesn't stampede the origin repeatedly.

~~~
fixes:  cache_lock (coalesce) + stale-while-revalidate (serve stale, refresh once)
        + TTL jitter (spread expiries) + background refresh (pre-warm hot keys)
~~~

Why it matters: stampede is a real production incident pattern — a popular article expiring during a traffic spike can take down the origin. The combination **SWR + cache lock + jitter** is the standard defense. Production angle: breaking-news article (extremely hot) expiring during an IPL traffic spike is the textbook stampede risk — mitigated with \`stale-while-revalidate\` + \`proxy_cache_lock\` + jittered TTLs + on-publish pre-warming. Follow-up: "SWR vs cache_lock difference?" Lock makes others *wait* for the refresh; SWR serves them *stale* while one refreshes (better UX — no waiting). "How does ISR relate?" Next.js ISR serves stale while regenerating in the background — the same SWR idea at the framework layer.`,
        },
        {
          q: "How do you handle breaking news — force-invalidating cached article pages?",
          answer: `Breaking news inverts the normal trade-off: you've cached aggressively for performance, but now you must push **fresh content within seconds** across **every cache layer** and **every page the article appears on**. The answer is **event-driven, tag-based invalidation** triggered by the publish event — not waiting for TTLs.

**The invalidation pipeline (on publish/update):**
~~~
editor publishes/updates ─▶ CMS webhook ─▶ invalidation service:
  1. revalidateTag('article:123')         -> Next.js Data + Full Route cache
  2. CDN purge by surrogate key 'article:123' -> all edge POPs
  3. Nginx cache purge (module / rm by key)    -> origin shield
  4. (optional) pre-warm: re-request the page so the next reader gets a HIT
  ─▶ readers see fresh content in seconds, everywhere it's shown
~~~

**Why tag/surrogate-key based, not URL-by-URL:** a breaking story appears on the **article page + homepage + category page + "related" sidebars + AMP**. Enumerating every URL is fragile. Tagging the article's data with \`article:123\` (and pages with the tags they depend on) lets **one purge** invalidate **all** of them — \`revalidateTag\` (Next) and CDN **surrogate keys/cache tags** (Cloudflare/Fastly) do exactly this.

**Coordinate the layers (order matters):** purge/refresh from origin outward so a purged outer layer doesn't immediately re-pull a stale inner copy: invalidate Next + Nginx, then purge the CDN (or purge CDN and let it miss through to a freshly-revalidated origin). Use **pre-warming** for the hottest pages so the first real reader gets a HIT, not a slow regenerate.

**Keep performance during the spike:** combine with **stale-while-revalidate** + **\`proxy_cache_lock\`** so that during regeneration you don't stampede the origin (breaking news = huge concurrent traffic). Short base TTLs mean even if a purge is missed, content self-refreshes quickly.

~~~
trade-off resolved:
  normal:        long-ish s-maxage + SWR  (perf, origin shielded)
  breaking news: on-publish TAG purge across CDN + Nginx + Next  (seconds-fresh)
  during spike:  SWR + cache_lock + pre-warm  (fresh AND no origin overload)
~~~

Why it matters: it demonstrates the senior skill of **balancing freshness vs performance** and knowing the precise mechanisms (\`revalidateTag\`, surrogate-key CDN purge, Nginx purge, pre-warm, SWR) to get **seconds-level freshness without sacrificing the cache or melting the origin**. Production angle: NBT/Maharashtra Times breaking-news flow — CMS publish webhook fans out a tag-based purge to CDN + Nginx + \`revalidateTag\` in Next, pre-warms the article + homepage, with SWR + cache_lock protecting the origin under the traffic surge. Follow-up: "How fast can it be?" Edge purges propagate in ~seconds on modern CDNs; \`revalidateTag\` is immediate at origin. "What if purge fails?" Short TTL + SWR is the safety net so staleness is bounded to seconds-minutes regardless.`,
        },
      ],
      tip: "Cache stampede = many requests hit origin simultaneously after cache expires. Use stale-while-revalidate to prevent it.",
      rajnishAngle:
        "Breaking news invalidation at NBT/Maharashtra Times — how do you push fresh content fast?",
    },
    {
      title: "Nginx Performance Tuning",
      subtopics: [
        "gzip/brotli compression",
        "keepalive connections",
        "worker_processes",
        "rate limiting",
        "SSL termination",
      ],
      questions: [
        {
          q: "How do you enable gzip compression in Nginx and what does it compress?",
          answer: `Gzip compresses **text-based** responses on the fly before sending them, dramatically reducing bytes over the wire (HTML/CSS/JS often shrink 60–80%), which lowers TTFB/transfer time. You enable it with the \`gzip\` directives and crucially **scope it to compressible MIME types** — never to already-compressed binaries.

~~~nginx
gzip on;
gzip_comp_level 5;            # 1–9; ~5 is the sweet spot (CPU vs ratio)
gzip_min_length 1024;        # don't bother compressing tiny responses
gzip_vary on;                # add 'Vary: Accept-Encoding' (cache correctness)
gzip_proxied any;            # compress proxied responses too
gzip_types
  text/plain text/css
  application/javascript application/json
  application/xml image/svg+xml
  application/rss+xml application/atom+xml font/ttf;  # NOT images/video/woff2
~~~

~~~
compress (text, benefits a lot):     DON'T compress (already compressed):
  HTML, CSS, JS                        JPEG/PNG/WebP/AVIF images
  JSON, XML, SVG, RSS                  MP4/video, woff2 fonts (pre-compressed)
  plain text                           gzip/zip archives
~~~

Why scope it: compressing already-compressed formats (images, video, woff2) **wastes CPU for ~0 gain** (and can even grow the file). \`text/html\` is compressed by default; you add the rest via \`gzip_types\`.

Important details:
- **\`gzip_vary on\`** emits \`Vary: Accept-Encoding\` so caches store/serve the right (compressed vs not) variant per client — without it a cache could serve a gzipped body to a client that can't decode it.
- **\`gzip_comp_level\`** — higher = smaller but more CPU; ~4–6 balances well for dynamic content. For **static** assets, pre-compress at build (\`gzip_static\`/\`brotli_static\`) so Nginx serves precompressed files with no per-request CPU.
- **Don't compress responses to \`Range\` requests / very small bodies** (overhead exceeds savings — \`gzip_min_length\`).

**Brotli** (next question's territory) compresses ~15–20% better than gzip for text — enable it (\`ngx_brotli\`) alongside gzip, with brotli for browsers that support it and gzip as fallback. For large HTML news pages, that's a meaningful TTFB win.

~~~
news article HTML 200KB ─gzip─▶ ~40KB ─brotli─▶ ~32KB  (faster TTFB/transfer)
~~~

Why it matters: compression is one of the highest-ROI, lowest-effort TTFB/bandwidth wins, and scoping it correctly (text only, Vary, pre-compress static) shows you know the trade-offs. Production angle: gzip+brotli on article HTML/CSS/JS with \`gzip_vary\`, pre-compressed static assets via \`brotli_static\`/\`gzip_static\`, excluding images/woff2 — measurable TTFB improvement on large Hindi/Marathi HTML pages. Follow-up: "gzip_static?" Serves a precompressed \`.gz\` if present (no runtime CPU). "Why not max comp_level for dynamic?" CPU cost per request outweighs marginal byte savings; reserve high levels for build-time static compression.`,
        },
        {
          q: "What is the benefit of keepalive connections in Nginx?",
          answer: `**Keepalive** (HTTP persistent connections) lets a **single TCP (and TLS) connection be reused for multiple requests** instead of opening and tearing down a new connection per request. The benefit is **eliminating repeated TCP handshake + TLS negotiation overhead**, which lowers latency (TTFB), reduces CPU, and increases throughput — both for **client<->Nginx** and **Nginx<->upstream**.

~~~
Without keepalive (per request):
  [TCP handshake][TLS handshake][request/response][close]  x every request
   ^ ~1–3 RTTs of pure overhead before any data, every time

With keepalive (reused connection):
  [TCP][TLS][req/res][req/res][req/res]...   handshake paid ONCE
~~~

Two places it matters:

**1. Client -> Nginx** (default on with HTTP/1.1):
~~~nginx
keepalive_timeout 65s;      # keep client connections open up to 65s
keepalive_requests 1000;    # max requests per connection before closing
~~~
Browsers fetch many assets per page; reusing the connection avoids re-handshaking for each (HTTP/2 multiplexes many streams over one connection — even better).

**2. Nginx -> upstream (app servers)** — this one is **off by default** and a common miss:
~~~nginx
upstream nextjs {
  server 127.0.0.1:3000;
  keepalive 64;             # pool of reusable connections to the app
}
server {
  location / {
    proxy_pass http://nextjs;
    proxy_http_version 1.1;       # REQUIRED for upstream keepalive
    proxy_set_header Connection "";  # clear 'close' so the conn is reused
  }
}
~~~
Without these three lines, Nginx opens a fresh TCP connection to Node **for every request** — at high RPS that's significant overhead and added TTFB. Enabling upstream keepalive pools connections to the backend.

~~~
benefits: lower latency (no per-request handshakes) + less CPU (fewer TLS negs)
          + higher throughput + fewer sockets in TIME_WAIT
~~~

Tuning trade-off: \`keepalive_timeout\` too high holds idle connections (memory/socket pressure under huge concurrency); too low loses the reuse benefit. Balance against your traffic pattern.

Why it matters: handshake overhead (especially TLS) is a real chunk of TTFB; keepalive — particularly the **upstream** keepalive that people forget — is a cheap, high-impact tuning win at scale. Production angle: upstream keepalive to the Next.js pool (\`keepalive 64\` + http/1.1 + \`Connection ""\`) plus client keepalive/HTTP2, cutting TTFB at high RPS on the portals. Follow-up: "Why is upstream keepalive off by default?" Historical default; you must explicitly opt in with http_version 1.1 + Connection "". "HTTP/2 / HTTP/3 relation?" H2 multiplexes over one connection (no head-of-line blocking at HTTP layer); H3/QUIC reduces handshake RTTs further — same goal, fewer round-trips.`,
        },
        {
          q: "How do you configure rate limiting to protect against traffic spikes?",
          answer: `Nginx rate limiting throttles how fast clients can make requests, protecting the origin from abuse, scrapers, accidental floods, and DoS-ish spikes. The primary tool is the **leaky-bucket** \`limit_req\` (requests/sec per key), complemented by \`limit_conn\` (concurrent connections) and \`limit_req_status\`.

~~~nginx
# define a shared-memory zone keyed by client IP, allowing 10 req/sec
limit_req_zone $binary_remote_addr zone=perip:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=conns:10m;

server {
  location /api/ {
    # allow bursts up to 20 queued, smoothed (no delay = reject immediately)
    limit_req zone=perip burst=20 nodelay;
    limit_conn conns 10;                 # max 10 concurrent conns per IP
    limit_req_status 429;                # return 429 Too Many Requests
    proxy_pass http://backend;
  }

  location /login {                      # stricter on sensitive endpoints
    limit_req zone=perip burst=5 nodelay;
  }
}
~~~

~~~
leaky bucket (rate=10r/s, burst=20):
  steady allowed rate ──▶ 10 req/s
  short spike          ──▶ up to 20 queued (burst), then 429
  nodelay              ──▶ serve burst immediately instead of spacing them out
~~~

Key concepts:
- **\`rate\`** — sustained allowed rate (e.g. \`10r/s\`). Requests above it are delayed or rejected.
- **\`burst\`** — a queue allowing short spikes above the rate (real traffic is bursty; without burst, legit users get 429s).
- **\`nodelay\`** — serve the burst **immediately** (vs spacing them at the rate); usually what you want for UX. \`delay=N\` is a hybrid (first N immediate, rest delayed).
- **Key choice** — \`$binary_remote_addr\` (per IP) is common; behind a CDN/proxy use \`$http_x_forwarded_for\`/a real-IP module so you don't rate-limit the CDN's IPs as one. You can key by API token, URI, etc.
- **\`limit_conn\`** — caps simultaneous connections (protects against slow-loris / connection exhaustion).
- **\`limit_req_status 429\`** — return a proper 429 (with optional \`Retry-After\`) so clients back off.

Senior nuances: set limits **per route** (strict on \`/login\`, \`/search\`, write APIs; lenient on cached static), account for **shared IPs / NAT / CDN** (don't punish many users behind one IP — key appropriately), combine with **fail2ban / WAF / CDN rate limiting** at the edge (better to shed load *before* it reaches origin), and **monitor** 429 rates so you don't throttle legit spikes (breaking-news traffic is legitimate — that's where caching, not rate-limiting, is the answer).

~~~
defense in depth: CDN/WAF rate-limit (edge) ─▶ Nginx limit_req/limit_conn (origin)
                  + caching to absorb LEGIT spikes (don't rate-limit real readers)
~~~

Why it matters: protects availability during abuse/spikes while not harming legitimate bursty traffic — and pairing it with caching (so real news spikes are served from cache, not rate-limited) shows judgment. Production angle: \`limit_req\` on API/login/search endpoints keyed by real client IP (via X-Forwarded-For behind CDN), 429 + Retry-After, while article reads rely on CDN/Nginx caching to handle legitimate breaking-news surges rather than throttling. Follow-up: "Behind a CDN, what's the rate-limit pitfall?" Keying on \`$remote_addr\` sees the CDN's IPs -> you'd limit all users together; use the forwarded real IP. "Rate limit vs caching for spikes?" Caching for legitimate spikes, rate limiting for abuse — different problems.`,
        },
      ],
      tip: "Brotli compresses ~15-20% better than gzip for text. For news sites with large HTML, this is significant.",
      rajnishAngle:
        "Gzip/brotli on article HTML at Times Internet — measurable TTFB improvement story.",
    },
  ],
};
