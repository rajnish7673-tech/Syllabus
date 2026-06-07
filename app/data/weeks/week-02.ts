import type { Week } from "../types";

export const week02: Week = {
  week: 2,
  theme: "Promises, Async/Await & API Handling",
  color: "#FBBF24",
  topics: [
    {
      title: "Callbacks & Callback Hell",
      subtopics: [
        "Callback pattern",
        "Error-first callbacks",
        "Inversion of control problem",
        "Callback hell / pyramid of doom",
        "Why Promises were introduced",
      ],
      questions: [
        {
          q: "What is a callback? What problem does it solve?",
          answer: `A callback is a function you pass to another function to be invoked later — typically when an async operation completes or an event fires. Because JS is single-threaded and non-blocking, callbacks are the primitive that lets long-running work (I/O, timers, network) run without freezing the main thread; the engine "calls you back" when the result is ready.

~~~js
// Async: the callback runs later, off the main thread's current task
setTimeout(() => console.log("done"), 1000);
fs.readFile("a.txt", (err, data) => { /* runs when I/O finishes */ });

// Sync callbacks also exist (map/filter run immediately)
[1, 2, 3].map((n) => n * 2);
~~~

The problem it solves: without callbacks you'd have to block-and-wait for I/O (terrible for a UI thread) or poll. Callbacks let you register "what to do when the result arrives" and let the event loop schedule it.

The "why it's limited": callbacks don't compose well. They have no first-class value to pass around, no built-in error channel, and chaining them creates nesting (callback hell) plus the inversion-of-control trust problem. That's exactly what Promises were created to fix.

Follow-up: "sync vs async callback" — \`Array.map\`'s callback is synchronous; \`setTimeout\`'s is async. Knowing which determines execution order.`,
        },
        {
          q: "What is callback hell and why is it a problem?",
          answer: `Callback hell (the "pyramid of doom") is deeply nested callbacks created when multiple async steps depend on each other. Each step nests inside the previous one's callback, so code drifts rightward and becomes hard to read, error-handle, and maintain.

~~~js
getUser(id, (err, user) => {
  if (err) return handle(err);
  getOrders(user, (err, orders) => {
    if (err) return handle(err);
    getDetails(orders, (err, details) => {
      if (err) return handle(err);
      render(details);            // 3 levels deep, error check repeated each time
    });
  });
});
~~~

Why it's a problem (say all of these):
1. Readability — logic flows diagonally; hard to follow top-to-bottom.
2. Error handling — you must repeat \`if (err)\` at every level; easy to forget one.
3. No composition — can't easily run steps in parallel or reuse pieces.
4. Inversion of control — you hand your continuation to a third-party function and trust it to call back exactly once, with correct args (see next question).

The fix: Promises flatten the pyramid into a linear chain with a single error channel:
~~~js
getUser(id)
  .then(getOrders)
  .then(getDetails)
  .then(render)
  .catch(handle);   // one place handles all errors
~~~

async/await flattens it further into synchronous-looking code. Production angle: legacy analytics event-tracking code with chained callbacks rewritten as promise chains — easier to read and to add retry/error handling in one place.`,
        },
        {
          q: "What is inversion of control and how do Promises fix it?",
          answer: `Inversion of control (IoC) in async code: when you pass a callback to a function, you give up control of *your* program's continuation to *that* function. You're trusting it to call your callback — exactly once, at the right time, with the right arguments, and not swallow errors. With third-party code you can't guarantee any of that.

The trust problems with a raw callback:
~~~
Will it call my callback...
  - at all?            (maybe it errors silently)
  - too many times?    (double-charge a payment!)
  - too few times?
  - synchronously when you expected async (Zalgo)?
  - with the right args / error shape?
~~~

~~~js
// You hand your continuation to someone else's code:
thirdPartyCheckout(order, function onDone(result) {
  chargeCard(result); // if they call this twice, you double-charge
});
~~~

How Promises fix it: a Promise inverts control *back* to you. Instead of giving your callback away, the async function returns a Promise *to you*, and *you* attach \`.then\`. The Promise machinery guarantees:
- A promise settles **once** and only once (immutable after settling) — no double-calls.
- It's **always async** — \`.then\` callbacks always run on a future microtask, never synchronously, so no Zalgo (consistent timing).
- A dedicated **error channel** — rejections propagate to \`.catch\`; you can't accidentally lose them.

~~~js
checkout(order)        // returns a promise — you keep control
  .then(charge)        // guaranteed at most once
  .catch(handle);
~~~

The "why it matters": this guarantee is what makes promise-based APIs trustworthy and composable. Follow-up: "What is Zalgo / 'releasing Zalgo'?" — an API that's sometimes sync, sometimes async; promises eliminate it by always deferring.`,
        },
        {
          q: "Write a readFile using error-first callback style.",
          answer: `Error-first (Node-style) callbacks follow a convention: the callback's FIRST parameter is the error (or \`null\` if success), and subsequent parameters are the result data. This standardizes error handling across all Node async APIs.

~~~js
const fs = require("fs");

// Consuming an error-first callback:
fs.readFile("config.json", "utf8", (err, data) => {
  if (err) {
    // ALWAYS handle the error branch first and return
    console.error("read failed:", err);
    return;
  }
  console.log("contents:", data);
});
~~~

Writing your OWN error-first function:
~~~js
function readConfig(path, callback) {
  fs.readFile(path, "utf8", (err, data) => {
    if (err) return callback(err);        // err first, no data
    try {
      const parsed = JSON.parse(data);
      callback(null, parsed);             // null error, then result
    } catch (e) {
      callback(e);                        // parse failure -> error channel
    }
  });
}
~~~

Rules of the convention (mention these):
- \`callback(err)\` on failure, \`callback(null, result)\` on success.
- Call the callback exactly once.
- Don't \`throw\` inside async code — pass the error to the callback instead (a throw won't be caught by the caller's try/catch across the async boundary).

Bridging to Promises — \`util.promisify\` turns error-first callbacks into promise-returning functions:
~~~js
const { promisify } = require("util");
const readFileP = promisify(fs.readFile);
const data = await readFileP("config.json", "utf8"); // modern usage
~~~

Follow-up: "Why not throw?" Because the throw happens in a *different* call stack (the I/O callback), so the caller's try/catch can't catch it — that's the whole reason for the error-first param.`,
        },
      ],
      tip: "Interviewers ask this to test if you understand WHY Promises exist, not just HOW to use them.",
      rajnishAngle:
        "Old analytics event tracking code at Times Internet — chained callbacks replaced with Promises.",
    },
    {
      title: "Promises — Deep Dive",
      subtopics: [
        "Promise states (pending/fulfilled/rejected)",
        "Promise chaining (.then/.catch/.finally)",
        "Promise constructor",
        "Microtask queue",
        "Returning vs resolving a Promise",
      ],
      questions: [
        {
          q: "What are the three states of a Promise?",
          answer: `A Promise is a state machine with exactly three states, and the transition is one-way and permanent (a promise is "settled" once it leaves pending — it can never change again).

~~~
            ┌─────────────┐
            │   PENDING   │  (initial, unsettled)
            └──────┬──────┘
          resolve()│ reject()
        ┌──────────┴──────────┐
        ▼                     ▼
  ┌───────────┐        ┌───────────┐
  │ FULFILLED │        │ REJECTED  │   <- both are "settled", immutable
  │  (value)  │        │ (reason)  │
  └───────────┘        └───────────┘
~~~

- **Pending** — created, not yet resolved or rejected.
- **Fulfilled** — \`resolve(value)\` was called; has a value.
- **Rejected** — \`reject(reason)\` was called or an error threw; has a reason.

Key invariants (the "why"):
- Settlement is **immutable** — calling resolve/reject again is a no-op. This is what fixes the "called multiple times" callback problem.
- \`.then(onFulfilled, onRejected)\` / \`.catch\` / \`.finally\` register reactions; they always fire **asynchronously** on the microtask queue, even if the promise is already settled.
- There's a fourth informal concept: "settled" = fulfilled or rejected (not pending).

~~~js
const p = new Promise((resolve, reject) => {
  resolve("ok");
  reject("ignored");   // no-op — already settled
});
p.then(console.log);   // "ok"
~~~

Follow-up: "Can you read a promise's state synchronously?" No standard API — you observe it via \`.then/.catch\`. "Pending forever?" Yes — if you never call resolve/reject, it stays pending and its \`.then\` never fires (a potential leak / hang).`,
        },
        {
          q: "What is the difference between returning a value and returning a Promise inside .then()?",
          answer: `Whatever you return from a \`.then\` handler becomes the input to the NEXT \`.then\`. The engine *unwraps* (assimilates) the return value:
- Return a **plain value** -> it's wrapped in a resolved promise; the next \`.then\` gets that value immediately (next microtask).
- Return a **Promise** -> the chain *waits* for that promise to settle, then passes its resolved value (or routes its rejection to \`.catch\`). This is "flattening" — you never get a Promise-of-a-Promise.

~~~js
Promise.resolve(1)
  .then((x) => x + 1)              // return value -> next gets 2
  .then((x) => Promise.resolve(x * 10)) // return promise -> chain waits, next gets 20
  .then((x) => { throw new Error("boom"); }) // throw -> routes to catch
  .then((x) => console.log("skipped"))
  .catch((e) => console.log("caught:", e.message)); // "caught: boom"
~~~

~~~
return value   :  .then ──▶ wrap(value) ──▶ next .then (fast)
return promise :  .then ──▶ WAIT for it ──▶ next .then with its value
throw          :  .then ──▶ rejected ──────▶ nearest .catch
~~~

Why it matters: this is exactly what lets you do sequential async steps cleanly — return the next async call from \`.then\` and the chain serializes automatically. The classic bug is *forgetting to return*:
~~~js
getUser()
  .then((u) => { fetchOrders(u); })   // BUG: no return -> chain doesn't wait
  .then((orders) => render(orders));  // orders is undefined!
// fix: return fetchOrders(u);
~~~

Follow-up: "What if you return a thenable (non-Promise object with a .then)?" The chain still waits — it assimilates any thenable, which is how interop with other promise libs works.`,
        },
        {
          q: "What does .finally() do and when is it useful?",
          answer: `\`.finally(cb)\` runs its callback when the promise settles — *regardless* of fulfilled or rejected — and, crucially, it's **transparent to the chain**: it doesn't receive the value/reason and doesn't change them (it passes them through unchanged). It's the promise analogue of \`try/finally\`.

~~~js
setLoading(true);
fetchData()
  .then((data) => render(data))
  .catch((err) => showError(err))
  .finally(() => setLoading(false)); // runs on success AND failure
~~~

Key behaviours (the subtle parts interviewers test):
- The callback takes **no arguments** — it can't see the value or error.
- It **passes through** the original outcome:
~~~js
Promise.resolve(42)
  .finally(() => "ignored")   // return value discarded
  .then((v) => console.log(v)); // still 42
~~~
- BUT if \`.finally\` itself **throws** or returns a **rejecting** promise, that DOES override the outcome (the chain then rejects with the new error). So keep finally side-effect-only.

When it's useful: cleanup that must happen on both paths — hide spinners, close connections, release locks, re-enable a button, stop a timer. Without it you'd duplicate the cleanup in both \`.then\` and \`.catch\`.

~~~js
async function withSpinner(fn) {
  show();
  try { return await fn(); }
  finally { hide(); }   // async/await equivalent — same semantics
}
~~~

Follow-up: "Does finally run if the promise stays pending?" No — it runs on *settle*. "Difference from a trailing .then?" A \`.then\` only runs on fulfillment and receives the value; \`.finally\` runs on both and is value-transparent.`,
        },
        {
          q: "What happens if you throw inside a .then() handler?",
          answer: `Throwing inside a \`.then\` handler causes the promise returned by that \`.then\` to **reject** with the thrown error. Control jumps to the nearest downstream \`.catch\` (or rejection handler), skipping any \`.then\`s in between. A \`throw\` in promise-land is equivalent to \`return Promise.reject(error)\`.

~~~js
Promise.resolve()
  .then(() => { throw new Error("boom"); })
  .then(() => console.log("A — skipped"))  // skipped: upstream rejected
  .catch((e) => console.log("caught:", e.message)) // "caught: boom"
  .then(() => console.log("B — runs"));    // chain recovers after catch
~~~

~~~
.then(throw) ──rejects──▶ skip .then ──▶ .catch handles ──▶ chain resumes (fulfilled)
~~~

Important nuances:
1. After a \`.catch\` handles the error (and doesn't re-throw), the chain returns to a **fulfilled** state — subsequent \`.then\`s run. \`.catch\` "recovers."
2. The error handler argument to \`.then(onF, onR)\` only catches rejections from **upstream**, NOT from its sibling \`onFulfilled\`. That's why \`.catch\` (which is \`.then(undefined, onR)\` placed *after*) is preferred — it catches errors from the handler before it too.
~~~js
// onR here does NOT catch an error thrown by onF:
p.then(onF, onR);          // risky
p.then(onF).catch(onR);    // safer — catches onF's throws too
~~~
3. An error thrown with **no** downstream \`.catch\` becomes an **unhandled promise rejection** (logged; \`window.onunhandledrejection\` fires).

Production angle: in a fetch chain, \`if (!res.ok) throw new Error(...)\` in a \`.then\` cleanly routes HTTP errors to a single \`.catch\` alongside network errors.`,
        },
        {
          q: "What is Promise chaining and how does it avoid callback hell?",
          answer: `Promise chaining is attaching a sequence of \`.then\` calls where each returns a new promise, so dependent async steps run in order as a flat, linear pipeline instead of nested callbacks. Each \`.then\` receives the previous step's resolved value; returning a promise makes the chain wait.

Callback hell (nested, rightward drift, repeated error checks):
~~~js
getUser(id, (e, u) => {
  if (e) return h(e);
  getOrders(u, (e, o) => {
    if (e) return h(e);
    getDetails(o, (e, d) => { if (e) return h(e); render(d); });
  });
});
~~~

Same logic chained (flat, single error channel):
~~~js
getUser(id)
  .then((u) => getOrders(u))     // return promise -> chain waits
  .then((o) => getDetails(o))
  .then((d) => render(d))
  .catch(h)                      // ONE catch for the whole pipeline
  .finally(() => stopSpinner());
~~~

~~~
callbacks:  →→ nest →→ nest →→ nest      (pyramid, N error checks)
chaining:   →→ then →→ then →→ then → catch   (flat, 1 error path)
~~~

How it avoids callback hell:
1. **Flattening** — \`.then\` returning a promise is auto-unwrapped, so no nesting.
2. **Single error channel** — one \`.catch\` handles any step's failure (vs repeating \`if (err)\`).
3. **Composability** — steps are values you can branch, run in parallel (\`Promise.all\`), reuse, or insert into.
4. **Guaranteed timing/once** — inherits promise guarantees (no double-calls, always async).

async/await is the final evolution — the same chain written as straight-line code with \`try/catch\`. Interviewers often ask you to refactor a nested-callback snippet into a chain, then into async/await; be ready to do all three.`,
        },
      ],
      tip: "If you return a Promise inside .then(), the chain waits for it to resolve. If you return a value, it wraps it automatically. Interviewers test this distinction.",
      rajnishAngle: "",
    },
    {
      title: "Promise Combinators",
      subtopics: [
        "Promise.all",
        "Promise.allSettled",
        "Promise.race",
        "Promise.any",
        "When to use each",
        "Parallel vs sequential execution",
      ],
      questions: [
        {
          q: "What is the difference between Promise.all and Promise.allSettled?",
          answer: `Both run promises concurrently; they differ in failure handling. \`Promise.all\` is **fail-fast** (rejects on the first rejection, losing all results). \`Promise.allSettled\` **never rejects** — it waits for every promise and returns a per-item outcome array.

~~~js
// all: all-or-nothing
try {
  const [a, b, c] = await Promise.all([fa(), fb(), fc()]);
} catch (e) { /* any one fails => lose a,b,c */ }

// allSettled: best-effort, partial success
const out = await Promise.allSettled([fa(), fb(), fc()]);
// [{status:'fulfilled',value}, {status:'rejected',reason}, ...]
const ok = out.filter((r) => r.status === "fulfilled").map((r) => r.value);
~~~

~~~
all        : [✓ ✓ ✗ ✓] -> REJECT immediately (discard successes)
allSettled : [✓ ✓ ✗ ✓] -> RESOLVE with [ok, ok, fail, ok]
~~~

Choose \`all\` when results are interdependent (need all to proceed); choose \`allSettled\` when items are independent and partial success is acceptable. Production: article body + related + ads in parallel -> \`allSettled\` so a failed ad call doesn't blank the page.

Follow-up: "Does all cancel the others on first failure?" No — JS promises aren't cancellable; the others keep running, their results are just ignored. Use \`AbortController\` if you need real cancellation.`,
        },
        {
          q: "What does Promise.race return and when would you use it?",
          answer: `\`Promise.race([...])\` settles as soon as the **first** input promise settles — whether it **fulfills or rejects** — and adopts that outcome. The remaining promises keep running but are ignored.

~~~js
const result = await Promise.race([
  fetch("/api/data"),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), 3000)
  ),
]);
// whichever finishes first wins: data, or the timeout rejection
~~~

~~~
race: [ A(slow) , B(fast✓) , C(slow) ] -> settles with B as soon as B settles
      first to settle wins, success OR failure
~~~

Primary use cases:
1. **Timeouts** — race a fetch against a rejecting timer (most common; shown above). Note: this doesn't *cancel* the fetch — pair with \`AbortController\` to actually abort it.
2. **First-response-wins** — query multiple mirrors/CDNs, take whichever responds first.
3. **Cancellation token** — race work against a "cancel" promise.

Gotcha: because race settles on the first *rejection* too, a fast-failing promise makes the whole race reject even if a slower one would have succeeded. If you want "first **success**, ignore failures," use \`Promise.any\` instead.

~~~js
function withTimeout(promise, ms) {
  let t;
  const timeout = new Promise((_, rej) => (t = setTimeout(() => rej(new Error("timeout")), ms)));
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}
~~~

Follow-up: "Empty array?" \`Promise.race([])\` stays forever pending. "race vs any?" race = first to *settle*; any = first to *fulfill*.`,
        },
        {
          q: "What is Promise.any and how does it differ from Promise.race?",
          answer: `\`Promise.any([...])\` resolves with the value of the **first promise to fulfill**, ignoring rejections. It only rejects if **all** inputs reject — and then it rejects with an \`AggregateError\` containing all the reasons. So \`any\` is "first **success** wins"; \`race\` is "first to **settle** (success or failure) wins."

~~~js
// any: first SUCCESS, tolerates failures
try {
  const fastest = await Promise.any([
    fetch("https://cdn1/asset"),
    fetch("https://cdn2/asset"),
    fetch("https://cdn3/asset"),
  ]);
  // resolves with the first CDN that succeeds, even if others fail
} catch (e) {
  // only here if ALL failed
  console.log(e instanceof AggregateError, e.errors); // [reason1, reason2, reason3]
}
~~~

~~~
race: [✗(fast) ✓ ✓] -> REJECTS (first to settle was a failure)
any : [✗(fast) ✓ ✓] -> RESOLVES with first ✓ (ignores the early ✗)
any : [✗ ✗ ✗]       -> REJECTS with AggregateError(all reasons)
~~~

When to use \`any\`: redundant sources where you want the fastest *successful* one and don't care that some fail — multi-CDN fetches, fallback endpoints, "try several mirrors." \`race\` is for timeouts / first-to-settle where an early failure *should* win (e.g. timeout rejection).

Summary table to recite:
~~~
all        -> all succeed, else reject (fail-fast)
allSettled -> wait for all, never reject (per-item status)
race       -> first to SETTLE (success or fail)
any        -> first to FULFILL (else AggregateError)
~~~

Follow-up: "Browser support / AggregateError?" \`Promise.any\` + \`AggregateError\` are ES2021 — fine in modern browsers and Node 15+.`,
        },
        {
          q: "How do you fetch 5 APIs in parallel and handle partial failures gracefully?",
          answer: `Fire all requests concurrently, then collect with \`Promise.allSettled\` so one failure doesn't sink the rest. Map outcomes into a usable shape, optionally with per-item fallbacks.

~~~js
async function loadDashboard(urls) {
  const settled = await Promise.allSettled(
    urls.map((u) =>
      fetch(u).then((res) => {
        if (!res.ok) throw new Error(\`\${u} -> HTTP \${res.status}\`);
        return res.json();
      })
    )
  );

  const data = settled.map((r, i) =>
    r.status === "fulfilled"
      ? { url: urls[i], ok: true, value: r.value }
      : { url: urls[i], ok: false, error: r.reason.message, value: FALLBACK[i] }
  );

  const failures = data.filter((d) => !d.ok);
  if (failures.length) reportToSentry(failures); // observe, don't crash
  return data; // render successes, show fallbacks/placeholders for failures
}
~~~

~~~
[ widget1 ✓ ][ widget2 ✗ ][ widget3 ✓ ][ widget4 ✓ ][ widget5 ✗ ]
        render real        |  show fallback / skeleton  |
~~~

Why this approach (the senior reasoning):
- \`allSettled\` not \`all\` — \`all\` would discard the 3 successes because 2 failed.
- Convert HTTP errors to thrown errors inside each \`.then\` (since \`fetch\` won't reject on 4xx/5xx).
- Per-item fallback so the UI degrades gracefully (skeleton/placeholder) instead of blanking.
- Log failures for observability but keep rendering.

Enhancements to mention: add per-request timeout (\`AbortController\`), bound concurrency if it were 500 URLs (a pool), and retry transient 5xx with backoff. Production angle: this is exactly the news-portal homepage pattern — multiple independent widgets (top stories, trending, ads, weather) loaded in parallel, each failing independently.`,
        },
        {
          q: "How do you run async tasks sequentially using reduce?",
          answer: `Use \`reduce\` to build a promise chain where each task starts only after the previous resolves. The accumulator is a promise; you \`.then\` the next task onto it. This serializes async work — useful when order matters or you must avoid hammering a server with parallel requests.

~~~js
function runSequential(tasks) {
  // tasks: array of functions returning promises
  return tasks.reduce(
    (chain, task) => chain.then((results) =>
      task().then((r) => [...results, r])
    ),
    Promise.resolve([])   // seed: resolved promise with empty results
  );
}

await runSequential([() => fa(), () => fb(), () => fc()]);
// fa finishes, THEN fb starts, THEN fc — collects [ra, rb, rc]
~~~

~~~
reduce builds:  P.resolve([]) ─▶ .then(fa) ─▶ .then(fb) ─▶ .then(fc)
execution:      fa ──▶ fb ──▶ fc   (one at a time, in order)
~~~

Crucial detail: \`tasks\` must be an array of **functions** (\`() => fetch(...)\`), not already-invoked promises. If you pass live promises they've *already started* in parallel — \`reduce\` would only sequence the awaiting, not the execution.

The modern, more readable equivalent (prefer this unless asked specifically for reduce):
~~~js
const results = [];
for (const task of tasks) results.push(await task()); // sequential, clear
~~~

When sequential is right: rate-limited APIs, operations with ordering dependencies, migrations, or to avoid overwhelming a backend. When it's wrong: independent tasks where you're needlessly serializing latency — use \`Promise.all\` there.

Follow-up: "How to do sequential with a concurrency limit of N (not 1, not all)?" — a pool/worker pattern that keeps N in flight. That's a common escalation.`,
        },
      ],
      tip: "Promise.all — fails fast on first rejection. Promise.allSettled — waits for all, gives success/failure per item. Know both for data-fetching interviews.",
      rajnishAngle:
        "Fetching article data + related articles + ad config in parallel on NBT — Promise.allSettled so one failure does not break the page.",
    },
    {
      title: "async/await — Complete Guide",
      subtopics: [
        "async function return value",
        "await behavior",
        "Error handling (try/catch/finally)",
        "await in loops",
        "Top-level await",
        "Parallel vs sequential await",
      ],
      questions: [
        {
          q: "What does an async function always return?",
          answer: `An \`async\` function **always returns a Promise** — no exceptions. Whatever you \`return\` is wrapped:
- \`return value\` -> a promise resolved with that value.
- \`return promise\` -> the async function's promise adopts that promise's eventual state (it's flattened, not a promise-of-a-promise).
- \`throw\` -> a promise rejected with the thrown error.

~~~js
async function f() { return 42; }
f();                       // Promise { 42 } — NOT 42
f().then((v) => console.log(v)); // 42

async function g() { throw new Error("x"); }
g().catch((e) => console.log(e.message)); // "x"  (throw -> rejection)

async function h() { return Promise.resolve(7); }
h().then((v) => console.log(v)); // 7 — adopted/flattened, not Promise<Promise>
~~~

~~~
async fn returns:
  return v        -> Promise.resolve(v)
  return promise  -> adopts that promise's state (flattened)
  throw e         -> Promise.reject(e)
~~~

Why it matters: you can't use the return value synchronously — you must \`await\` it or \`.then\` it. A common bug is treating an async function's result as a plain value:
~~~js
const data = getData();        // BUG: data is a Promise, not the data
const data = await getData();  // correct (inside an async fn)
~~~

Follow-up: "What does \`await\` of a non-promise do?" It wraps it (\`await 5\` -> resolves to 5) but still defers to a microtask, so it has timing implications. "Is the returned promise the same one you returned?" Conceptually it adopts the state; identity isn't guaranteed.`,
        },
        {
          q: "What is the difference between sequential and parallel execution with await?",
          answer: `Sequential await: each \`await\` blocks the next line from running until it resolves, so independent operations run one-after-another (total ≈ sum of latencies). Parallel: start all operations first (so they overlap), then await — total ≈ slowest single latency. Awaiting independent tasks sequentially is a frequent, expensive bug.

~~~js
// SEQUENTIAL — ~300ms
const a = await getA(); // wait 100
const b = await getB(); // THEN wait 100
const c = await getC(); // THEN wait 100

// PARALLEL — ~100ms (start together, await together)
const [a, b, c] = await Promise.all([getA(), getB(), getC()]);

// PARALLEL variant — start, then await
const pa = getA(), pb = getB();      // both running now
const a2 = await pa, b2 = await pb;
~~~

~~~
sequential:  A──▶ B──▶ C──▶        (sum)
parallel:    A──▶
             B──▶  } overlap        (max)
             C──▶
~~~

Mechanism: invoking \`getA()\` starts the work immediately and returns a promise; \`await\` only suspends the *current* async function's continuation — it doesn't pause other already-started promises. So creating the promises before awaiting lets them run concurrently.

Keep it sequential only when there's a real **data dependency** (B needs A's output). Otherwise parallelize.

Production angle: RSC page fetching article + metadata + recommendations — \`Promise.all\` cuts TTFB roughly 3x vs three sequential awaits. Follow-up: "Bound parallelism?" Use a concurrency pool so you don't fire hundreds of requests simultaneously and exhaust sockets/rate limits.`,
        },
        {
          q: "How do you run multiple awaits in parallel?",
          answer: `Start the async operations first (don't await them inline), then await them together — usually via \`Promise.all\` (or \`allSettled\` for partial-failure tolerance).

~~~js
// ✅ parallel — Promise.all
const [user, posts, prefs] = await Promise.all([
  getUser(), getPosts(), getPrefs(),
]);

// ✅ parallel — assign promises first, await after
const userP = getUser();
const postsP = getPosts();
const user = await userP;     // both already in flight
const posts = await postsP;

// ❌ accidental sequential — awaiting at creation
const user = await getUser();   // blocks...
const posts = await getPosts();  // ...before this even starts
~~~

~~~
Promise.all([a, b, c]):
   a────▶
   b──────▶   await resolves when ALL done (~max latency)
   c───▶
~~~

Choosing the combinator:
- \`Promise.all\` — need every result; fail-fast acceptable.
- \`Promise.allSettled\` — tolerate partial failures, want per-item status.
- \`Promise.any\` — only need the first success (redundant sources).
- \`Promise.race\` — first to settle (timeouts).

Watch out: awaiting inside \`.map\` returns an array of *promises*, which you must still collect:
~~~js
const results = await Promise.all(ids.map((id) => fetchItem(id))); // parallel ✅
// NOT: const r = ids.map(async (id) => await fetchItem(id)); // array of promises
~~~

Follow-up: error handling in parallel — wrap the whole \`Promise.all\` in one \`try/catch\`; with \`all\`, the first rejection throws and you lose the rest, so use \`allSettled\` when each should be handled independently.`,
        },
        {
          q: "Why should you avoid await inside a forEach loop?",
          answer: `\`Array.prototype.forEach\` is **not promise-aware** — it ignores the return value of its callback. So \`await\` inside a \`forEach\` callback doesn't make \`forEach\` wait; the loop fires all callbacks synchronously and moves on, leaving floating promises. You get neither sequential nor properly-awaited behaviour, and errors escape.

~~~js
// ❌ Broken: forEach does NOT await; "done" logs BEFORE saves finish
items.forEach(async (item) => {
  await save(item);
});
console.log("done"); // runs immediately, saves still pending
~~~

~~~
forEach(async cb): fires cb, cb, cb ... (returns void, drops the promises)
                   -> no waiting, no ordering guarantee, errors unhandled
~~~

Correct alternatives depending on intent:

Sequential — \`for...of\` (await actually pauses the loop):
~~~js
for (const item of items) {
  await save(item);           // one at a time, in order
}
console.log("done");          // truly after all saves
~~~

Parallel — \`Promise.all\` + \`map\`:
~~~js
await Promise.all(items.map((item) => save(item))); // all concurrently
~~~

Why \`for...of\` works but \`forEach\` doesn't: \`for...of\` is built into the language's control flow, so \`await\` suspends the enclosing async function (and thus the loop). \`forEach\` is just a higher-order function that calls your callback and discards its (promise) return.

Other gotchas: errors thrown in a \`forEach\` async callback become unhandled rejections (no surrounding try/catch catches them). Also \`map(async ...)\` gives an array of promises you must still \`Promise.all\`.

Follow-up: "What about \`for await...of\`?" That's for async iterables/streams — it awaits each yielded value, great for consuming paginated/streamed data.`,
        },
        {
          q: "What is top-level await and where can you use it?",
          answer: `Top-level await (TLA) lets you use \`await\` **outside** any async function — directly at the top level of a **module** (ES2022). The module's evaluation becomes asynchronous: importers wait for it to finish before they run.

~~~js
// data.mjs — an ES module
const res = await fetch("/config.json"); // no async wrapper needed
export const config = await res.json();

// app.mjs
import { config } from "./data.mjs"; // waits until data.mjs's TLA settles
~~~

Where you CAN use it:
- ES modules (\`.mjs\`, \`type: "module"\`, \`<script type="module">\`, bundler ESM).
- Next.js Server Components / route handlers (server-side modules).

Where you CANNOT:
- CommonJS (\`require\`) files — not modules in that sense.
- Regular \`<script>\` (non-module).
- Inside synchronous function bodies (still need \`async\`).

Legitimate uses: top-level config/resource loading, conditional dynamic imports, DB connection setup before exports:
~~~js
const db = await connect(process.env.DB_URL);
export { db };

// conditional dependency
const mod = cond ? await import("./a.js") : await import("./b.js");
~~~

The trade-off / caution (the "why interviewers ask"): TLA **blocks the module graph** — any importer waits, which can serialize startup and hurt initial load if overused. It also affects how bundlers order/await chunks. Use it for genuine init dependencies, not as a convenience that delays your whole app's boot.

Follow-up: "How does it affect bundling?" Modules with TLA become async dependencies; bundlers (and the browser) await them, which can ripple latency through the graph — keep TLA shallow and near entry points.`,
        },
      ],
      tip: "await in forEach does not work as expected — use for...of for sequential async iteration, or Promise.all(array.map()) for parallel.",
      rajnishAngle:
        "Next.js RSC data fetching — parallel awaits for article + metadata + recommendations using Promise.all.",
    },
    {
      title: "Error Handling in Async Code",
      subtopics: [
        "try/catch with async/await",
        "Unhandled promise rejections",
        "Global error handlers",
        "Wrapping fetch errors",
        "Custom error classes",
      ],
      questions: [
        {
          q: "How do you handle errors in async/await vs .then()/.catch()?",
          answer: `Same underlying mechanism (promise rejection), two syntaxes. With async/await you use synchronous-style \`try/catch/finally\`; with promise chains you use \`.catch\`/\`.finally\`. The async/await form reads top-to-bottom and lets one try/catch span multiple awaits.

~~~js
// async/await
async function load() {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (err) {
    report(err);          // network error OR thrown HTTP error
    throw err;            // re-throw if caller should know
  } finally {
    setLoading(false);
  }
}

// equivalent promise chain
function load2() {
  return fetch(url)
    .then((res) => { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
    .catch((err) => { report(err); throw err; })
    .finally(() => setLoading(false));
}
~~~

Key differences / trade-offs:
- **Scope**: one try/catch wraps many awaits; chains need careful \`.catch\` placement (a \`.catch\` only catches *upstream* rejections).
- **Granularity**: with await you can try/catch a *single* line for fine-grained recovery; with chains you insert \`.catch\` mid-chain to recover and continue.
- **Parallel errors**: wrap \`await Promise.all([...])\` in one try/catch (first rejection throws). Use \`allSettled\` to handle each independently.

~~~js
// recover mid-chain then continue:
getA().catch(() => fallbackA).then((a) => useA(a));
// await equivalent:
let a; try { a = await getA(); } catch { a = fallbackA; } useA(a);
~~~

Pitfall both share: \`fetch\` doesn't reject on 4xx/5xx — you must check \`res.ok\`. Follow-up: "Can a synchronous \`try/catch\` catch an async error without await?" No — \`try { somePromise(); } catch\` won't catch the rejection; you must \`await\` (or \`.catch\`).`,
        },
        {
          q: "What happens when you do not catch a rejected Promise?",
          answer: `It becomes an **unhandled promise rejection**. The rejection has no handler in the microtask in which it settled, so the runtime surfaces it through a global hook and (depending on environment) logs a warning or terminates the process.

Browser:
~~~js
Promise.reject(new Error("boom")); // -> "Uncaught (in promise) Error: boom"
window.addEventListener("unhandledrejection", (e) => {
  e.preventDefault();          // stop default console error
  reportToSentry(e.reason);    // log it
});
~~~

Node.js:
~~~js
process.on("unhandledRejection", (reason, promise) => {
  log.error({ reason }, "unhandled rejection");
  // Node ≥15 default: process EXITS with non-zero code on unhandled rejection
});
~~~

~~~
reject ──no .catch / try-catch──▶ microtask ends with pending error
       ──▶ 'unhandledrejection' (browser) / 'unhandledRejection' (Node)
       ──▶ Node ≥15: process crash by default
~~~

Why this matters:
- In Node ≥15 the **default is to crash** — an uncaught rejection can take down your server. Always attach handlers / global nets.
- The global handler is a **safety net for observability**, not a substitute for local handling — you still want try/catch where you can actually recover.
- "Handled late" — if you attach a \`.catch\` later (async), Node fires \`rejectionHandled\` to retract the warning.

Common causes: forgetting \`await\`/\`.catch\`, a \`.then\` that throws with no downstream \`.catch\`, fire-and-forget async calls (\`doAsync();\` with no handling).

Production angle: wire \`unhandledrejection\` to Sentry on the news site so silent async failures (failed analytics/ad calls) are visible, and ensure server code never leaves rejections unhandled to avoid pod restarts.`,
        },
        {
          q: "How do you create a reusable wrapper that handles fetch errors consistently?",
          answer: `Centralize the cross-cutting concerns — checking \`res.ok\`, parsing, timeouts, retries, and normalized errors — in one function so every call site behaves identically. This is a hallmark of senior code: don't repeat \`if (!res.ok)\` everywhere.

~~~js
class HttpError extends Error {
  constructor(status, statusText, url, body) {
    super(\`HTTP \${status} \${statusText} @ \${url}\`);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

async function http(url, { timeout = 8000, retries = 2, ...opts } = {}) {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        // retry only transient 5xx, fail fast on 4xx
        if (res.status >= 500 && attempt < retries) {
          await delay(2 ** attempt * 200); // exponential backoff
          continue;
        }
        throw new HttpError(res.status, res.statusText, url, body);
      }
      return res.headers.get("content-type")?.includes("json")
        ? res.json() : res.text();
    } catch (err) {
      if (err.name === "AbortError" && attempt < retries) { await delay(2 ** attempt * 200); continue; }
      throw err; // network error or final HTTP error
    } finally {
      clearTimeout(timer);
    }
  }
}
~~~

Design decisions to articulate:
- **Normalize HTTP errors** into a custom \`HttpError\` with \`status\`/\`body\` so callers branch cleanly.
- **Retry policy**: transient 5xx and timeouts -> backoff; 4xx (client error) -> fail fast (retrying won't help).
- **Timeout** via \`AbortController\` (fetch has no native timeout).
- **finally** clears the timer to avoid leaks.
- One place to add auth headers, tracing/correlation IDs, and Sentry breadcrumbs.

Production angle: exactly the shared fetch utility used across news-feed fetches — retry 5xx, fail fast 4xx, consistent error shape for the UI's error boundaries.`,
        },
        {
          q: "What is the difference between a network error and an HTTP error in fetch?",
          answer: `This is the single most-tested fetch gotcha. \`fetch\` **rejects only on a network-level failure** (request never got a valid HTTP response). It **resolves successfully for any HTTP status** — including 404, 500 — because the server *did* respond. So a 500 is a *fulfilled* promise; you must inspect \`res.ok\`/\`res.status\` yourself.

~~~js
const res = await fetch("/api/thing"); // does NOT throw on 404/500
if (!res.ok) {                         // res.ok === (status 200–299)
  throw new Error("HTTP " + res.status); // YOU convert it to an error
}
const data = await res.json();
~~~

~~~
Network error (REJECTS):           HTTP error (RESOLVES):
  - offline / DNS fail               - 404 Not Found
  - CORS blocked                     - 401 / 403
  - connection refused               - 500 / 502 / 503
  - request aborted (AbortError)     => res.ok === false, you must handle
~~~

Why fetch was designed this way: at the protocol level, receiving a 500 *is* a successful HTTP transaction — the network worked. fetch only fails when it couldn't complete the exchange. (\`axios\`, by contrast, rejects on non-2xx by default — a common reason teams prefer it or wrap fetch.)

Practical consequences:
- A naive \`fetch(url).then(r => r.json())\` on a 500 will try to parse an error/HTML body and throw a confusing JSON parse error — masking the real 500.
- Always branch on \`res.ok\` before parsing.

~~~js
// robust:
const res = await fetch(url);
if (!res.ok) {
  const detail = await res.text().catch(() => "");
  throw new HttpError(res.status, detail);
}
~~~

Follow-up: "How do you distinguish them in a catch?" A rejection (caught error) ≈ network/abort; a thrown \`HttpError\` (status set) ≈ HTTP. "Does a redirect reject?" No — fetch follows redirects and resolves.`,
        },
        {
          q: "How do you retry a failed API call with exponential backoff?",
          answer: `Retry transient failures with an increasing delay between attempts (delay grows exponentially: base, 2×base, 4×base…), ideally with **jitter** (randomness) to avoid synchronized retries hammering the server (thundering herd). Only retry *idempotent*, *transient* failures (5xx, timeouts, network) — never blanket-retry 4xx.

~~~js
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, { retries = 3, base = 200, factor = 2, cap = 5000 } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > retries || !isRetryable(err)) throw err;
      const backoff = Math.min(cap, base * factor ** (attempt - 1));
      const jitter = Math.random() * backoff;       // full jitter
      await delay(jitter);
    }
  }
}

function isRetryable(err) {
  // retry network/abort + 5xx; never 4xx
  if (err.name === "TypeError" || err.name === "AbortError") return true;
  return err.status >= 500 && err.status < 600;
}

// usage
const data = await withRetry(() => http("/api/feed"), { retries: 4 });
~~~

~~~
attempt:   1      2      3       4
delay:    ~200ms ~400ms ~800ms ~1600ms   (×2 each, + jitter, capped)
~~~

The reasoning interviewers want:
- **Exponential** so you back off fast as the server struggles (don't add load to a failing system).
- **Jitter** so 10k clients don't all retry at the same instant (avoids a retry storm / cache stampede analogue).
- **Cap** the max delay so users aren't waiting minutes.
- **Idempotency** — safe to retry GET; for POST/PUT use idempotency keys or don't retry.
- **Budget** total retries to bound worst-case latency.

Production angle: news-feed fetches retry 5xx with capped exponential backoff + jitter; 4xx fail immediately. Pair with a circuit breaker so a sustained outage stops retrying entirely rather than amplifying it.`,
        },
      ],
      tip: "fetch() only rejects on network failure, NOT on 4xx/5xx responses. Always check response.ok. Senior devs know this — juniors do not.",
      rajnishAngle:
        "API error handling wrapper used across Times Internet news feed fetches — retry on 5xx, fail fast on 4xx.",
    },
    {
      title: "Fetch API & HTTP Fundamentals",
      subtopics: [
        "fetch() vs axios",
        "Request/Response objects",
        "Headers",
        "HTTP methods",
        "Status codes",
        "AbortController",
        "Timeouts",
      ],
      questions: [
        {
          q: "What is the difference between fetch and XMLHttpRequest?",
          answer: `\`fetch\` is the modern, promise-based HTTP API; \`XMLHttpRequest\` (XHR) is the legacy event/callback-based one. fetch is cleaner, streams responses, and integrates with \`AbortController\`, Request/Response objects, and Service Workers — but it has a few sharp edges XHR didn't.

~~~js
// XHR — verbose, event-driven
const xhr = new XMLHttpRequest();
xhr.open("GET", "/api");
xhr.onload = () => xhr.status === 200 && handle(JSON.parse(xhr.responseText));
xhr.onerror = () => fail();
xhr.send();

// fetch — promise-based
const res = await fetch("/api");
if (res.ok) handle(await res.json());
~~~

Differences to recite:
~~~
                fetch                    XMLHttpRequest
API style       Promises                events/callbacks
Errors          rejects ONLY on net     onerror on net; status via xhr.status
4xx/5xx         resolves (check res.ok) handled in onload by status
Cancel          AbortController         xhr.abort()
Progress        streams (ReadableStream) onprogress events (easier upload %)
Streaming       yes (res.body)          limited
Cookies         same-origin by default; credentials:'include' to send  always sends per origin rules
Timeout         none native (use Abort) xhr.timeout (built-in!)
~~~

Notable fetch limitations (the "challenge assumptions" part):
- **No native timeout** — XHR had \`xhr.timeout\`; fetch needs \`AbortController\`.
- **No 4xx/5xx rejection** — must check \`res.ok\`.
- **Upload progress** is awkward in fetch; XHR's \`onprogress\` is still simpler for upload bars.
- fetch doesn't send cookies cross-origin unless \`credentials: "include"\`.

Why fetch won anyway: composes with promises/async-await, returns real \`Response\` objects (usable in caches/Service Workers), and supports response streaming. Follow-up: "Why might you still reach for XHR or axios?" — upload progress, automatic JSON + non-2xx rejection (axios), or older-browser support.`,
        },
        {
          q: "How do you cancel a fetch request?",
          answer: `Use \`AbortController\`: create one, pass its \`.signal\` to fetch, and call \`controller.abort()\` to cancel. The pending fetch rejects with an \`AbortError\`. This is the standard cancellation primitive (also works with many other APIs that accept a signal).

~~~js
const controller = new AbortController();
const promise = fetch("/api/search?q=react", { signal: controller.signal });

controller.abort(); // cancels -> promise rejects with AbortError

try {
  const res = await promise;
} catch (err) {
  if (err.name === "AbortError") {
    /* expected — user cancelled, ignore */
  } else throw err;
}
~~~

~~~
new AbortController() ──▶ controller.signal ──▶ fetch({ signal })
controller.abort()   ──▶ signal fires 'abort' ──▶ fetch rejects (AbortError)
~~~

The two most important real-world patterns:

1) **Cancel previous request** (search-as-you-type race fix) — abort the in-flight request when a new keystroke starts so a stale, slower response can't overwrite a newer one:
~~~js
let current;
function search(q) {
  current?.abort();
  current = new AbortController();
  return fetch(\`/api?q=\${q}\`, { signal: current.signal });
}
~~~

2) **Cleanup on unmount** (React) — abort on effect cleanup to avoid "set state on unmounted component" and wasted bandwidth:
~~~js
useEffect(() => {
  const c = new AbortController();
  fetch(url, { signal: c.signal }).then(/* ... */).catch((e) => {
    if (e.name !== "AbortError") setError(e);
  });
  return () => c.abort();          // navigate away -> cancel
}, [url]);
~~~

3) **Timeout** — \`AbortSignal.timeout(ms)\` (modern) or \`setTimeout(() => c.abort(), ms)\`.

Production angle: cancelling an in-flight article fetch when the user navigates away quickly on the news app — AbortController in the useEffect cleanup. Follow-up: "Does abort stop the server work?" No — it stops the client waiting/downloading; the server may still complete it.`,
        },
        {
          q: "How do you implement a fetch timeout?",
          answer: `fetch has **no built-in timeout**, so you abort it after a deadline. Modern way: \`AbortSignal.timeout(ms)\`. Portable way: an \`AbortController\` with a \`setTimeout\` that calls \`abort()\` (clear the timer in \`finally\`).

~~~js
// Modern (Node 17.3+/recent browsers):
const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

// Portable, reusable wrapper:
async function fetchWithTimeout(url, opts = {}, ms = 5000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } catch (err) {
    if (err.name === "AbortError") throw new Error(\`Timeout after \${ms}ms\`);
    throw err;
  } finally {
    clearTimeout(id); // avoid a dangling timer (and a small leak)
  }
}
~~~

~~~
start fetch ───────────────▶
setTimeout(ms) ─────[ms]────▶ abort() ─▶ fetch rejects (AbortError)
whichever happens first wins; finally clears the timer
~~~

Subtleties to mention:
- Use **finally** to \`clearTimeout\` so the timer doesn't fire after a fast success (and so it's GC-friendly).
- Combine timeout with a **caller-supplied** signal (cancel + timeout together) using \`AbortSignal.any([userSignal, AbortSignal.timeout(ms)])\` (newer) or by forwarding aborts manually.
- Distinguish a timeout-abort from a user-abort if you need different handling (wrap/relabel the error as above).
- \`Promise.race\` against a rejecting timer also "times out" the await, but it does **not cancel** the fetch (the request keeps running and downloading) — AbortController is superior because it actually stops the work.

Follow-up: "race vs AbortController for timeout?" race only stops *waiting*; AbortController stops the *request*. Always prefer AbortController for real timeouts to free the connection.`,
        },
        {
          q: "What HTTP status codes should trigger a retry vs an immediate failure?",
          answer: `Retry **transient** failures; fail fast on **client/permanent** errors. The dividing line is roughly: 5xx and specific 4xx like 429/408 are retryable (with backoff); most 4xx are not (retrying won't change the outcome).

~~~
RETRY (transient, with exponential backoff + jitter):
  408 Request Timeout
  425 Too Early
  429 Too Many Requests   (honor Retry-After header!)
  500 Internal Server Error
  502 Bad Gateway
  503 Service Unavailable (honor Retry-After)
  504 Gateway Timeout
  + network errors / fetch AbortError(timeout) / connection reset

FAIL FAST (client/permanent — retry is pointless or harmful):
  400 Bad Request       (your payload is wrong)
  401 Unauthorized      (refresh token, then maybe ONE retry)
  403 Forbidden
  404 Not Found
  409 Conflict          (usually needs app-level resolution)
  422 Unprocessable     (validation)
~~~

~~~js
function isRetryable(status) {
  return status === 408 || status === 429 || (status >= 500 && status < 600);
}
~~~

Crucial extra rules (senior nuance):
- **Honor \`Retry-After\`** on 429/503 — the server tells you when to come back; respect it instead of your own backoff.
- **Idempotency** — only retry methods that are safe to repeat (GET, PUT, DELETE are idempotent; POST is not). For POST, use an **idempotency key** so retries don't double-create.
- **401** is special: typically refresh the auth token once and retry; if it 401s again, fail.
- **Bound retries** (e.g. 3) and add a **circuit breaker** so a sustained outage stops you from amplifying load.

Production angle: the shared fetch wrapper retries 5xx/429 with capped backoff (and Retry-After), fails fast on 4xx, and uses idempotency keys for write endpoints. Follow-up: "Why not retry 400?" The request is malformed — repeating it yields the same 400 and wastes resources.`,
        },
        {
          q: "How do you send JSON in a POST request with fetch?",
          answer: `Set \`method: "POST"\`, stringify the body with \`JSON.stringify\`, and — critically — set the \`Content-Type: application/json\` header so the server parses it correctly.

~~~js
const res = await fetch("/api/articles", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    // Authorization: \`Bearer \${token}\`,
  },
  body: JSON.stringify({ title, body, tags }), // must stringify
  // credentials: "include", // if you need cookies cross-origin
});

if (!res.ok) {
  const detail = await res.text().catch(() => "");
  throw new HttpError(res.status, detail);
}
const created = await res.json();
~~~

Things candidates get wrong (call these out):
- **Forgetting \`JSON.stringify\`** — passing the raw object sends \`"[object Object]"\`.
- **Forgetting Content-Type** — server may not parse the body as JSON (and may default to text).
- Setting Content-Type to \`application/json\` makes it a **non-simple** request, which triggers a **CORS preflight** (OPTIONS) cross-origin — be ready to explain that.
- For file uploads use **\`FormData\`** instead and DON'T set Content-Type manually (the browser sets the correct \`multipart/form-data\` boundary for you).

~~~js
// file upload — let the browser set the multipart boundary:
const fd = new FormData();
fd.append("file", file);
await fetch("/upload", { method: "POST", body: fd }); // no Content-Type header!
~~~

Follow-up: "Why does adding a JSON Content-Type trigger preflight but a form-encoded POST might not?" — \`application/json\` isn't in the CORS "simple request" Content-Type allowlist (\`text/plain\`, \`application/x-www-form-urlencoded\`, \`multipart/form-data\`), so the browser sends an OPTIONS preflight first.`,
        },
      ],
      tip: "AbortController + AbortSignal is the modern way to cancel fetch. Always abort on component unmount to avoid state updates on unmounted components.",
      rajnishAngle:
        "Cancelling in-flight article fetch when user navigates away quickly on NBT — AbortController in useEffect cleanup.",
    },
    {
      title: "Advanced Async Patterns",
      subtopics: [
        "Debounced API calls",
        "Request deduplication",
        "Polling",
        "Optimistic updates",
        "React Query internals",
        "Cancellation patterns",
      ],
      questions: [
        {
          q: "How do you debounce an API search input so it does not fire on every keystroke?",
          answer: `Debouncing delays the call until the user **stops typing** for N milliseconds — each keystroke resets the timer, so only the final pause triggers a request. This cuts dozens of requests down to one and protects the backend.

~~~js
function debounce(fn, ms) {
  let timer;
  function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms); // restart on each call
  }
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

const search = debounce((q) => fetch(\`/api?q=\${q}\`), 300);
input.addEventListener("input", (e) => search(e.target.value));
~~~

~~~
keystrokes:  r  e  a  c  t            (within 300ms of each other)
timers:      x  x  x  x  └─300ms─▶ fire ONCE with "react"
~~~

In React, use a debounced value or a ref-stable debounced callback (so it isn't recreated each render):
~~~js
function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id); // cleanup resets the timer
  }, [value, ms]);
  return v;
}
const debouncedQuery = useDebounced(query, 300);
useEffect(() => { if (debouncedQuery) fetchResults(debouncedQuery); }, [debouncedQuery]);
~~~

Senior additions:
- **Combine with cancellation** — abort the previous in-flight request when a new one starts (debounce reduces count; AbortController fixes out-of-order races).
- **debounce vs throttle** — debounce waits for a pause (search); throttle fires at most once per interval (scroll/resize).
- **Leading vs trailing** — trailing (fire after pause) is normal for search; leading fires immediately then suppresses.

Production angle: autocomplete on the news site — debounced 300ms + AbortController to cancel stale requests + dedupe identical queries. Follow-up: "Why is the closure here essential?" The \`timer\` persists across calls via closure — that's the whole mechanism.`,
        },
        {
          q: "What is request deduplication and how does React Query implement it?",
          answer: `Request deduplication means: if multiple callers ask for the **same** data (same key) while a request is already in flight, you make **one** network request and share its result with all callers — instead of N identical requests. It prevents redundant load when, say, three components mount and all need the same user profile.

~~~js
// Minimal dedupe by key: cache the in-flight PROMISE
const inflight = new Map();
function dedupedFetch(key, fetcher) {
  if (inflight.has(key)) return inflight.get(key); // reuse the pending promise
  const p = fetcher().finally(() => inflight.delete(key)); // clear when settled
  inflight.set(key, p);
  return p;
}
// three components calling dedupedFetch("user:1", ...) share ONE request
~~~

~~~
Comp A ─┐
Comp B ─┼─ same key "user:1" ─▶ ONE fetch ─▶ result fan-out to A,B,C
Comp C ─┘
~~~

How React Query does it:
- Every query has a **queryKey** (e.g. \`["user", 1]\`). The \`QueryCache\` is keyed by a hash of it.
- When a component mounts a \`useQuery\` whose key already has an **active fetch**, React Query attaches it to the **existing query observer** — it doesn't start a second request. The single result is delivered to all observers.
- **staleTime** controls dedupe across time: within staleTime, a re-mount or refocus serves cached data with **no** network call. After staleTime, it refetches (and dedupes concurrent refetches).
- It also dedupes background refetches (refocus/reconnect) and **cancels** outdated requests when keys change.

Why it matters: on a content-heavy page many widgets request overlapping data; dedupe + caching turns a burst of identical requests into one, cutting server load and improving perceived speed. Follow-up: "How is dedupe different from caching?" Dedupe collapses *concurrent in-flight* requests; caching reuses *already-resolved* data over time. React Query does both, plus revalidation (stale-while-revalidate).`,
        },
        {
          q: "How do you implement polling (refetch every N seconds) cleanly in React?",
          answer: `Poll with a timer set up in \`useEffect\`, and — this is the part people botch — **clean it up** on unmount/dependency change, avoid overlapping requests, and ideally pause when the tab is hidden.

Naive but correct base:
~~~js
useEffect(() => {
  let cancelled = false;
  const id = setInterval(async () => {
    const data = await fetchStatus();
    if (!cancelled) setStatus(data); // guard against unmount race
  }, 5000);
  return () => { cancelled = true; clearInterval(id); }; // cleanup
}, []);
~~~

Problem with \`setInterval\`: if a request takes longer than the interval, requests **overlap/stack**. Better — schedule the *next* poll only after the current finishes (\`setTimeout\` recursion):
~~~js
useEffect(() => {
  let stop = false, timer;
  const tick = async () => {
    try { const d = await fetchStatus(); if (!stop) setStatus(d); }
    finally { if (!stop) timer = setTimeout(tick, 5000); } // no overlap
  };
  tick();
  return () => { stop = true; clearTimeout(timer); };
}, []);
~~~

~~~
setInterval:  req─────────▶ (still running)
              5s│ req──▶  5s│ req──▶   <- can pile up
setTimeout :  req──▶ wait 5s ─▶ req──▶ wait 5s ─▶  (never overlaps)
~~~

Production-grade refinements:
- **Pause when hidden** — listen to \`document.visibilitychange\`; don't poll a backgrounded tab (saves battery/requests).
- **AbortController** to cancel the in-flight request on cleanup.
- **Backoff on errors** so a failing endpoint isn't hammered.

The pragmatic answer: use React Query's \`refetchInterval\` (and \`refetchIntervalInBackground: false\`) which handles overlap, cleanup, dedupe, and visibility for you:
~~~js
useQuery({ queryKey: ["status"], queryFn: fetchStatus, refetchInterval: 5000 });
~~~

Follow-up: "Polling vs WebSockets/SSE?" Polling is simple and stateless but wasteful; for real-time (live scores, breaking news) prefer SSE/WebSockets to push updates. Production angle: live cricket score widgets — SSE preferred, polling as fallback.`,
        },
        {
          q: "What are optimistic updates and how do you implement them?",
          answer: `An optimistic update applies the expected result to the UI **immediately** — before the server confirms — assuming success, then **rolls back** if the request fails. It makes interactions feel instant (likes, toggles, add-to-list) by hiding network latency.

~~~js
async function toggleLike(postId) {
  const prev = store.getLikes(postId);
  store.setLikes(postId, prev + 1);          // 1) optimistic: update UI now
  try {
    const confirmed = await api.like(postId); // 2) send request
    store.setLikes(postId, confirmed.count);  // 3) reconcile with server truth
  } catch (err) {
    store.setLikes(postId, prev);             // 4) rollback on failure
    toast("Couldn't like — try again");
  }
}
~~~

~~~
click ─▶ UI updates instantly ─▶ request ─┬─ success ─▶ reconcile (keep)
                                          └─ failure ─▶ rollback to snapshot
~~~

The mechanism has four parts: **snapshot** the previous state, **apply** the optimistic change, **send** the request, then **reconcile** (replace with server response) or **rollback** (restore the snapshot) and surface an error.

React Query makes this declarative via \`onMutate\`/\`onError\`/\`onSettled\`:
~~~js
useMutation({
  mutationFn: like,
  onMutate: async (id) => {
    await qc.cancelQueries({ queryKey: ["post", id] }); // stop races
    const prev = qc.getQueryData(["post", id]);
    qc.setQueryData(["post", id], (o) => ({ ...o, likes: o.likes + 1 }));
    return { prev };                       // context for rollback
  },
  onError: (_e, id, ctx) => qc.setQueryData(["post", id], ctx.prev),
  onSettled: (_d, _e, id) => qc.invalidateQueries({ queryKey: ["post", id] }),
});
~~~

When to use: high-confidence, low-risk, reversible actions (likes, follows, reordering, marking read). When NOT to: irreversible or money-moving actions (payments) where a wrong optimistic state is dangerous — there, show a pending state instead.

Pitfalls: must handle **concurrent** updates (cancel in-flight queries first), reconcile carefully so the optimistic value doesn't "flicker" back, and keep a correct snapshot for rollback. Follow-up: "What about offline?" Queue mutations and replay when back online (optimistic + sync).`,
        },
        {
          q: "How do you prevent race conditions when multiple async calls can resolve out of order?",
          answer: `A race condition here: you fire request A, then request B (newer), but A resolves **after** B and overwrites the fresh result with stale data. The fix is to ensure only the **latest** request can update state — via cancellation, a sequence guard, or a library that does this for you.

The classic bug (search-as-you-type):
~~~js
// type "re" then "react": if "re" resolves last, it clobbers "react" results
onChange = async (q) => setResults(await search(q)); // ❌ race
~~~

~~~
fire:    search("re") ─────────────▶ resolves LAST (stale) ✗ overwrites
         search("react") ─────▶ resolves first (fresh)
~~~

Fix 1 — **AbortController** (cancel the previous request; best, also saves bandwidth):
~~~js
let ctrl;
async function onChange(q) {
  ctrl?.abort();
  ctrl = new AbortController();
  try { setResults(await search(q, ctrl.signal)); }
  catch (e) { if (e.name !== "AbortError") throw e; }
}
~~~

Fix 2 — **sequence/flag guard** (ignore results that aren't the latest):
~~~js
let latest = 0;
async function onChange(q) {
  const id = ++latest;
  const data = await search(q);
  if (id === latest) setResults(data); // drop stale responses
}
~~~

Fix 3 — in React effects, use the **cleanup flag** so a superseded effect can't set state:
~~~js
useEffect(() => {
  let active = true;
  search(query).then((d) => { if (active) setResults(d); });
  return () => { active = false; }; // new query -> old effect's result ignored
}, [query]);
~~~

React Query handles this automatically: changing the queryKey cancels/ignores the outdated request and only the current key's data lands.

Which to prefer: AbortController is best (stops the work *and* the update); the sequence guard is the minimal pattern when you can't cancel. Production angle: autocomplete — AbortController cancels the prior request on each keystroke so out-of-order responses can never overwrite newer ones. Follow-up: "Why not just debounce?" Debounce reduces the *number* of requests but doesn't fix ordering — you still need cancellation/guards for correctness.`,
        },
      ],
      tip: "Race condition fix: use a flag or AbortController — cancel the previous request when a new one starts. React Query does this automatically.",
      rajnishAngle:
        "Search autocomplete on NBT — debounced fetch, cancel previous request on new keystroke, deduplicate identical queries.",
    },
    {
      title: "Promise Polyfills & Implementation",
      subtopics: [
        "Implement Promise.all polyfill",
        "Implement Promise.race polyfill",
        "Implement async queue",
        "Implement retry with backoff",
        "promisify function",
      ],
      questions: [
        {
          q: "Implement Promise.all from scratch.",
          answer: `\`Promise.all\` resolves with an array of results **in input order** when all fulfill, and rejects on the first rejection. Key tricks: preserve index order even though promises settle out of order, and track a completion counter to know when all are done.

~~~js
function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    const results = new Array(items.length);
    let remaining = items.length;

    if (remaining === 0) return resolve([]); // empty -> resolve immediately

    items.forEach((item, i) => {
      // Promise.resolve handles non-promise values too (e.g. plain numbers)
      Promise.resolve(item).then(
        (value) => {
          results[i] = value;        // store by INDEX -> preserves order
          if (--remaining === 0) resolve(results); // last one -> done
        },
        (err) => reject(err)         // first rejection -> reject whole thing
      );
    });
  });
}
~~~

~~~
inputs:   [ p0 , p1 , p2 ]
settle:    p1 , p2 , p0   (any order)
results[]: index-keyed -> [r0, r1, r2]  (input order preserved)
counter:   3 -> 2 -> 1 -> 0  => resolve
~~~

Points interviewers check:
- **Index storage** (\`results[i]\`) — never \`results.push\`, which would scramble order.
- **Counter** to detect "all done" (don't rely on the last array slot being filled).
- **\`Promise.resolve(item)\`** so non-promise values in the array work.
- **Empty input** resolves with \`[]\` immediately.
- **First rejection wins**; subsequent settlements are ignored (reject is a no-op after settle).
- Others keep running (no cancellation) — same as the real thing.

This is one of the most common machine-coding questions — practice until you can write it in ~3 minutes. Follow-up: "Now do \`allSettled\`" — same skeleton but never reject; store \`{status, value/reason}\` and only count down.`,
        },
        {
          q: "Implement Promise.race from scratch.",
          answer: `\`Promise.race\` settles as soon as the **first** input settles — adopting its fulfillment or rejection. Implementation is short: attach the outer \`resolve\`/\`reject\` to every input; the first to call them wins, and settle-once semantics make the rest no-ops.

~~~js
function promiseRace(iterable) {
  return new Promise((resolve, reject) => {
    for (const item of iterable) {
      // first to settle calls resolve/reject; later calls are ignored
      Promise.resolve(item).then(resolve, reject);
    }
    // empty iterable -> stays pending forever (matches spec)
  });
}
~~~

~~~
[ A(slow) , B(fast) , C(slow) ]
 attach resolve/reject to all
 B settles first ─▶ outer promise settles with B
 A, C settle later ─▶ no-ops (already settled)
~~~

Why this works: a promise can only settle **once**. We hand the same \`resolve\`/\`reject\` to all inputs; whoever finishes first locks the outer promise, and every subsequent \`resolve\`/\`reject\` call is silently ignored by the promise machinery.

Details to mention:
- **\`Promise.resolve(item)\`** wraps non-promise values (a raw value "wins" immediately).
- **Empty iterable** -> forever pending (intentional, matches native).
- First settle wins whether it's success OR failure (that's the difference from \`Promise.any\`, which ignores rejections until all fail).

Related quick variant — \`Promise.any\`:
~~~js
function promiseAny(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    const errors = new Array(items.length);
    let remaining = items.length;
    if (!remaining) return reject(new AggregateError([], "All promises were rejected"));
    items.forEach((item, i) =>
      Promise.resolve(item).then(resolve, (e) => {
        errors[i] = e;
        if (--remaining === 0) reject(new AggregateError(errors));
      })
    );
  });
}
~~~

Follow-up: "Difference between race and any in your code?" race passes both \`resolve, reject\`; any passes only \`resolve\` to success and counts down failures into an AggregateError.`,
        },
        {
          q: "Write a function that retries a Promise-returning function N times with delay.",
          answer: `Wrap the call in a loop: try, and on failure wait then try again until retries are exhausted, then re-throw the last error. Use exponential backoff + jitter for production quality; optionally filter which errors are retryable.

~~~js
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function retry(fn, { retries = 3, base = 200, factor = 2, cap = 5000, retryable = () => true } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);            // success -> return immediately
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !retryable(err)) break; // out of tries / non-retryable
      const backoff = Math.min(cap, base * factor ** attempt);
      await delay(Math.random() * backoff); // full jitter
    }
  }
  throw lastErr;                           // exhausted -> surface last error
}

// usage
const data = await retry(() => http("/api/feed"), {
  retries: 4,
  retryable: (e) => e.status >= 500 || e.name === "TypeError",
});
~~~

~~~
attempt 0 ✗ ─wait base─▶ 1 ✗ ─wait 2·base─▶ 2 ✗ ─wait 4·base─▶ 3 ✓
                                                        (or throw lastErr)
~~~

What a strong answer includes:
- **Loop with attempt counter**, return on success, \`break\` and re-throw on exhaustion.
- **Backoff** (exponential) + **jitter** to avoid synchronized retry storms.
- **Retryable predicate** — don't retry 4xx; do retry 5xx/network/timeout.
- **Cap** the delay; **bound** total attempts (worst-case latency).
- Re-throw the **last** error (not a generic one) for good diagnostics.

Edge cases: \`retries = 0\` -> one attempt, no retry. Make sure \`fn\` is a *function* (re-invokable), not an already-started promise (which can't be retried). Follow-up: "Add a circuit breaker" — after K consecutive failures, stop retrying for a cooldown window so a dead dependency isn't hammered.`,
        },
        {
          q: "Implement an async task queue that runs max N tasks concurrently.",
          answer: `A concurrency pool runs at most N tasks at once: keep a counter of active tasks; when one finishes, pull the next from a queue. This bounds load (sockets, rate limits, memory) while still parallelizing — the answer to "fetch 1000 URLs without firing 1000 requests."

~~~js
function createPool(concurrency) {
  let active = 0;
  const queue = [];

  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { task, resolve, reject } = queue.shift();
    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => { active--; next(); }); // free a slot, pull next
  };

  return function run(task) {
    return new Promise((resolve, reject) => {
      queue.push({ task, resolve, reject });
      next();
    });
  };
}

// usage: max 3 concurrent fetches over 1000 urls
const run = createPool(3);
const results = await Promise.all(urls.map((u) => run(() => fetch(u))));
~~~

~~~
concurrency = 3
slots: [t1][t2][t3]   queue: t4 t5 t6 ...
t2 done -> slot frees -> pull t4 -> [t1][t4][t3]
~~~

Key mechanics interviewers look for:
- A **queue** of pending tasks + an **active counter**.
- On each completion (\`finally\`), decrement and **pump** the next task.
- Tasks are **functions** (\`() => fetch(u)\`) so they start *when scheduled*, not immediately.
- Each \`run\` returns a promise that resolves with that task's result, so callers can \`Promise.all\` them.
- Errors propagate per-task (use \`allSettled\` at the call site if one failure shouldn't sink the batch).

Production angle: bulk operations — prefetching many article images, warming a cache, batch-revalidating — capped at N concurrency so you don't exhaust the server or hit rate limits. Follow-up: "Preserve result order?" Map results back by original index, or rely on \`Promise.all\` (which preserves input order regardless of completion order).`,
        },
        {
          q: "Write a promisify function that converts a Node-style callback to a Promise.",
          answer: `\`promisify\` wraps an error-first callback function so it returns a promise instead. It appends a callback that rejects on \`err\` and resolves on the result, and forwards the original arguments. This bridges legacy callback APIs into async/await.

~~~js
function promisify(fn) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      // call original with original args + our error-first callback
      fn.call(this, ...args, (err, ...results) => {
        if (err) return reject(err);
        resolve(results.length > 1 ? results : results[0]); // single vs multi result
      });
    });
  };
}

// usage
const fs = require("fs");
const readFile = promisify(fs.readFile);
const data = await readFile("config.json", "utf8"); // now awaitable
~~~

~~~
fn(arg1, arg2, (err, res) => ...)          // callback style
        │ promisify
        ▼
fn(arg1, arg2) -> Promise               // resolves res / rejects err
~~~

Points to cover:
- **Error-first contract** — the wrapped fn must call \`cb(err, result)\`; reject on \`err\`, resolve otherwise.
- **\`this\` binding** — use \`fn.call(this, ...)\` so methods that depend on their receiver still work (e.g. \`obj.method\` promisified).
- **Forward args** with rest/spread; append the generated callback last.
- **Multiple results** — some Node APIs call back with several values; decide whether to resolve an array (Node's built-in \`util.promisify\` supports a custom symbol for this).
- Prefer the built-in **\`util.promisify\`** in real Node code — but be able to hand-roll it.

Reverse direction worth mentioning — **callbackify** (promise -> callback) exists too. Follow-up: "Edge case if the callback is invoked twice?" The promise settles once; the second call is a no-op (a nice property promisify inherits). "What about APIs whose callback isn't last or isn't error-first?" promisify assumes the convention; non-conforming APIs need a custom wrapper.`,
        },
      ],
      tip: "Promise.all polyfill is one of the TOP frontend machine coding questions. Practice it until you can write it in 5 minutes.",
      rajnishAngle: "",
    },
  ],
};
