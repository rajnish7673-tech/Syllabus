import type { Week } from "../types";

export const week16: Week = {
  week: 14,
  theme: "Security for Frontend Engineers",
  color: "#EF4444",
  topics: [
    {
      title: "XSS — Cross-Site Scripting",
      subtopics: [
        "Reflected vs stored vs DOM XSS",
        "dangerouslySetInnerHTML risks",
        "Content Security Policy",
        "Sanitization libraries",
      ],
      questions: [
        {
          q: "What are the three types of XSS and how does each work?",
          answer: `**XSS (Cross-Site Scripting)** is injecting malicious script that runs in a victim's browser **in the context of your site** — so it can steal cookies/tokens, hijack sessions, keylog, deface, or make requests as the user. The three types differ by **where the payload lives and how it reaches the victim**:

~~~
1. Reflected XSS  — payload in the REQUEST, reflected in the response immediately
2. Stored XSS     — payload SAVED on the server, served to every viewer later
3. DOM-based XSS  — payload never hits the server; client-side JS writes it into the DOM
~~~

**1. Reflected XSS** — the malicious input is part of the request (a URL query param, form field) and the server **echoes it back unescaped** in the response. The attacker crafts a link and tricks the victim into clicking it:
~~~
https://site.com/search?q=<script>steal(document.cookie)</script>
  -> server renders "Results for: <script>...</script>" -> runs in victim's browser
~~~
Non-persistent — affects only those who click the crafted link.

**2. Stored (persistent) XSS** — the payload is **saved** (DB, comment, profile, message) and later served to **every** user who views that content. The most dangerous because it auto-spreads without a special link:
~~~
attacker posts a comment: <script>steal()</script>
  -> stored in DB -> every reader of that article runs the script
~~~

**3. DOM-based XSS** — the vulnerability is **entirely client-side**: JavaScript reads attacker-controlled input (\`location.hash\`, \`location.search\`) and writes it into the DOM via a **sink** (\`innerHTML\`, \`document.write\`, \`eval\`) **without sanitizing**. The server may never see the payload:
~~~js
// DOM XSS sink:
document.getElementById('out').innerHTML = location.hash.slice(1); // #<img src=x onerror=...>
~~~

~~~
reflected:  attacker link ─▶ server echoes ─▶ runs (one victim/click)
stored:     attacker saves ─▶ server serves to all ─▶ runs (many victims)
DOM:        attacker input ─▶ client JS sink (innerHTML) ─▶ runs (no server involved)
~~~

Defenses (apply all): **output encoding/escaping** by context (HTML, attribute, JS, URL), **never trust input**, **sanitize** any HTML you must render (DOMPurify), avoid dangerous sinks (\`innerHTML\`/\`eval\`), a strict **Content Security Policy** as defense-in-depth, and **HttpOnly cookies** so XSS can't read auth tokens. Frameworks like React **auto-escape** JSX (mitigating reflected/stored in rendered text) — but \`dangerouslySetInnerHTML\` and DOM sinks reopen the hole.

Why it matters: XSS is the most common frontend vulnerability; knowing the three vectors and that **stored is worst / DOM is client-only** shows real security literacy. Production angle: user-generated content (comments, search echoes, profile fields) on a news site is the prime XSS surface — sanitize on render, escape reflected params, CSP + HttpOnly cookies as backstops. Follow-up: "Which is most dangerous?" Stored (self-propagating, no special link). "How does React help/not?" Auto-escapes interpolated values; \`dangerouslySetInnerHTML\` bypasses it. "Mutation/Universal XSS?" mXSS via sanitizer-reparse quirks — why you use a vetted sanitizer.`,
        },
        {
          q: "How does React protect against XSS by default? When does it not?",
          answer: `React **automatically escapes** any value you interpolate into JSX before inserting it into the DOM — converting characters like \`<\`, \`>\`, \`&\`, \`"\`, \`'\` into HTML entities. So a string containing \`<script>\` renders as harmless **text**, not an executed element. This default escaping neutralizes the most common XSS vector (rendering untrusted text).

~~~jsx
const userInput = '<img src=x onerror="steal()">';
return <div>{userInput}</div>;
// React renders the LITERAL TEXT, escaped:
// <div>&lt;img src=x onerror=...&gt;</div>   -> displayed as text, NOT executed
~~~

**When React does NOT protect you (the gaps interviewers probe):**

1. **\`dangerouslySetInnerHTML\`** — explicitly bypasses escaping to inject raw HTML. If the HTML is attacker-controlled and unsanitized, that's XSS:
~~~jsx
// ❌ XSS if 'html' is untrusted
<div dangerouslySetInnerHTML={{ __html: userHtml }} />
// ✅ sanitize first
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userHtml) }} />
~~~

2. **\`href\`/\`src\` with \`javascript:\` URLs** — React doesn't fully sanitize URL **attributes**; a \`javascript:\` URL executes on click:
~~~jsx
// ❌ <a href={userUrl}> where userUrl = "javascript:steal()"
// ✅ validate the scheme (allow only http/https/mailto) before using it
~~~

3. **Spreading untrusted props / setting attributes dynamically** — e.g. injecting attacker-controlled event handlers or attributes.

4. **Directly touching the DOM** — using \`ref\` + \`innerHTML\`/\`document.write\`/\`eval\`, or third-party libraries that do, bypasses React entirely (DOM-based XSS).

5. **Server/SSR injection** — injecting unescaped data into the HTML stream, inline \`<script>\` (e.g. serializing state with \`JSON.stringify\` without escaping \`<\`/\`</script>\`), or dangerouslySet on the server.

~~~
SAFE by default:   {value} in JSX text/children -> escaped
NOT safe:          dangerouslySetInnerHTML, href="javascript:", DOM refs + innerHTML,
                   eval, unescaped SSR/inline-script injection
~~~

Defenses for the gaps: **sanitize** any raw HTML with **DOMPurify** before \`dangerouslySetInnerHTML\`; **validate URL schemes** for \`href\`/\`src\`; avoid direct DOM sinks; escape data injected into inline scripts during SSR; add a **CSP** and **HttpOnly cookies** as defense-in-depth.

Why it matters: candidates often say "React is XSS-safe" — the senior answer is "**by default for interpolated text, but not for \`dangerouslySetInnerHTML\`, \`javascript:\` URLs, or direct DOM access** — those need explicit sanitization." Production angle: rendering CMS/rich-text article HTML via \`dangerouslySetInnerHTML\` is a real risk — sanitize with DOMPurify (allowlist tags/attrs), and validate any user-provided link schemes. Follow-up: "Sanitize where?" Prefer at render with DOMPurify (and/or server-side) — and re-sanitize, since storage-time sanitization can be bypassed. "javascript: URL fix?" Allowlist \`https?:\`/\`mailto:\` schemes.`,
        },
        {
          q: "What is a Content Security Policy and how do you configure it?",
          answer: `A **Content Security Policy (CSP)** is an HTTP response header (\`Content-Security-Policy\`) that tells the browser **which sources of content are allowed** to load/execute on your page — scripts, styles, images, frames, connections, etc. It's a powerful **defense-in-depth against XSS**: even if an attacker injects a \`<script>\`, the browser **refuses to execute it** unless it comes from an allowed source. CSP is a mitigation layer, not a replacement for escaping/sanitizing.

~~~http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.trusted.com 'nonce-r4nd0m';
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://images.cdn.com data:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';           /* anti-clickjacking */
  object-src 'none';
  base-uri 'self';
~~~

How it blocks XSS: with a strict \`script-src\`, an injected inline \`<script>alert(1)</script>\` or a script from \`evil.com\` **won't run** — the browser only executes scripts matching the allowlist (a domain, a **nonce**, or a **hash**). This turns a successful injection into a no-op.

Key directives:
~~~
default-src   : fallback for all resource types
script-src    : where JS can come from   (the most security-critical)
style-src     : where CSS can come from
img-src / connect-src / font-src / frame-src : per resource type
frame-ancestors : who may iframe YOU (clickjacking defense; replaces X-Frame-Options)
report-uri / report-to : send violation reports for monitoring
~~~

**Modern best practice — nonces or hashes instead of \`unsafe-inline\`:**
- Avoid \`'unsafe-inline'\` and \`'unsafe-eval'\` for scripts (they defeat most of CSP's value).
- Use a per-request **nonce**: \`script-src 'nonce-{random}'\` and add \`nonce="{random}"\` to each legit inline script tag. Only nonce-matching scripts run.
- Or use **hashes** (\`'sha256-...'\`) of known inline scripts.
- A **strict CSP** with \`'strict-dynamic'\` + nonce is the current recommended pattern (lets trusted scripts load their own deps without allowlisting every CDN).

**Rollout strategy (crucial in the real world):** deploy first in **report-only** mode (\`Content-Security-Policy-Report-Only\`) which **logs violations without blocking**, collect reports, fix legitimate sources, then enforce. CSP can easily break third-party scripts (ads, analytics, GTM) — so you iterate using reports.

~~~
1. Content-Security-Policy-Report-Only + report-to  (observe, don't block)
2. analyze violation reports -> allowlist real sources / add nonces
3. switch to enforcing Content-Security-Policy
~~~

In Next.js you set it via \`headers()\` in \`next.config\` or **middleware** (to inject a per-request nonce). Why it matters: CSP is the strongest browser-level XSS mitigation, and knowing **nonces/hashes over unsafe-inline** + the **report-only rollout** shows production experience (not just "set a CSP"). Production angle: a news site juggling many third-party scripts uses a nonce-based strict CSP rolled out via report-only first, with \`frame-ancestors\` to prevent clickjacking and \`report-to\` feeding violations into monitoring. Follow-up: "Biggest CSP pitfall?" \`unsafe-inline\`/\`unsafe-eval\` (and third-party scripts breaking) — use nonces + report-only rollout. "frame-ancestors vs X-Frame-Options?" frame-ancestors is the modern, more flexible clickjacking control. "Does CSP stop all XSS?" No — defense-in-depth; still escape/sanitize.`,
        },
      ],
      tip: "React escapes JSX values automatically. dangerouslySetInnerHTML bypasses this — always sanitize with DOMPurify first.",
      rajnishAngle:
        "User-generated content in comments or search inputs on NBT — XSS risk if not sanitized.",
    },
    {
      title: "CSRF & Authentication",
      subtopics: [
        "CSRF attacks",
        "SameSite cookies",
        "CSRF tokens",
        "JWT vs session cookies",
        "HttpOnly & Secure flags",
      ],
      questions: [
        {
          q: "What is a CSRF attack and how do SameSite cookies prevent it?",
          answer: `**CSRF (Cross-Site Request Forgery)** tricks a logged-in user's browser into making an **unwanted authenticated request** to your site. Because browsers **automatically attach cookies** to requests for a domain, a malicious site can trigger a request to your site and the user's **session cookie rides along** — so the request executes **as the authenticated user** without the attacker ever seeing the cookie.

~~~
victim is logged into bank.com (has session cookie)
victim visits evil.com, which contains:
  <form action="https://bank.com/transfer" method="POST">
    <input name="to" value="attacker"><input name="amount" value="10000">
  </form>
  <script>document.forms[0].submit()</script>   <!-- auto-submits -->
browser sends the POST to bank.com WITH the session cookie -> transfer executes
~~~

The root cause: **ambient authority** — cookies are sent automatically on **cross-site** requests, so the server can't tell a forged request from a legit one based on the cookie alone.

**How \`SameSite\` cookies prevent it:** the \`SameSite\` cookie attribute tells the browser **whether to send the cookie on cross-site requests**:
~~~
Set-Cookie: session=...; SameSite=Lax;  Secure; HttpOnly

SameSite=Strict : cookie NEVER sent on cross-site requests (even top-level nav)
SameSite=Lax    : sent only on top-level GET navigations, NOT on cross-site POST/
                  iframe/AJAX  -> blocks the forged POST above  (modern default)
SameSite=None   : sent on all cross-site requests (requires Secure) — for legit
                  cross-site use (e.g. embedded widgets, SSO) — needs other CSRF defense
~~~

With **\`SameSite=Lax\`** (now the **browser default** for cookies without the attribute), the forged cross-site **POST** from evil.com **doesn't include the session cookie**, so the server sees an unauthenticated request and rejects it — CSRF blocked. \`Strict\` is even tighter (blocks cross-site GETs too, but can hurt UX like following a link from email).

~~~
evil.com cross-site POST ─▶ browser checks SameSite=Lax ─▶ DON'T attach session cookie
                         ─▶ server: no auth ─▶ rejected (CSRF prevented)
~~~

**Defense-in-depth (don't rely on SameSite alone):** combine with **CSRF tokens** (a per-session/request secret the attacker can't read or guess, validated server-side), checking **Origin/Referer** headers, and requiring **custom headers** for state-changing requests (which cross-site simple forms can't set). Use **\`SameSite=None; Secure\`** only when you genuinely need cross-site cookies, and then add token-based CSRF protection. Also: tokens stored in cookies are vulnerable to CSRF (cookie auto-sent); tokens in headers (e.g. Authorization) are not — but those have XSS trade-offs (see JWT vs cookie question).

Why it matters: CSRF exploits the browser's automatic cookie behavior; knowing **SameSite=Lax (default) blocks the common cross-site POST** plus the need for **defense-in-depth (tokens, Origin checks)** is core auth security. Production angle: login/session cookies on the news site set \`SameSite=Lax; Secure; HttpOnly\`, with CSRF tokens on state-changing endpoints (subscribe, comment, account changes) and Origin checks — especially across subdomains. Follow-up: "Lax vs Strict?" Strict blocks all cross-site (breaks inbound links/SSO UX); Lax is the pragmatic default. "Does SameSite fully solve CSRF?" No — older browsers, \`SameSite=None\` cases, and edge cases need tokens too. "GET requests?" Never perform state changes on GET (CSRF and caching/prefetch hazards).`,
        },
        {
          q: "What is the difference between storing JWT in localStorage vs HttpOnly cookie?",
          answer: `It's a security trade-off between **XSS** and **CSRF** exposure. **localStorage** is readable by any JavaScript on your origin -> if you have an **XSS** vulnerability, the attacker can steal the token. **HttpOnly cookies** are **not** accessible to JavaScript (immune to XSS theft) but are **auto-sent** with requests -> exposed to **CSRF** (mitigated by SameSite + tokens). The senior consensus: **HttpOnly cookies are safer for auth tokens.**

~~~
                  localStorage (JWT)            HttpOnly cookie
JS access         YES (window.localStorage)     NO (HttpOnly hides it from JS)
XSS risk          HIGH — script can read & exfil token   LOW — script can't read it
CSRF risk         LOW — not auto-sent; you attach it     HIGH — auto-sent (use SameSite+token)
sent how          manually (Authorization: Bearer)       automatically by browser
size/scope        per-origin, ~5MB                        per-domain, ~4KB, path/domain scoped
~~~

**Why HttpOnly cookies are generally preferred for auth tokens:** the **worst** outcome is token theft (full account takeover), and **XSS is more common/severe** than CSRF, which has strong, standardized mitigations (\`SameSite\`, CSRF tokens). With localStorage, **any** XSS = stolen token. With HttpOnly cookies, even a successful XSS **can't read the token** (it can still make requests *as* the user while the page is open, but it can't exfiltrate a long-lived token to use elsewhere/later). So you trade a hard-to-fully-fix problem (XSS token theft) for a well-solved one (CSRF).

~~~
Set-Cookie: token=...; HttpOnly; Secure; SameSite=Lax; Path=/   <- recommended for auth
~~~
- **HttpOnly** — JS can't read it (XSS can't steal it).
- **Secure** — only sent over HTTPS.
- **SameSite=Lax/Strict** — blocks the common CSRF vector.
- Add **CSRF tokens** for state-changing requests as defense-in-depth.

**When localStorage/Bearer tokens are used anyway:** SPAs calling cross-origin APIs, mobile, or when you can't set cookies on the API domain — the \`Authorization: Bearer\` header pattern is convenient and naturally CSRF-immune (not auto-sent). But then you **must** be rigorous about XSS (CSP, sanitization) because there's no HttpOnly safety net, and prefer **short-lived access tokens + refresh** so a stolen token has a small window.

~~~
threat model:
  XSS more likely & severe (token theft -> takeover)  -> favor HttpOnly cookie
  CSRF well-mitigated (SameSite + tokens)             -> the cookie's weakness is manageable
~~~

Why it matters: this is a classic auth-security question; the senior answer weighs **XSS vs CSRF**, concludes **HttpOnly+Secure+SameSite cookie for auth tokens** (with CSRF tokens), and notes short-lived tokens limit blast radius. Production angle: news-site login uses HttpOnly, Secure, SameSite cookies for the session/refresh token across subdomains, never localStorage — so an XSS bug can't exfiltrate credentials. Follow-up: "But cookies need CSRF protection?" Yes — SameSite + CSRF tokens; that's a solved problem, unlike XSS token theft. "Refresh tokens?" Keep the refresh token HttpOnly; short-lived access token; rotate on use. "XSS makes both bad?" XSS can act-as-user in both, but only localStorage lets it *steal* the token for later/elsewhere — HttpOnly limits damage to the active session.`,
        },
        {
          q: "What are the HttpOnly and Secure cookie flags and why are they important?",
          answer: `These are cookie attributes set via the \`Set-Cookie\` header that harden cookies (especially **auth/session cookies**) against theft and interception. **\`HttpOnly\`** makes a cookie **inaccessible to JavaScript**; **\`Secure\`** makes it **only sent over HTTPS**. Together with **\`SameSite\`**, they're the baseline for safe session cookies.

~~~http
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600
~~~

**\`HttpOnly\`** — the cookie is **not exposed to client-side scripts** (\`document.cookie\` can't read it; JS APIs can't access it). Importance: it's the primary defense against **XSS-based cookie/session theft**. Even if an attacker injects script via XSS, they **cannot read the session cookie** to exfiltrate it — so an XSS bug doesn't directly hand over the user's session token. (The script can still make requests while the page is open, but it can't steal the token for reuse elsewhere/later.)

~~~
without HttpOnly:  XSS runs  document.cookie  -> reads session -> sends to attacker (takeover)
with HttpOnly:     document.cookie can't see it -> XSS can't steal the session token
~~~

**\`Secure\`** — the cookie is **only transmitted over HTTPS** (encrypted), never over plain HTTP. Importance: prevents the cookie from being **sniffed on the network** (man-in-the-middle on an open Wi-Fi, etc.). Without \`Secure\`, a cookie could be sent in cleartext on an accidental HTTP request and intercepted. (Modern \`SameSite=None\` even *requires* \`Secure\`.)

**\`SameSite\`** (the third pillar) — controls cross-site sending (CSRF defense): \`Lax\` (default), \`Strict\`, or \`None; Secure\`.

~~~
the secure-cookie trifecta for auth:
  HttpOnly  -> XSS can't read it      (theft via script)
  Secure    -> only over HTTPS        (network sniffing)
  SameSite  -> not sent cross-site    (CSRF)
~~~

Additional hardening to mention: **\`Path\`/\`Domain\`** scoping (limit where the cookie is sent), **\`Max-Age\`/\`Expires\`** (short-lived sessions), the **\`__Host-\`/\`__Secure-\` cookie prefixes** (browser-enforced rules: \`__Host-\` requires Secure, no Domain, Path=/), and rotating session tokens. Note **HttpOnly only protects the cookie value from JS theft — it doesn't stop XSS from acting as the user** while the page is loaded, so you still need XSS prevention (escaping, CSP).

Why it matters: setting auth cookies **HttpOnly; Secure; SameSite** is table-stakes session security, and explaining *which threat each flag addresses* (XSS theft, network sniffing, CSRF) shows you understand the threat model, not just the syntax. Production angle: session/refresh cookies on the news-site login set \`HttpOnly; Secure; SameSite=Lax\` (and \`Domain\` scoped for subdomains nbt/mht/et), so neither XSS can exfiltrate them nor can they leak over HTTP. Follow-up: "Does HttpOnly stop XSS?" No — it stops XSS from *stealing the cookie*; XSS can still act as the user; you still need to prevent XSS. "Why Secure if site is HTTPS-only?" Defends against accidental HTTP requests/downgrade and is required for SameSite=None. "__Host- prefix?" Browser-enforced: must be Secure, Path=/, no Domain — hardens against cookie injection/subdomain attacks.`,
        },
      ],
      tip: "Never store JWTs in localStorage — vulnerable to XSS. Use HttpOnly cookies for auth tokens.",
      rajnishAngle:
        "Times Internet login flow — cookie security flags, session management across subdomains (nbt, mht, et).",
    },
    {
      title: "CORS & Same-Origin Policy",
      subtopics: [
        "Same-origin policy",
        "CORS headers",
        "Preflight requests",
        "Credentialed requests",
        "Common CORS misconfigurations",
      ],
      questions: [
        {
          q: "What is the same-origin policy?",
          answer: `The **Same-Origin Policy (SOP)** is a fundamental browser security mechanism that **restricts how a document/script from one origin can interact with resources from another origin.** It's what stops a malicious site from reading your data on another site. An **origin** is the triple **(scheme, host, port)** — all three must match for two URLs to be "same-origin."

~~~
origin = scheme://host:port
https://app.example.com:443/page   vs ...
  https://app.example.com/other     -> SAME origin ✓
  http://app.example.com            -> different SCHEME (http vs https) ✗
  https://api.example.com           -> different HOST (subdomain) ✗
  https://app.example.com:8080      -> different PORT ✗
~~~

What SOP restricts (the key part): a script from origin A generally **cannot read** responses, cookies, DOM, or storage of origin B. Specifically:
- **\`fetch\`/XHR** to another origin: the request may be *sent*, but the script **can't read the response** unless the other origin opts in via **CORS**.
- **DOM access** across origins (e.g. into a cross-origin iframe) is blocked.
- **\`localStorage\`/\`IndexedDB\`/cookies** are partitioned per origin.

~~~
without SOP, evil.com could:
  fetch('https://bank.com/account')  -> read your balance (your cookies attached)
  read an iframed bank.com's DOM     -> scrape your data
SOP blocks the READING of cross-origin responses/DOM -> protects your data
~~~

Why it exists: browsers send your **cookies/credentials automatically** to a site. Without SOP, any page you visit could silently read your authenticated data from every other site you're logged into. SOP is the boundary that makes the web safe to browse arbitrary sites while staying logged into sensitive ones.

What SOP does **not** block: it doesn't stop you from *sending* cross-origin requests (which is why **CSRF** exists — the request goes through; SOP just stops the attacker *reading the response*). Some cross-origin operations are allowed by design: loading **images, scripts, stylesheets, fonts** via tags (e.g. \`<img src>\`, \`<script src>\`), and **top-level navigation** — these embed but don't let you *read* the cross-origin content (mostly).

**CORS** is the controlled **relaxation** of SOP: a server can include CORS headers (\`Access-Control-Allow-Origin\`, etc.) to explicitly permit specific other origins to read its responses. So SOP is the default-deny; CORS is the opt-in allow.

Why it matters: SOP is the foundation of web security and the reason CORS and CSRF exist; precisely defining **origin = scheme+host+port** and that SOP **blocks reading cross-origin responses (not sending)** is essential. Production angle: the news frontend (\`nbt.example.com\`) calling backend APIs (\`api.example.com\`) is **cross-origin** (different host) — so those APIs must send CORS headers for the browser to let the frontend read the responses. Follow-up: "Is a subdomain same-origin?" No — different host = different origin (though \`document.domain\` and cookies have separate, looser rules). "SOP vs CORS?" SOP = default restriction; CORS = server-controlled opt-in to relax it. "Why does CSRF still work despite SOP?" SOP blocks *reading* the response, not *sending* the (cookie-bearing) request.`,
        },
        {
          q: "When does a CORS preflight request get triggered?",
          answer: `A **CORS preflight** is an automatic **\`OPTIONS\`** request the browser sends **before** the actual cross-origin request, to ask the server "are you OK with this method/headers from my origin?" It's triggered for **"non-simple" requests** — anything beyond the narrow set of "simple" requests. The browser does this **without your code asking** — it's part of the CORS protocol.

~~~
"Simple" request (NO preflight) — ALL of these must hold:
  - method is GET, HEAD, or POST
  - only "CORS-safelisted" headers (Accept, Accept-Language, Content-Language,
    Content-Type) and no custom headers
  - Content-Type is ONLY one of:
      text/plain
      application/x-www-form-urlencoded
      multipart/form-data
  - no ReadableStream body, no special event listeners on the upload

"Non-simple" request (TRIGGERS preflight) — any of:
  - method is PUT, DELETE, PATCH (or other non-simple)
  - Content-Type: application/json   <- the most common trigger!
  - any custom header (Authorization, X-Requested-With, X-CSRF-Token, etc.)
~~~

~~~
non-simple request flow:
  browser ─OPTIONS (preflight)──▶ server
     Origin: https://app.com
     Access-Control-Request-Method: PUT
     Access-Control-Request-Headers: content-type, authorization
  server ─200 + CORS headers──▶ browser
     Access-Control-Allow-Origin: https://app.com
     Access-Control-Allow-Methods: PUT, POST
     Access-Control-Allow-Headers: content-type, authorization
     Access-Control-Max-Age: 86400   (cache the preflight result)
  browser ─actual PUT request──▶ server   (only if preflight allowed it)
~~~

The most common real-world trigger: **sending JSON** (\`Content-Type: application/json\`) — because \`application/json\` is **not** in the simple-request Content-Type allowlist, a JSON POST/PUT/PATCH **always preflights**. Adding an \`Authorization\` or any custom header also triggers it. So almost every modern API call (JSON + auth header) preflights.

Why it exists: the preflight lets the server **approve potentially dangerous cross-origin requests before they execute** (a PUT/DELETE or a request with custom headers could have side effects). The browser checks permission first.

**Performance note (and a senior optimization):** preflights add a round-trip. Use **\`Access-Control-Max-Age\`** so the browser **caches** the preflight result and skips it for subsequent identical requests for that duration — important for chatty cross-origin APIs.

Why it matters: knowing **exactly what triggers a preflight (esp. JSON Content-Type and custom headers)** and how to mitigate it (\`Max-Age\` caching) is practical CORS knowledge that comes up constantly in API integration. Production angle: the news frontend's JSON API calls to \`api.example.com\` with an Authorization header always preflight; the API responds to OPTIONS with the allow-headers and a long \`Access-Control-Max-Age\` to cache preflights and cut latency. Follow-up: "How avoid preflight?" Use a simple request (form-encoded, no custom headers) — usually not worth contorting; prefer \`Max-Age\` caching. "Does preflight send cookies?" No — OPTIONS preflight doesn't carry credentials; the actual request does (if \`credentials\` is set and allowed). "Why does adding Authorization trigger it?" It's a custom (non-safelisted) header.`,
        },
        {
          q: "What is the risk of setting Access-Control-Allow-Origin: * on an authenticated API?",
          answer: `Setting **\`Access-Control-Allow-Origin: *\`** (wildcard) on an API means **any website** can make cross-origin requests to it and **read the responses**. For a **public, unauthenticated** API that's fine. For an **authenticated** API (responses contain user-specific/private data), it's dangerous because it can expose private data to any origin. There's also a hard browser rule that interacts with this.

**The browser rule (this is the key technical point):** you **cannot use \`Access-Control-Allow-Origin: *\` together with credentials**. If a request is made with \`credentials: 'include'\` (cookies/auth) **and** the server responds with \`Access-Control-Allow-Origin: *\` **and** \`Access-Control-Allow-Credentials: true\`, the browser **blocks** it — credentialed CORS **requires an explicit, specific origin**, not the wildcard:
~~~
credentialed request needs:
  Access-Control-Allow-Origin: https://app.example.com   (SPECIFIC origin, not *)
  Access-Control-Allow-Credentials: true
  -> '*' + credentials = browser BLOCKS the response (security rule)
~~~

**So the real risks:**
1. **The naive "fix" — reflecting the Origin to bypass the rule.** To make credentialed CORS work, some servers dynamically **echo back whatever \`Origin\` the request sent** plus \`Allow-Credentials: true\`. That's effectively a wildcard **with** credentials — **any** origin (including \`evil.com\`) is allowed, and since the user's cookies are sent automatically, **evil.com can read the user's private authenticated data**. This is a serious data-exfiltration vulnerability (CORS misconfiguration is a common real-world bug).
~~~
// ❌ DANGEROUS: reflect any origin + allow credentials
res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
res.setHeader('Access-Control-Allow-Credentials', 'true');
// evil.com fetch('api', {credentials:'include'}) -> reads victim's private data
~~~
2. **Even without credentials**, \`*\` on an API that returns sensitive data reachable by IP/network position (e.g. internal APIs, or data keyed off the requester's network) can leak — wildcard means *anyone* can read it.

**The correct configuration:** maintain an **allowlist of trusted origins** and only reflect an origin **if it's on the list**; set \`Allow-Credentials: true\` only for those; never use \`*\` for authenticated/private APIs:
~~~js
const allowed = new Set(['https://nbt.example.com', 'https://mt.example.com']);
const origin = req.headers.origin;
if (allowed.has(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);   // specific, validated
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');                        // correct caching per origin
}
~~~

~~~
public API, no creds:    Access-Control-Allow-Origin: *        (acceptable)
authenticated/private:   allowlist + specific Origin + Allow-Credentials  (never *, never reflect-any)
~~~

Why it matters: CORS misconfiguration (\`*\` with credentials, or reflecting any origin) is a well-known vulnerability class that leaks authenticated user data cross-origin; the senior answer states the **browser rule (\`*\` + credentials is blocked)**, the **dangerous workaround (reflect-any-origin)**, and the **correct allowlist pattern with \`Vary: Origin\`**. Production angle: cross-subdomain API calls (nbt/mht/et -> api.example.com) use an **allowlist** of the trusted property origins with \`Allow-Credentials: true\` and \`Vary: Origin\`, never \`*\`, so private/authenticated responses are never readable by arbitrary sites. Follow-up: "Why \`Vary: Origin\`?" The response varies per allowed origin — caches must key on it or they'd serve the wrong ACAO. "Is \`*\` ever OK?" Yes for truly public, non-credentialed, non-sensitive APIs. "CORS isn't auth, right?" Correct — CORS controls *browser reading* of responses; it's not server-side authorization. Don't rely on CORS as access control.`,
        },
      ],
      tip: "Preflight = OPTIONS request sent automatically by browser for non-simple requests (POST with JSON, custom headers).",
      rajnishAngle:
        "API calls from NBT frontend to Times Internet backend APIs — CORS config across subdomains.",
    },
    {
      title: "Dependency & Supply Chain Security",
      subtopics: [
        "npm audit",
        "Lockfile importance",
        "Subresource Integrity (SRI)",
        "Typosquatting",
        "SAST tools",
      ],
      questions: [
        {
          q: "What does npm audit check and what are its limitations?",
          answer: `**\`npm audit\`** scans your project's dependency tree (from the lockfile) against a **registry of known vulnerabilities** (the GitHub Advisory Database / npm advisory data) and reports vulnerable packages, the severity, the dependency path, and whether a fix is available. \`npm audit fix\` attempts to auto-upgrade to non-vulnerable versions within your semver ranges.

~~~bash
npm audit                 # report known vulns in the dep tree
npm audit --production    # only runtime deps (ignore devDependencies)
npm audit fix             # auto-upgrade within semver ranges
npm audit fix --force     # upgrade across major versions (can break things)
npm audit --audit-level=high  # fail CI only on high/critical (for pipelines)
~~~

~~~
audit checks: installed versions (lockfile) ─vs─ known-vuln advisories
  reports: package, severity (low/moderate/high/critical), path, fixed-in version
~~~

**Limitations (the important, senior part — \`npm audit\` is necessary but far from sufficient):**
1. **Only catches *known, published* vulnerabilities** — a vuln not yet reported/disclosed (zero-days, or simply un-cataloged) won't show. Absence of audit findings ≠ secure.
2. **No detection of malicious packages** — \`npm audit\` checks *known CVEs*, not **supply-chain attacks**: a **typosquatted** package, a **compromised/hijacked** maintainer publishing malware, or a **protestware** payload won't be flagged until/unless it's reported. This is a major modern threat it doesn't cover.
3. **Noisy / false-positives** — it flags vulns in **devDependencies** or in code paths you never execute (e.g. a vuln in a build tool's transitive dep that can't be exploited at runtime). High counts can be mostly non-exploitable -> alert fatigue. Use \`--production\` and judgment.
4. **No fix available / transitive lock-in** — sometimes the vulnerable version is pinned deep in a transitive dep with no compatible fix, so \`audit fix\` can't resolve it (you may need \`overrides\`/\`resolutions\` or to wait for upstream).
5. **\`audit fix --force\` can break things** — it may bump majors, introducing breaking changes; not safe to run blindly.
6. **Doesn't assess exploitability** — it reports a CVE exists, not whether *your usage* is actually exploitable.

**What to pair it with (defense-in-depth):**
- **Lockfile committed** (\`package-lock.json\`) — pins exact transitive versions for reproducible, audited installs.
- **Automated dependency updates + alerts** — **Dependabot/Renovate** (PRs for updates), **Snyk/Socket.dev** (which also detect *malicious*/supply-chain behavior, not just CVEs).
- **CI gate** — \`npm audit --audit-level=high\` (or Snyk) in the pipeline to fail on serious issues.
- **SRI** for CDN scripts, **provenance/signed packages**, minimal dependencies, and review of new deps (typosquatting check).

~~~
npm audit  = known CVEs only  (no malicious-package / zero-day detection)
  -> augment with: Snyk/Socket (supply-chain), Dependabot/Renovate (updates),
                   lockfile, CI gate, SRI, dependency review
~~~

Why it matters: candidates often treat \`npm audit\` as "the" security check; the senior view is that it's a **baseline for known CVEs** with real blind spots (malicious packages, zero-days, noise), requiring a broader supply-chain strategy. Production angle: \`npm audit --audit-level=high\` in CI plus Dependabot PRs and Snyk across the Times Internet packages — with committed lockfiles — and manual review of new/unfamiliar dependencies to catch typosquats. Follow-up: "Why isn't audit enough?" Misses malicious/zero-day packages and over-reports unexploitable dev-dep vulns. "How catch malicious packages?" Tools like Socket.dev analyze package *behavior* (install scripts, network/fs access), not just CVE lists. "Transitive vuln with no fix?" Use \`overrides\` to force a patched version, or accept/mitigate until upstream fixes.`,
        },
        {
          q: "What is Subresource Integrity and when would you use it?",
          answer: `**Subresource Integrity (SRI)** is a browser security feature that lets you ensure a **third-party resource (script/stylesheet) hasn't been tampered with**. You add an **\`integrity\`** attribute containing a **cryptographic hash** of the expected file contents; the browser fetches the resource, hashes it, and **only executes/applies it if the hash matches** — otherwise it **refuses to load it**. This protects against a **compromised CDN** or a man-in-the-middle swapping the file.

~~~html
<script
  src="https://cdn.example.com/lib@1.2.3/lib.min.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous"></script>

<link rel="stylesheet" href="https://cdn.example.com/styles.css"
  integrity="sha384-..." crossorigin="anonymous">
~~~

~~~
browser fetches the file ─▶ computes its SHA hash ─▶ compares to integrity attr
  match    -> execute/apply  ✓
  mismatch -> REFUSE to load (the file was altered/swapped) ✗
~~~

How/why it works: the hash (SHA-256/384/512) is a fingerprint of the **exact expected bytes**. If the CDN is compromised and serves a **modified** (malicious) version of the library, its hash won't match your \`integrity\` value, so the browser **blocks** it — preventing the injected code from running. \`crossorigin="anonymous"\` is required so the browser can read the cross-origin response to hash it (and the CDN must send permissive CORS).

**When to use it:** loading **third-party resources from a CDN you don't control** — popular library CDNs (jsDelivr, unpkg, cdnjs), shared script hosts, any externally-hosted JS/CSS where a CDN compromise or MITM could inject malicious code. It's a key **supply-chain** mitigation for externally-hosted assets.

**Limitations / caveats (be balanced):**
- **The resource must be immutable** — SRI works only for **versioned/pinned** files. If the third-party updates the file (same URL, new content), the hash breaks and the resource **stops loading** (which is actually the point — but it means you can't use SRI on auto-updating "latest" URLs).
- **You must update the hash** whenever you intentionally upgrade the dependency (automate it in the build).
- It protects **integrity**, not the *original* author's intent — if you pin a hash of an already-malicious file, SRI happily loads it. It guards against **tampering after you verified it**, not against a bad package to begin with.
- Mostly relevant for **CDN-hosted** assets; for self-hosted bundles with content-hashed filenames you already get integrity via the URL (and you control the origin).

~~~
use SRI when:  loading PINNED third-party JS/CSS from a CDN you don't control
  -> guards against CDN compromise / MITM swapping the file
not for:       auto-updating "latest" URLs (hash would break on every update)
~~~

Why it matters: SRI is a concrete browser-level supply-chain defense for third-party assets; knowing it requires **pinned/immutable** resources and \`crossorigin\`, and that it protects **integrity not provenance**, shows real security depth. Production angle: any externally-CDN-hosted library on the news site (rare if self-bundling, but applicable for shared/third-party widgets) carries an \`integrity\` hash so a CDN compromise can't inject code; automate hash generation in the build. Follow-up: "Why crossorigin=anonymous?" The browser needs CORS access to read and hash the cross-origin response. "Downside?" Breaks if the file changes (must use pinned versions + update the hash on upgrade). "Self-hosted assets?" Content-hashed filenames + same-origin already give integrity; SRI is mainly for third-party CDNs.`,
        },
        {
          q: "What is a supply chain attack in the context of npm packages?",
          answer: `A **supply-chain attack** compromises your application **indirectly, through its dependencies** rather than attacking your code directly. Since a typical app pulls in **hundreds-to-thousands of transitive npm packages** maintained by strangers, an attacker who poisons **one** of them gets their code running in **every** app that installs it (and in CI/build environments). It's high-leverage: compromise one popular package -> infect thousands of downstream projects.

**Common npm supply-chain attack vectors:**
~~~
1. Typosquatting     — publish 'reactdom', 'crossenv', 'lodahs' hoping for a typo'd install
2. Account takeover  — hijack a popular maintainer's npm account (weak/leaked creds, no 2FA)
                       and publish a malicious version
3. Maintainer turns malicious / sells the package — new owner injects malware (e.g. event-stream)
4. Malicious install scripts — postinstall hooks that run arbitrary code on 'npm install'
                       (steal env vars/SSH keys/tokens, especially in CI)
5. Dependency confusion — publish a public package with the SAME name as your private internal
                       one + higher version; the resolver pulls the attacker's public one
6. Protestware       — maintainer adds destructive/political payload to their own package
~~~

~~~
attacker poisons ONE popular dep ─▶ npm install pulls it (transitively)
  ─▶ malicious postinstall / runtime code runs in thousands of apps + their CI
  ─▶ steals secrets/tokens, injects backdoors, exfiltrates data
~~~

Real examples to cite: **event-stream** (a maintainer handed off the package; the new owner added code to steal crypto wallet keys), **ua-parser-js / coa / rc** (account-takeover, malicious versions published), and recurring **typosquat** campaigns. These show the threat is real and ongoing.

**Defenses (defense-in-depth — name several):**
- **Commit the lockfile** and use \`npm ci\` (installs exact locked versions; reproducible, no surprise upgrades).
- **Pin / review versions**; be wary of **auto-updating** to new majors blindly.
- **2FA on your own npm/registry accounts**; least-privilege publish tokens.
- **\`npm audit\` + Snyk/Socket.dev** — Socket specifically analyzes package **behavior** (install scripts, network/fs/process access, obfuscation) to catch *malicious* (not just CVE'd) packages.
- **Disable/scrutinize install scripts** in CI (\`npm ci --ignore-scripts\` where feasible) — postinstall is a top exfiltration vector.
- **Dependency-confusion defenses**: scope internal packages (\`@org/...\`), configure the registry so internal names can't be shadowed by public ones, and verify package provenance.
- **Minimize dependencies** (fewer packages = smaller attack surface), review new deps, prefer well-maintained ones.
- **SBOM / provenance** (npm provenance, Sigstore) and isolating CI secrets.

~~~
mitigate:  lockfile + npm ci  +  2FA  +  Snyk/Socket (behavioral)  +  scoped internal pkgs
           +  cautious install scripts in CI  +  minimal/reviewed deps  +  provenance
~~~

Why it matters: the dependency tree is the largest, least-controlled part of a modern app's attack surface; understanding the **vectors (typosquat, takeover, malicious install scripts, dependency confusion)** and the **layered defenses** is essential senior security knowledge — especially for teams managing many packages and CI pipelines with secrets. Production angle: across the Times Internet packages — committed lockfiles + \`npm ci\`, Dependabot/Snyk in CI, scoped \`@org\` internal packages to prevent dependency confusion, 2FA on publish, and minimizing/reviewing new dependencies. Follow-up: "Most insidious vector?" Account takeover / maintainer-gone-bad on a popular package (legit name, trusted) and malicious **postinstall** scripts exfiltrating CI secrets. "How catch it when \`npm audit\` can't?" Behavioral analysis (Socket.dev) + install-script scrutiny + provenance, since it's not a known CVE. "Dependency confusion fix?" Scope internal packages and lock the registry resolution so public names can't shadow private ones.`,
        },
      ],
      tip: "Always commit package-lock.json. It pins exact transitive dependency versions and prevents silent upgrades.",
      rajnishAngle:
        "Managing dozens of npm dependencies across Times Internet packages — audit as part of CI pipeline.",
    },
    {
      title: "Sensitive Data & Privacy",
      subtopics: [
        "PII in frontend",
        "Source map exposure",
        "Error message leakage",
        "Analytics data hygiene",
        "GDPR basics for frontend",
      ],
      questions: [
        {
          q: "What are the risks of exposing source maps in production?",
          answer: `**Source maps** (\`.map\` files) map your **minified/transpiled** production bundle back to the **original, readable source** (with comments, variable names, file structure). They're invaluable for debugging, but if **publicly accessible in production**, they let anyone **reverse-engineer your entire frontend codebase** — undoing minification.

~~~
production bundle:  main.4f3a.js   (minified: function a(b){return b*2})
source map:         main.4f3a.js.map
  -> reconstructs: function calculatePrice(amount) { return amount * TAX_RATE }
     + original file names, folder structure, comments
~~~

**Risks of public source maps:**
1. **Full source disclosure** — your original code, logic, and architecture are readable. Loss of IP and a roadmap for attackers to find weaknesses.
2. **Leaked secrets/keys** — developers sometimes accidentally embed API keys, internal endpoints, tokens, or credentials in code; minification *obscures* them, but the source map **reveals** them in clear, searchable form. (The real fix is not embedding secrets client-side at all — but maps make accidental leaks trivially exploitable.)
3. **Exposed internal logic** — business rules, feature flags, hidden/admin endpoints, validation logic (which an attacker can then bypass), anti-abuse heuristics, and pricing/algorithm details become visible.
4. **Easier exploit development** — readable code + comments make finding and exploiting client-side vulnerabilities far easier than against minified code.

**The standard mitigation — generate maps but don't serve them publicly:**
- **Upload source maps to your error-tracking service (Sentry) privately**, and **don't deploy them to the public web server** (or restrict access). Sentry uses them to de-minify stack traces server-side; users never see them.
- Or **delete \`.map\` files** from the production build output, or serve them only to authenticated/internal IPs, or use \`hidden-source-map\` (generates maps + references them only for the uploader, not via a public \`//# sourceMappingURL\` comment).

~~~
✅ build maps -> upload to Sentry (private) -> remove/block public .map serving
   (you get readable stack traces in Sentry WITHOUT exposing source to the public)
❌ deploy .map next to .js on the public CDN -> anyone can de-minify your app
~~~

In Next.js: \`productionBrowserSourceMaps\` is **off by default** for this reason; the Sentry Next.js SDK uploads maps during the build and you keep them out of the public output. Webpack: use \`hidden-source-map\` + upload step.

~~~
golden rule: generate source maps for YOUR observability,
             but never expose them to the public internet
~~~

Why it matters: it's a common, easily-overlooked information-disclosure issue; the senior answer is "**keep maps for Sentry/debugging but don't serve them publicly**," plus the deeper point that **secrets should never be in client code** regardless (maps just make accidental leaks worse). Production angle: Sentry on the news properties uploads source maps during CI (so production stack traces are de-minified for the team) while the public build excludes/blocks \`.map\` files — readable diagnostics internally, opaque bundle externally. Follow-up: "But you still want stack traces?" Yes — upload maps privately to Sentry; you get de-minified traces without public exposure. "What if a secret is in the bundle?" The real fix is to remove it from client code (use server-side/env) — minification/maps are not a security boundary. "hidden-source-map?" Generates the map and uploads it but omits the public \`sourceMappingURL\` reference, so browsers don't fetch it.`,
        },
        {
          q: "How do you ensure PII is not accidentally sent to analytics or error tracking?",
          answer: `**PII (Personally Identifiable Information)** — names, emails, phone numbers, addresses, government IDs, precise location, and sometimes user IDs — must not leak into **analytics** (GA, dataLayer) or **error tracking** (Sentry), where it's stored on third-party servers, possibly indexed, and creates **GDPR/DPDP/CCPA liability** and breach exposure. The strategy: **minimize, scrub/redact, configure tools to not capture it, and govern with review.**

**Where PII commonly leaks (know the vectors):**
~~~
- URLs / query params (?email=, ?token=, /user/john@x.com) captured by analytics & breadcrumbs
- Form field values captured in session replay / error context
- Error messages / stack traces containing user data (e.g. "failed for user john@x.com")
- Breadcrumbs & network bodies in Sentry (request/response payloads with PII)
- console.log of user objects that the SDK captures
- Setting user.email as the analytics/Sentry user identifier
~~~

**Defenses:**
1. **Scrub before sending — use the SDK's hooks.** Sentry's **\`beforeSend\`** lets you redact PII from every event (clear emails, mask fields, drop sensitive breadcrumbs/request bodies):
~~~js
Sentry.init({
  beforeSend(event) {
    // strip PII from user, request data, messages
    if (event.user) { delete event.user.email; delete event.user.ip_address; }
    event.request?.headers && delete event.request.headers['Authorization'];
    event.message = redact(event.message);   // mask emails/phones via regex
    return event;
  },
  sendDefaultPii: false,   // don't auto-attach IP/cookies
});
~~~
2. **Configure tools to not capture by default** — disable IP collection, **mask all inputs in session replay** (Sentry/FullStory mask text/inputs by default or via config), don't send request/response bodies, use **GA IP anonymization** and avoid PII in event params/custom dimensions (Google policy *prohibits* sending PII to GA).
3. **Don't put PII in URLs/identifiers** — use **opaque/pseudonymous IDs** (a hashed/random user id) as the analytics/Sentry user key, never the email. Keep PII out of query strings and route params.
4. **Sanitize errors** — don't interpolate user data into error messages; log a reference/ID instead. Redact tokens/keys from logs.
5. **Governance** — a **data-classification + review** process, PII-scrubbing as a shared util, periodic audits of what's actually being sent, and **consent gating** (don't load analytics until the user consents — GDPR/DPDP).
6. **Block at the boundary** — allowlist what fields/params get sent rather than blocklisting (allowlist is safer — you won't forget a new PII field).

~~~
strategy:  minimize (don't collect what you don't need)
        -> redact (beforeSend / masking / regex scrub)
        -> pseudonymize (opaque IDs, not email)
        -> configure tools (no IP, mask inputs, no bodies)
        -> govern (review, audits, consent gating)
~~~

Why it matters: leaking PII to third-party analytics/error tools is a frequent, serious privacy/compliance failure; the senior answer covers the **leak vectors** and a **layered scrub-minimize-pseudonymize-configure-govern** approach (not just "be careful"). Production angle: on the news properties — Sentry \`beforeSend\` redaction + \`sendDefaultPii:false\` + session-replay input masking, GA without PII in event params, opaque user IDs, consent-gated analytics loading (DPDP/GDPR), and a PII-scrubbing review in code review. Follow-up: "Allowlist vs blocklist fields?" Allowlist — safer against forgetting a new PII field. "GA + PII?" Against Google's policy and illegal under GDPR without basis — never send emails/PII; use anonymized IDs. "Consent?" Don't fire analytics until consent is given (cookie banner) for GDPR/DPDP.`,
        },
        {
          q: "How does GDPR affect cookie consent implementation on a news site?",
          answer: `**GDPR** (and India's **DPDP Act**, EU **ePrivacy**, CCPA) requires that **non-essential cookies/trackers** — analytics, advertising, personalization, social — are only set **after the user gives informed, explicit, opt-in consent**. For an **ad-funded news site** (lots of analytics + ad/tracking scripts), this fundamentally shapes how and *when* you load those scripts.

**Core GDPR requirements for cookie consent:**
~~~
- Opt-IN, not opt-out: no non-essential cookies/trackers BEFORE consent
  (pre-ticked boxes / "by using the site you agree" banners are NOT valid)
- Granular: separate consent per purpose (analytics, ads, personalization)
- Easy to refuse as to accept: a "Reject all" must be as prominent as "Accept all"
- Informed: clear info on what each category does, who gets the data
- Withdrawable: user can change/withdraw consent later, as easily as they gave it
- Essential cookies (session, security, load-balancing, consent state) are EXEMPT
  (needed for the site to function) and may be set without consent
~~~

**What this means for the frontend implementation:**
1. **Block trackers until consent.** Analytics (GA/GTM), ad scripts (GAM/Taboola), and personalization must **not load or set cookies** on first visit. You **gate** them behind the consent state — only inject/enable them after the user opts into the relevant category.
~~~js
// only load analytics AFTER consent
if (consent.analytics) loadGtm();
if (consent.ads) loadAdScripts();
// GTM "Consent Mode" / a CMP signals consent state to tags
~~~
2. **A Consent Management Platform (CMP)** — most news sites use an **IAB TCF-compliant CMP** (OneTrust, Sourcepoint, Quantcast) because **programmatic advertising** requires passing the **TCF consent string** to ad/SSP partners; ad demand legally depends on it. The CMP renders the banner, stores granular consent, and exposes the consent signal to tags (e.g. **Google Consent Mode**).
3. **Consent state is itself stored** (a first-party, essential cookie/localStorage) so you remember the choice and don't re-prompt — and can honor withdrawal.
4. **Default-deny + Consent Mode** — with Google **Consent Mode**, tags load but **adjust behavior** based on consent (e.g. no analytics cookies / cookieless pings until granted), rather than firing fully.

**Performance/UX interplay (the senior nuance):** gating tons of ad/analytics scripts behind consent actually **helps CWV on first load** (fewer scripts before interaction) — but the **consent banner itself** must not cause **CLS** (don't push content — overlay it) or block rendering, and must be **accessible** (keyboard, focus, screen-reader). The banner is high-visibility, so its performance/a11y matter.

~~~
first visit:  load ONLY essential cookies + the CMP banner (overlay, no CLS)
user accepts analytics+ads ─▶ inject GTM/GA + ad scripts, set their cookies
user rejects ─▶ keep them blocked; store the choice; site still works
later ─▶ user can reopen the CMP to change/withdraw consent
~~~

Why it matters: for an ad-funded news site, consent is both a **legal requirement** and an **architecture constraint** — it dictates that tracking scripts load conditionally, requires a TCF CMP for ad monetization, and intersects with **CWV/a11y** (the banner) and **data hygiene** (don't send PII, honor consent). Knowing **opt-in/granular/withdrawable + essential-exempt + CMP/Consent Mode** shows you operate this in production. Production angle: NBT/Maharashtra Times use an IAB TCF CMP gating GTM/GA + Google Ad Manager/Taboola behind granular consent (DPDP/GDPR), with the consent string passed to ad partners, an overlay banner that doesn't cause CLS, and analytics fully blocked until opt-in. Follow-up: "Are pre-ticked/implied-consent banners ok?" No — GDPR requires explicit opt-in; "continuing to browse = consent" is invalid. "Essential cookies?" Session/security/consent-state cookies are exempt and may be set without consent. "Why a TCF CMP specifically?" Programmatic ad partners require the TCF consent string to serve targeted ads lawfully.`,
        },
      ],
      tip: "Upload source maps to Sentry but block public access. Never log user IDs, emails, or tokens to the console in production.",
      rajnishAngle:
        "Cookie consent banner on NBT — GDPR/DPDP Act compliance, blocking analytics until consent given.",
    },
  ],
};
