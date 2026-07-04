import type { Week } from "../types";

export const week18: Week = {
  week: 18,
  theme: "Advanced Patterns",
  color: "#C084FC",
  topics: [
    {
      title: "Iterators & Generators",
      subtopics: [
        "Symbol.iterator",
        "Custom iterables",
        "Generator functions (function*)",
        "yield / yield*",
        "Async generators",
      ],
      questions: [
        {
          q: "What is the iterator protocol? How do you make an object iterable?",
          answer: `The **iterator protocol** is a contract that lets objects define how they're iterated (consumed by \`for...of\`, spread \`...\`, destructuring, \`Array.from\`). It has two parts:
- **Iterable protocol**: an object is *iterable* if it has a method keyed by **\`Symbol.iterator\`** that returns an **iterator**.
- **Iterator protocol**: an *iterator* is an object with a **\`next()\`** method returning \`{ value, done }\` — \`done: false\` with a value each step, then \`{ value: undefined, done: true }\` when exhausted.

~~~js
const range = {
  from: 1, to: 4,
  [Symbol.iterator]() {                 // makes it ITERABLE
    let current = this.from, last = this.to;
    return {                            // returns an ITERATOR
      next() {
        return current <= last
          ? { value: current++, done: false }
          : { value: undefined, done: true };
      },
    };
  },
};
console.log([...range]);          // [1, 2, 3, 4]
for (const n of range) { /* 1,2,3,4 */ }
~~~

~~~
for...of / spread ─▶ calls obj[Symbol.iterator]() ─▶ gets iterator
   ─▶ repeatedly calls next() ─▶ {value, done:false}... until {done:true}
~~~

Built-ins that are already iterable: Arrays, Strings, Maps, Sets, NodeLists, \`arguments\`. That's why \`for...of\`/spread work on them — they implement \`Symbol.iterator\`. Plain objects are **not** iterable (use \`Object.entries\`/\`for...in\` or add the protocol).

**The easy way — use a generator** (which auto-implements the protocol):
~~~js
const range = {
  from: 1, to: 4,
  *[Symbol.iterator]() {            // a generator method
    for (let n = this.from; n <= this.to; n++) yield n;
  },
};
[...range]; // [1, 2, 3, 4]
~~~
A generator function returns an object that's **both** an iterator and iterable, so this is the idiomatic, less-boilerplate way to make custom iterables.

Why it matters: the iterator protocol is the foundation of \`for...of\`, spread, destructuring, and many APIs; understanding \`Symbol.iterator\` + \`next()/{value,done}\` (and that generators implement it for you) shows real language depth. It also enables **lazy** sequences (compute values on demand). Production angle: a custom iterable for paginated data or a tree structure lets consumers \`for...of\` over it cleanly; generators back streaming/lazy data flows. Follow-up: "Iterable vs iterator?" Iterable has \`[Symbol.iterator]()\`; iterator has \`next()\` — a generator is both. "Infinite iterables?" A generator yielding forever (consume with \`take\`/break). "Why aren't plain objects iterable?" No \`Symbol.iterator\` by default — design choice; use entries or add the protocol.`,
        },
        {
          q: "What does yield do in a generator function?",
          answer: `**\`yield\`** pauses a generator function and **produces a value** to the caller, **suspending** the function's execution **with its state intact** until \`next()\` is called again, which **resumes** right after the \`yield\`. This two-way pause/resume is what makes generators (\`function*\`) special — normal functions run to completion; generators can stop and continue.

~~~js
function* gen() {
  console.log('start');
  const x = yield 1;       // pause, give 1 to caller; resume here with next(arg) -> x = arg
  console.log('got', x);
  yield 2;
  return 'done';           // {value:'done', done:true}
}

const it = gen();          // nothing runs yet (lazy)
it.next();    // 'start' -> { value: 1, done: false }   (runs until first yield)
it.next(10);  // 'got 10' -> { value: 2, done: false }  (10 becomes the value of 'yield 1')
it.next();    // { value: 'done', done: true }
~~~

~~~
gen():  [start ... yield 1] ⏸  caller gets 1
next(10): resume ▶ x=10 [got 10 ... yield 2] ⏸  caller gets 2
next():   resume ▶ [return 'done']  done:true
~~~

Key behaviors:
1. **Pauses execution** — \`yield\` hands a value out and freezes the function; nothing after it runs until the next \`next()\`.
2. **Lazy** — calling \`gen()\` doesn't run the body; it returns a generator object. Code runs incrementally as you pull values. This enables **infinite sequences** (yield forever, consumer stops when it wants) and **on-demand** computation (don't compute the whole list up front).
3. **Two-way communication** — \`next(value)\` injects \`value\` as the result of the paused \`yield\` expression, so the caller can feed data **back in** (used in coroutines/state machines).
4. **\`yield*\`** — delegates to another iterable/generator (yields all of its values), for composition:
~~~js
function* inner() { yield 1; yield 2; }
function* outer() { yield* inner(); yield 3; } // 1, 2, 3
~~~

Why generators matter: they're the basis for **lazy iteration**, **custom iterables** (\`*[Symbol.iterator]\`), **infinite/streaming sequences**, and conceptually how **async/await** works (it's syntactic sugar over a generator yielding promises — the runtime resumes the function when each promise resolves). **Async generators** (\`async function*\` + \`for await...of\`) consume streamed/paginated async data.

Production angle: streaming RSC responses and paginated APIs are naturally modeled with (async) generators — yield each chunk/page lazily; you may have seen async generators under the hood in Next.js streaming. Follow-up: "yield vs return?" \`yield\` produces a value and pauses (done:false); \`return\` ends the generator (done:true). "How does this relate to async/await?" await/async is a generator-like pause/resume over promises. "Real lazy use?" Infinite ID generators, paginated fetchers, tree traversal yielding nodes on demand.`,
        },
        {
          q: "How do async generators help with streaming data?",
          answer: `An **async generator** (\`async function*\`) combines generators (lazy, pull-based, pause/resume) with promises (async), letting you **\`yield\` values that arrive asynchronously over time** and consume them with **\`for await...of\`**. This is the natural model for **streaming/paginated data** — you process each chunk as it arrives without buffering the entire dataset in memory and without manual callback/promise plumbing.

~~~js
// async generator: yields pages as they're fetched, lazily
async function* fetchPages(url) {
  let next = url;
  while (next) {
    const res = await fetch(next);          // await inside the generator
    const page = await res.json();
    yield page.items;                       // hand out this page's items
    next = page.nextUrl;                     // stop when no more pages
  }
}

// consume with for await...of — pulls the next page on demand
for await (const items of fetchPages('/api/articles')) {
  render(items);                            // process each page as it arrives
}
~~~

~~~
for await...of ─▶ awaits the generator's next() (a Promise of {value,done})
   ─▶ processes each yielded chunk as it streams in (backpressure: pull-based)
   ─▶ stops when done — never holds the whole stream in memory
~~~

Why they're ideal for streaming:
1. **Process as data arrives** — each \`yield\` delivers a chunk the moment it's ready; the consumer handles it before the next is fetched. No waiting for the entire stream.
2. **Memory efficiency / backpressure** — it's **pull-based**: the consumer requests the next chunk (\`for await\` calls \`next()\`), so the producer only advances when the consumer is ready — natural backpressure, no unbounded buffering. Great for large/infinite streams (reading a huge file, an SSE feed, paginated APIs, a ReadableStream).
3. **Clean async control flow** — \`await\` inside the generator + \`for await...of\` outside reads like synchronous code, replacing nested callbacks or manual promise chains for paged/streamed data.
4. **Composable** — you can wrap/transform async iterables (map/filter/take over a stream) and delegate with \`yield*\`.

Real APIs that expose async iterables: \`ReadableStream\` (response bodies via \`for await...of response.body\`), Node streams, database cursors, SSE/WebSocket wrappers, and SDK paginators.

~~~js
// reading a fetch response body as a stream of chunks
const res = await fetch('/big');
for await (const chunk of res.body) { processChunk(chunk); } // streamed, low memory
~~~

Why it matters: async generators are the modern primitive for **lazy, backpressured async streams** — paginated data, file/network streams, real-time feeds — and conceptually underpin how frameworks stream responses. Knowing \`async function*\` + \`for await...of\` and the **pull-based backpressure** benefit shows advanced async fluency. Production angle: streaming RSC/SSR responses, consuming paginated news-feed APIs, or processing large data in chunks map naturally to async generators — yield each page/chunk and render incrementally without buffering everything. Follow-up: "Backpressure?" Pull-based consumption means the producer waits for the consumer — no unbounded buffering. "vs returning an array of promises?" That eagerly starts/holds everything; async generators are lazy and incremental. "Relation to RSC streaming?" Streaming responses are conceptually async iterables — chunks yielded as ready.`,
        },
      ],
      tip: "Generators are lazy — they produce values on demand. Great for infinite sequences and streaming responses.",
      rajnishAngle:
        "Streaming RSC responses in Next.js use async generators under the hood — you've seen this in your stream debugging.",
    },
    {
      title: "Proxy & Reflect",
      subtopics: [
        "Proxy traps (get, set, has)",
        "Reflect API",
        "Reactive systems with Proxy",
        "Validation with Proxy",
        "Vue 3 reactivity model",
      ],
      questions: [
        {
          q: "What is a Proxy in JavaScript and what can you intercept with it?",
          answer: `A **\`Proxy\`** wraps a target object and lets you **intercept and customize fundamental operations** on it (property reads, writes, deletes, function calls, etc.) via **traps** — handler functions that run instead of (or around) the default behavior. It's metaprogramming: you redefine what \`obj.x\`, \`obj.x = y\`, \`'x' in obj\`, \`delete obj.x\`, \`obj()\` actually *do*.

~~~js
const target = { name: 'Raj', age: 30 };
const proxy = new Proxy(target, {
  get(obj, prop, receiver) {
    console.log('reading', prop);
    return Reflect.get(obj, prop, receiver);   // default behavior via Reflect
  },
  set(obj, prop, value, receiver) {
    if (prop === 'age' && typeof value !== 'number') throw new TypeError('age must be a number');
    return Reflect.set(obj, prop, value, receiver);
  },
});
proxy.name;        // logs "reading name" -> 'Raj'
proxy.age = 31;    // ok
proxy.age = 'x';   // throws TypeError
~~~

**Common traps (what you can intercept):**
~~~
get(target, prop)            -> reading a property        obj.x
set(target, prop, value)     -> writing a property        obj.x = v
has(target, prop)            -> the 'in' operator         'x' in obj
deleteProperty(target, prop) -> delete obj.x
apply(target, thisArg, args) -> calling a function        fn(...)
construct(target, args)      -> new fn(...)
ownKeys / getOwnPropertyDescriptor / defineProperty / getPrototypeOf ...
~~~

~~~
operation on proxy ─▶ matching trap runs (your logic) ─▶ (usually) Reflect.<op> for default
   no trap defined ─▶ operation passes through to the target unchanged
~~~

**Use cases (why Proxy exists):**
- **Reactivity** — track reads (\`get\`) and trigger updates on writes (\`set\`). This is exactly how **Vue 3** builds reactivity (and MobX, Valtio) — see the next questions.
- **Validation** — enforce types/constraints on assignment (the \`set\` trap above).
- **Default values / negative indexing / computed properties** — customize \`get\`.
- **Observation/logging/auditing**, access control (deny reads of private fields), read-only objects, API mocking, ORM-style lazy loading.

**\`Reflect\`** pairs with Proxy: it provides the **default implementations** of these operations (\`Reflect.get\`, \`Reflect.set\`, etc.) so your trap can perform the standard behavior cleanly (and correctly handle the \`receiver\` for inheritance). Using \`Reflect\` inside traps is best practice over manual \`target[prop]\`.

Caveats: Proxies have a small **performance overhead** (every trapped op goes through your handler), can't intercept some internal slots, and \`===\` compares the proxy (not the target). Don't proxy hot paths unnecessarily.

Why it matters: Proxy is the foundation of modern reactive state libraries and a powerful metaprogramming tool; knowing the **traps, that Reflect provides defaults, and the reactivity use case** signals deep JS understanding. Production angle: a reactive store or a validation wrapper (e.g. enforcing shapes on config/analytics objects) uses Proxy; understanding it explains how Vue/MobX/Valtio "just work." Follow-up: "Why use Reflect in traps?" Clean default behavior + correct \`receiver\`/inheritance handling. "Performance?" Overhead per trapped op — avoid in hot loops. "Can you proxy a function?" Yes — \`apply\`/\`construct\` traps intercept calls/instantiation.`,
        },
        {
          q: "How does Vue 3 use Proxy for its reactivity system?",
          answer: `Vue 3's reactivity is built on **\`Proxy\`**: \`reactive(obj)\` wraps an object in a Proxy whose **\`get\` trap tracks dependencies** (which effects/components read which properties) and whose **\`set\` trap triggers updates** (re-runs the effects that depend on the changed property). This is the **track-on-read, trigger-on-write** model, and it's why Vue 3's reactivity is more complete than Vue 2's.

~~~js
// simplified mental model of Vue 3's reactive()
function reactive(target) {
  return new Proxy(target, {
    get(obj, key, receiver) {
      track(obj, key);                       // record: current effect DEPENDS on obj.key
      const value = Reflect.get(obj, key, receiver);
      return typeof value === 'object' ? reactive(value) : value; // deep/lazy
    },
    set(obj, key, value, receiver) {
      const result = Reflect.set(obj, key, value, receiver);
      trigger(obj, key);                     // re-run effects that read obj.key
      return result;
    },
  });
}
~~~

~~~
component render (an "effect") reads state.count ─▶ GET trap ─▶ track(count) -> effect subscribes
later state.count = 5 ─▶ SET trap ─▶ trigger(count) -> re-run subscribed effects (re-render)
~~~

How the pieces fit:
- **\`track\`** (in the get trap) builds a dependency map: for each (object, key), the set of **effects** (component renders, computed, watchers) that read it. The "current running effect" is recorded when a property is accessed during its execution.
- **\`trigger\`** (in the set trap) looks up that key's subscribers and **re-runs** them — so changing a property automatically updates exactly the components/computeds that used it (fine-grained reactivity).
- **Lazy deep reactivity** — nested objects are wrapped in a Proxy **on access** (the get trap returns \`reactive(nestedValue)\`), so deep reactivity is on-demand, not eagerly cloning the whole tree.

**Why Proxy is a big improvement over Vue 2** (the key interview point): Vue 2 used **\`Object.defineProperty\`** to add getters/setters **per existing property at init time**. That had real limitations Proxy fixes:
~~~
Vue 2 (Object.defineProperty)        Vue 3 (Proxy)
- can't detect ADDING new props      - intercepts ANY property add/delete
  (needed Vue.set)                     (get/set/has/deleteProperty traps)
- can't detect property DELETION      - detected
- array index/length changes tricky   - handled naturally
- must walk & convert every prop      - lazy: wrap on access (faster init, deep on demand)
  up front (perf cost on big objects)
~~~
Proxy intercepts operations on the object **as a whole** (including new/deleted keys, array mutations), so Vue 3 doesn't need workarounds like \`Vue.set\`/\`this.$set\`, handles arrays cleanly, and initializes faster (lazy wrapping).

Why it matters: it's a concrete, high-signal example of Proxy in production and a common "how does framework reactivity work" question; explaining **track-on-get / trigger-on-set** and **why Proxy beats Object.defineProperty** shows you understand reactivity internals, not just the API. Production angle: understanding this explains how Vue/MobX/Valtio reactivity (and the perf characteristics) work — useful when choosing state tools or debugging reactivity edge cases. Follow-up: "Vue 2 limitation?" Can't detect added/removed props or some array changes without \`Vue.set\` — Proxy fixes all of it. "Performance?" Lazy deep wrapping + fine-grained dependency tracking; Proxy has minor per-access overhead but avoids Vue 2's eager full-tree conversion. "React vs Vue reactivity?" React re-renders top-down on state change (you opt into memoization); Vue tracks fine-grained dependencies and updates only what changed.`,
        },
        {
          q: "How do you use Proxy to validate object property assignments?",
          answer: `Use the **\`set\` trap** to intercept every property assignment, run validation logic, and either **allow** it (via \`Reflect.set\`) or **reject** it (throw, or return \`false\` in strict mode). Optionally use the **\`get\`/\`deleteProperty\`/\`has\`** traps for read guards or protecting required fields. This centralizes validation so invalid state can't be assigned anywhere.

~~~js
function validated(target, schema) {
  return new Proxy(target, {
    set(obj, key, value, receiver) {
      const rule = schema[key];
      if (rule && !rule.validate(value)) {
        throw new TypeError(\`Invalid value for "\${String(key)}": \${rule.message}\`);
      }
      return Reflect.set(obj, key, value, receiver); // valid -> default assignment
    },
    deleteProperty(obj, key) {
      if (schema[key]?.required) throw new Error(\`Cannot delete required field "\${String(key)}"\`);
      return Reflect.deleteProperty(obj, key);
    },
  });
}

const user = validated({}, {
  age:   { validate: (v) => Number.isInteger(v) && v >= 0, message: 'must be a non-negative integer', required: true },
  email: { validate: (v) => /^[^@]+@[^@]+$/.test(v), message: 'must be a valid email' },
});

user.age = 30;            // ok
user.age = -5;            // throws TypeError: Invalid value for "age": must be a non-negative integer
user.email = 'bad';       // throws
delete user.age;          // throws: Cannot delete required field
~~~

~~~
obj.prop = value ─▶ SET trap ─▶ run validation rule
   valid   ─▶ Reflect.set (assign)
   invalid ─▶ throw (or return false -> TypeError in strict mode)
~~~

Key points:
- **\`set\` trap signature** \`(target, key, value, receiver)\` — validate \`value\` against your schema/rules for \`key\`; on success **delegate to \`Reflect.set\`** for the real assignment (handles inheritance/receiver correctly); on failure **throw** a descriptive error (or return \`false\`).
- **Why a Proxy over manual setters / class accessors:** a Proxy validates **all** properties (including **dynamically added** ones, which \`Object.defineProperty\`/getters can't cover) with **one** handler, instead of writing a getter/setter per field. It's centralized and works for unknown keys.
- Extend with **\`get\`** (e.g. forbid reading private \`_\`-prefixed fields), **\`has\`** (hide keys from \`in\`), and **\`deleteProperty\`** (protect required fields).
- **Returning the right thing** — in strict mode, a \`set\` trap returning \`false\` throws a TypeError; many implementations \`throw\` directly for clearer messages.

Trade-offs: per-assignment overhead (avoid in hot loops), and consumers see the proxy (identity differs from the target). For schema validation you'd often reach for a library (**Zod/Yup**) at boundaries, but Proxy is the right tool when you want a **live, always-on guard** on an object's mutations.

Why it matters: it's a practical, clean Proxy use case demonstrating the \`set\` trap + \`Reflect\` and the advantage over per-property accessors (covers dynamic keys, one handler). Production angle: a guarded config/state object that rejects invalid analytics payloads or enforces shapes at runtime, catching bad assignments at the source rather than failing later. Follow-up: "set vs Object.defineProperty?" Proxy covers all keys incl. new/dynamic ones with one handler; defineProperty is per-existing-property. "Return value of set trap?" \`true\` = success; \`false\` -> TypeError in strict mode (or throw for a clear message). "Read-only object?" \`set\`/\`deleteProperty\` traps that always reject.`,
        },
        {
          q: "Track which properties of a large object are accessed at runtime. How do you use Proxy for this?",
          answer: `Wrap the object in a \`Proxy\` with a \`get\` trap that logs (or counts) every property read, then delegate to \`Reflect.get\` so the actual value is still returned normally. This is a common technique for finding **dead code / unused fields** in a large config or API-response object without manually auditing every usage site.

~~~js
function trackAccess(target, label = "object") {
  const accessed = new Set();

  return new Proxy(target, {
    get(obj, key, receiver) {
      accessed.add(key);
      console.log(\`[access] \${label}.\${String(key)}\`);
      return Reflect.get(obj, key, receiver);
    },
  });
}

const config = trackAccess({ apiUrl: "...", timeout: 3000, retries: 3, debug: false }, "config");

console.log(config.apiUrl);   // logs: [access] config.apiUrl
console.log(config.timeout);  // logs: [access] config.timeout
// 'retries' and 'debug' never touched -> candidates for removal
~~~

**Adding counts, not just a log line**, makes it useful for a real audit rather than noisy console spam:

~~~js
function trackAccessCounts(target) {
  const counts = new Map();

  const proxy = new Proxy(target, {
    get(obj, key, receiver) {
      counts.set(key, (counts.get(key) || 0) + 1);
      return Reflect.get(obj, key, receiver);
    },
  });

  return { proxy, getCounts: () => Object.fromEntries(counts) };
}

const { proxy, getCounts } = trackAccessCounts({ a: 1, b: 2, c: 3 });
proxy.a; proxy.a; proxy.b;
console.log(getCounts()); // { a: 2, b: 1 }  -> 'c' never accessed
~~~

**Extending it for nested objects** — recursively wrap any object-valued property returned by \`get\`, so deep property chains (\`config.api.retries.max\`) are tracked too, not just the top level:

~~~js
function deepTrackAccess(target, path = "") {
  return new Proxy(target, {
    get(obj, key, receiver) {
      const value = Reflect.get(obj, key, receiver);
      const fullPath = path ? \`\${path}.\${String(key)}\` : String(key);
      console.log(\`[access] \${fullPath}\`);
      return (typeof value === "object" && value !== null)
        ? deepTrackAccess(value, fullPath)
        : value;
    },
  });
}
~~~

~~~text
proxy.a       -> get trap fires -> log/count "a" -> Reflect.get returns real value
proxy.b.c     -> get trap fires for "b" -> returns wrapped proxy for b -> get trap fires for "c"
~~~

Performance note: every property read now goes through the trap, adding overhead — fine for a dev-mode audit or a one-off analysis run, but you'd strip this wrapper in production hot paths (e.g. don't wrap objects accessed inside a tight render loop).

Why it matters: this is a genuinely useful debugging technique — finding unused config keys, auditing which fields of a large API response are actually consumed by the UI, or building a lightweight "access profiler" without instrumenting every call site by hand. Follow-up: "How would you find properties that are set but never read?" — combine a \`set\` trap (records all keys ever assigned) with the \`get\` trap's accessed-set, then diff the two after the app has run for a while.`,
        },
      ],
      tip: "Proxy is the foundation of Vue 3 reactivity and many state management libraries. Understanding it shows JS depth.",
      rajnishAngle: "",
    },
    {
      title: "WeakMap, WeakSet & WeakRef",
      subtopics: ["WeakMap vs Map", "Private data pattern", "WeakRef + FinalizationRegistry", "Memory management"],
      questions: [
        {
          q: "What is the difference between Map and WeakMap?",
          answer: `Both store key->value pairs, but **\`WeakMap\` holds its keys *weakly*** — if the only reference to a key object is the WeakMap entry, the key (and its value) can be **garbage-collected**. A **\`Map\`** holds **strong** references — keys/values stay alive as long as the Map exists, even if nothing else references them (a potential memory leak). This difference drives everything else.

~~~
                 Map                          WeakMap
keys             any type (incl. primitives)   ONLY objects (& non-registered symbols)
key references   STRONG (prevents GC)          WEAK (allows GC if key unreferenced elsewhere)
iterable         yes (keys/values/entries)     NO (not enumerable, no .size)
size             .size                         none
use case         general key-value store       metadata/cache keyed by object lifetime
~~~

~~~js
let el = document.getElementById('widget');

const m = new Map();
m.set(el, { clicks: 0 });   // STRONG: even if 'el' is removed from DOM and el=null,
                            // the Map keeps the node alive -> leak

const wm = new WeakMap();
wm.set(el, { clicks: 0 });  // WEAK: when 'el' is GC'd (removed + el=null),
                            // the entry disappears automatically -> no leak
~~~

**Why WeakMap can't be iterated / has no \`.size\`:** because entries can vanish at **any time** (whenever GC runs), exposing iteration/size would be non-deterministic — you can't reliably enumerate a collection whose contents disappear unpredictably. So WeakMap only supports \`get/set/has/delete\` on a known key. (Same logic for WeakSet.)

**When to use WeakMap:**
1. **Caching/metadata keyed on objects (esp. DOM nodes)** — store computed data per element/object; when the object dies, its cache entry is auto-cleaned, **no manual cleanup, no leak**. Ideal for "I want extra data attached to objects I don't own / that have their own lifecycle."
2. **Private data for class instances** (next question) — a WeakMap keyed by \`this\` holds private fields; when the instance is GC'd, its private data goes too.
3. Avoiding leaks in long-lived caches where keys are objects with bounded lifetimes.

**Constraints:** keys **must be objects** (not primitives — primitives have no identity to weakly hold); not iterable; no \`size\`/\`clear\`.

~~~
need to enumerate / count / primitive keys      -> Map
attach data to objects with their own lifecycle -> WeakMap (auto-cleanup, no leak)
~~~

Why it matters: WeakMap is the tool for **leak-free, object-keyed caches and private state**; understanding **weak vs strong references** (and why that forbids iteration/size) is a hallmark of memory-aware JS. Production angle: caching computed values or per-element state keyed on DOM nodes (ad slots, article containers, observed elements) via WeakMap so removing the element automatically frees the cached data — preventing the long-session leaks discussed in DevTools memory debugging. Follow-up: "Why no iteration?" Entries can be GC'd unpredictably — enumeration would be non-deterministic. "Primitive keys?" Not allowed — no object identity to weakly reference. "Leak example Map causes?" Keeping detached DOM nodes alive as Map keys after removal.`,
        },
        {
          q: "How do you use WeakMap to store private data for class instances?",
          answer: `Before \`#private\` fields existed, the **WeakMap private-data pattern** stored each instance's private state in a module-scoped WeakMap **keyed by the instance (\`this\`)**. Because the WeakMap is closed over in the module (not on the instance), the data is **truly private** (inaccessible from outside), and because keys are **weak**, when an instance is garbage-collected its private data is **automatically freed** (no leak).

~~~js
const _private = new WeakMap();   // module-scoped, not exported -> inaccessible outside

class BankAccount {
  constructor(balance) {
    _private.set(this, { balance });   // private state keyed by the instance
  }
  deposit(amount) {
    const data = _private.get(this);
    data.balance += amount;
    return data.balance;
  }
  get balance() {
    return _private.get(this).balance;
  }
}

const acc = new BankAccount(100);
acc.deposit(50);     // 150
acc.balance;         // 150
// no way to read _private from outside the module -> truly private
// when 'acc' is GC'd, its WeakMap entry (the {balance}) is freed automatically
~~~

~~~
instance (this) ──key──▶ WeakMap ──▶ { private fields }
   private because WeakMap is module-scoped (closure), not a property on the object
   leak-free because keys are WEAK -> instance GC'd -> entry auto-removed
~~~

Why WeakMap specifically (vs alternatives):
- **vs \`this._private\` convention** — underscore fields are still **publicly accessible** (just a naming convention); WeakMap data is genuinely unreachable from outside the module.
- **vs a regular \`Map\`** — a Map would hold **strong** references to instances, so destroyed objects would **never be GC'd** as long as the Map lives (a leak); WeakMap lets them be collected, taking their private data with them.
- **vs closures** — closures give privacy too but allocate per-instance method copies; WeakMap shares methods on the prototype while keeping state private.

**The modern replacement:** native **\`#private\` fields** (ES2022) now provide true privacy with cleaner syntax and better ergonomics — so new code uses \`#\`:
~~~js
class BankAccount {
  #balance;
  constructor(b) { this.#balance = b; }
  deposit(a) { return (this.#balance += a); }
}
~~~
The WeakMap pattern is still worth knowing (legacy code, libraries supporting old targets, and as a demonstration of WeakMap's value) — but \`#private\` is the idiomatic choice today.

Why it matters: it's a classic pattern that demonstrates **encapsulation + automatic memory management** via WeakMap, and a common interview question linking privacy and GC; knowing both it and that **\`#private\` superseded it** shows current + foundational knowledge. Production angle: libraries targeting older runtimes still use this for private state without leaks; understanding it explains how true privacy and instance-scoped cleanup work. Follow-up: "Why not a Map?" Strong refs prevent GC of instances -> leak. "Modern way?" \`#private\` fields. "How is it 'private'?" The WeakMap is module-scoped (closure), never exposed — outside code has no reference to it.`,
        },
        {
          q: "What problem does WeakRef solve and when would you use it?",
          answer: `A **\`WeakRef\`** holds a **weak reference to a single object** — a reference that does **not** prevent that object from being garbage-collected. You call **\`.deref()\`** to get the object back, which returns the object **if it's still alive**, or **\`undefined\`** if it has been collected. It solves the problem of "I want to **reference/cache** an object **without keeping it alive**" — so the GC can reclaim it under memory pressure, and you gracefully handle its absence.

~~~js
let bigData = loadHugeObject();
const ref = new WeakRef(bigData);   // weak reference — doesn't keep bigData alive

// later... the object MAY have been GC'd if nothing else referenced it
const obj = ref.deref();
if (obj) {
  use(obj);            // still alive
} else {
  // it was collected -> recompute / refetch
  obj2 = recompute();
}
bigData = null;        // drop the strong ref -> now only the WeakRef remains -> GC-eligible
~~~

~~~
WeakRef:  ref ──weakly──▶ object   (GC may collect it any time)
ref.deref() -> object (alive)  OR  undefined (collected)  -> you handle both
~~~

**When to use it (legitimate, narrow cases):**
1. **Caches that shouldn't cause leaks / should yield under memory pressure** — cache an expensive-to-create object via WeakRef; if memory gets tight the GC can drop it, and you recompute on a missed \`deref()\`. (For object-keyed caches, **WeakMap** is usually better; WeakRef is for caching a *value* you can afford to lose.)
2. **Holding a reference to a large/expensive object you don't want to pin** — e.g. a parsed resource, an image, a derived structure — where keeping it is an optimization, not a requirement.
3. **Avoiding cycles/leaks** in observer-like structures where you want to reference but not own an object's lifetime.

**\`FinalizationRegistry\`** is the companion API — it lets you register a **cleanup callback** that *may* run after an object is garbage-collected (e.g. to release an associated external resource):
~~~js
const registry = new FinalizationRegistry((heldValue) => {
  cleanup(heldValue);   // runs (best-effort) after the object is collected
});
registry.register(obj, 'some-id');   // when obj is GC'd, callback may fire with 'some-id'
~~~

**Strong cautions (the senior nuance — interviewers want this):** the spec explicitly warns to **avoid WeakRef/FinalizationRegistry if you can.** GC timing is **non-deterministic and engine-specific** — you **cannot** rely on *when* (or *whether*) an object is collected or a finalizer runs. So never use them for program correctness, only as **best-effort optimizations** with a correct fallback (recompute on \`deref() === undefined\`). Overusing them leads to subtle, unportable bugs. Most "I need a weak reference" cases are actually solved better by **WeakMap/WeakSet** (object-keyed) or proper cleanup.

~~~
use WeakRef when:  caching/referencing an object you can AFFORD to lose to GC, with a fallback
avoid when:        you need deterministic lifecycle/cleanup -> use explicit cleanup, WeakMap, or refcounting
~~~

Why it matters: WeakRef/FinalizationRegistry are advanced memory-management tools; the senior answer explains the **weak-reference + deref()/undefined** mechanic, valid narrow uses, and crucially the **"avoid unless necessary; GC timing is non-deterministic; always have a fallback"** caveat. Production angle: a best-effort cache of expensive derived objects (keyed by something, value held weakly) that recomputes on a missed deref under memory pressure — used sparingly; for DOM-node-keyed data, WeakMap is preferred. Follow-up: "WeakRef vs WeakMap?" WeakMap = weak **keys** for object-keyed maps (auto-cleanup); WeakRef = a single weak reference to a value you deref. "Reliable finalizers?" No — best-effort, may never run; don't depend on them. "Why does the spec discourage them?" Non-deterministic GC makes them error-prone; prefer deterministic patterns.`,
        },
      ],
      tip: "WeakMap keys are weakly held — if the key object is GC'd, the entry is automatically removed. Good for caches keyed on DOM nodes.",
      rajnishAngle:
        "Caching computed values keyed on DOM elements (ad slots, article containers) without causing memory leaks.",
    },
    {
      title: "Design Patterns in Frontend",
      subtopics: ["Observer pattern", "Module pattern", "Factory pattern", "Strategy pattern", "Compound components (React)"],
      questions: [
        {
          q: "Implement a simple Observer/PubSub pattern in JavaScript.",
          answer: `The **Observer (Publish/Subscribe)** pattern lets objects **subscribe** to events and get **notified** when those events occur — **decoupling** publishers from subscribers (the publisher doesn't know who's listening). Implement it with a registry of event -> listeners, plus \`subscribe\`, \`unsubscribe\`, and \`publish\`/\`emit\`.

~~~js
class PubSub {
  constructor() { this.subscribers = new Map(); } // event -> Set of callbacks

  subscribe(event, callback) {
    if (!this.subscribers.has(event)) this.subscribers.set(event, new Set());
    this.subscribers.get(event).add(callback);
    return () => this.unsubscribe(event, callback);   // return unsubscribe fn
  }
  unsubscribe(event, callback) {
    this.subscribers.get(event)?.delete(callback);
  }
  publish(event, data) {
    this.subscribers.get(event)?.forEach((cb) => {
      try { cb(data); } catch (e) { console.error(e); } // isolate listener errors
    });
  }
}

// usage — publisher and subscribers are decoupled
const bus = new PubSub();
const off = bus.subscribe('cart:add', (item) => updateBadge(item));
bus.subscribe('cart:add', (item) => sendAnalytics(item));
bus.publish('cart:add', { id: 1 });   // both subscribers run
off();                                 // unsubscribe one
~~~

~~~
publisher ─publish('event', data)─▶ PubSub ─▶ notify all subscribers of 'event'
   subscribers don't know the publisher; publisher doesn't know subscribers (decoupled)
~~~

Design points:
- **Decoupling** is the whole value — components communicate via events without direct references, so they can evolve/be added/removed independently.
- **Return an unsubscribe function** from \`subscribe\` (ergonomic cleanup; mirrors modern APIs and React effect teardown).
- **Set of listeners** for O(1) add/remove and dedupe.
- **Error isolation** — wrap each callback so one throwing subscriber doesn't break the rest.
- Optional extras: \`once\`, wildcard events, async listeners.

**Observer vs PubSub nuance** (good to mention): classic **Observer** has the subject hold a direct list of observers and notify them; **PubSub** adds an **event-bus/broker** in the middle so publishers and subscribers are fully decoupled (don't reference each other at all). They're closely related; people often use the terms interchangeably.

**Where it shows up in frontend** (connect to what they know): the **DOM event system** (\`addEventListener\`/\`dispatchEvent\`), **Node's EventEmitter**, **Redux store subscriptions**, **RxJS observables**, **React Context** (consumers are notified on provider change), and **analytics/event buses**. React's \`useState\`/Context update propagation is conceptually observer-like.

Why it matters: Observer/PubSub is one of the most common and useful frontend patterns; implementing it cleanly (with unsubscribe, error isolation) and naming where it appears (DOM events, Redux, EventEmitter) shows pattern fluency. Production angle: an analytics/event bus where UI components **publish** events (\`article:view\`, \`ad:impression\`) and a tracker **subscribes** — publishers and the tracker are decoupled, so you can add/remove trackers without touching the components. Follow-up: "Observer vs PubSub?" PubSub adds a broker for full decoupling; Observer has the subject notify its observers directly. "Memory leaks?" Unremoved subscribers (capturing closures) accumulate — always unsubscribe (return/use the unsubscribe fn). "Real examples?" DOM events, EventEmitter, Redux subscribe, RxJS, Context.`,
        },
        {
          q: "What is the Strategy pattern? Give a React example.",
          answer: `The **Strategy pattern** defines a family of **interchangeable algorithms/behaviors**, encapsulates each one, and lets you **select/swap** them at runtime — so the consuming code doesn't contain a big conditional and isn't coupled to a specific implementation. You "inject" the strategy; the context calls it through a common interface.

~~~js
// strategies: interchangeable behaviors with the same signature
const sortStrategies = {
  byDate:  (a, b) => b.date - a.date,
  byTitle: (a, b) => a.title.localeCompare(b.title),
  byPopularity: (a, b) => b.views - a.views,
};

// context picks a strategy at runtime — no if/else chain
function sortArticles(articles, strategy) {
  return [...articles].sort(sortStrategies[strategy]);
}
sortArticles(list, 'byPopularity');
~~~

~~~
instead of:  if (type==='date') {...} else if (type==='title') {...} else ...
strategy:    pick a function from a map / inject it -> call via a common interface
   -> open/closed: add a new strategy without touching the consumer
~~~

**React examples** (idiomatic — strategies are usually **functions, components, or hooks** passed as props):

1. **Render-strategy via a prop** — swap how something renders:
~~~jsx
const renderers = {
  grid: (item) => <GridCard {...item} />,
  list: (item) => <ListRow {...item} />,
  compact: (item) => <CompactRow {...item} />,
};
function Feed({ items, layout }) {            // 'layout' selects the strategy
  return <>{items.map((it) => renderers[layout](it))}</>;
}
~~~

2. **Behavior via a function prop** — inject the algorithm:
~~~jsx
function SortableList({ items, sortStrategy }) {   // sortStrategy = (a,b)=>...
  const sorted = useMemo(() => [...items].sort(sortStrategy), [items, sortStrategy]);
  return <List items={sorted} />;
}
~~~

3. **Custom hooks as strategies** — different data-fetching/validation strategies behind the same hook interface (e.g. \`useValidation(schemaStrategy)\`).

The React framing (the key insight to state): **custom hooks and function/component props ARE the Strategy pattern** — React's composition model makes strategies natural. Instead of an inheritance hierarchy or a switch statement, you pass the behavior in. This gives **open/closed** extensibility (add a new layout/sort/validation strategy without modifying the consumer) and testability (test each strategy in isolation).

Benefits: eliminates sprawling conditionals, decouples the consumer from concrete behaviors, makes algorithms swappable/configurable, and each strategy is independently testable. Trade-off: more indirection/objects for very simple cases (don't over-engineer a single if/else into a strategy).

Why it matters: Strategy is a clean way to handle "multiple interchangeable behaviors" and React expresses it elegantly via props/hooks — connecting the GoF pattern to idiomatic React (function/component props, custom hooks) shows you map classic patterns onto modern frontend. Production angle: a configurable article feed whose **layout** (grid/list/compact) and **sort** (date/popularity) are injected strategies, so adding a new layout or sort order doesn't touch the feed component. Follow-up: "Strategy vs a switch?" Switch hardcodes choices in the consumer (closed to extension); strategy injects them (open/closed). "React-specific form?" Function/component props and custom hooks. "When not to?" Trivial 2-branch logic — a simple conditional is clearer than a pattern.`,
        },
        {
          q: "What are compound components in React and when do you use them?",
          answer: `**Compound components** are a React pattern where **multiple components work together as a cohesive unit**, sharing **implicit state** through a parent (usually via **Context**), and the consumer composes them declaratively as children. The classic analogy is HTML's \`<select>\` and \`<option>\` — they only make sense together and coordinate internally. Think \`<Tabs>\` + \`<Tab>\` + \`<TabPanel>\`.

~~~jsx
const TabsContext = createContext();

function Tabs({ children, defaultIndex = 0 }) {
  const [active, setActive] = useState(defaultIndex);   // shared state in the parent
  return <TabsContext.Provider value={{ active, setActive }}>{children}</TabsContext.Provider>;
}
function TabList({ children }) { return <div role="tablist">{children}</div>; }
function Tab({ index, children }) {
  const { active, setActive } = useContext(TabsContext);  // implicit shared state
  return (
    <button role="tab" aria-selected={active === index} onClick={() => setActive(index)}>
      {children}
    </button>
  );
}
function TabPanel({ index, children }) {
  const { active } = useContext(TabsContext);
  return active === index ? <div role="tabpanel">{children}</div> : null;
}
Tabs.List = TabList; Tabs.Tab = Tab; Tabs.Panel = TabPanel;   // attach for nice API

// usage — declarative, flexible composition; no prop drilling
<Tabs defaultIndex={0}>
  <Tabs.List>
    <Tabs.Tab index={0}>News</Tabs.Tab>
    <Tabs.Tab index={1}>Sports</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel index={0}>News content</Tabs.Panel>
  <Tabs.Panel index={1}>Sports content</Tabs.Panel>
</Tabs>
~~~

~~~
<Tabs> (owns active state via Context)
  ├─ <Tabs.Tab> reads/sets active        } children share state IMPLICITLY
  └─ <Tabs.Panel> shows if active        } via Context — no prop drilling
~~~

**Why/when to use them:**
1. **Flexible, declarative composition** — consumers arrange the sub-components however they want (reorder, wrap, add markup between) without you exposing a giant config prop API. Great for **reusable UI components** with multiple coordinated parts: Tabs, Accordion, Menu/Dropdown, Select, Modal (Header/Body/Footer), Form fields.
2. **Avoids prop drilling / "prop explosion"** — instead of \`<Tabs tabs={[...]} renderTab={...} activeStyles={...} ...>\` (a config-heavy API), the shared state flows via Context, and consumers compose children.
3. **Inversion of control** — the consumer controls structure/markup; the parent manages the shared behavior/state. More flexible and readable than a monolithic component with many props.
4. **Accessible, encapsulated** — the component family encapsulates ARIA roles/keyboard handling while letting consumers compose content.

**Trade-offs / when not to:** more **implementation complexity** (Context wiring), the sub-components are **coupled** to the parent (must be used within it — guard with a context check that throws a helpful error), and it can be overkill for simple single-purpose components. Also relies on consumers composing correctly.

Related patterns: this is how design-system libraries (Reach UI, Radix, Headless UI, Chakra) structure components. Alternatives/cousins: render props, hooks, and "headless" components.

Why it matters: compound components are a key **reusable-component-design** pattern (the foundation of modern headless UI libraries); explaining the **Context-shared-state + declarative composition + avoids prop explosion** value, with the \`<select>/<option>\` analogy, shows component-architecture maturity. Production angle: a shared design-system used across NBT/Maharashtra Times implements Tabs/Accordion/Menu/Modal as compound components so each property composes them flexibly (custom markup, ordering) without a sprawling prop API — encapsulating a11y while staying composable. Follow-up: "How is state shared?" Via Context from the parent — children read it implicitly, no prop drilling. "Downside?" Context complexity + sub-components coupled to the parent (guard misuse). "vs config props?" Compound = flexible declarative composition; config props = rigid, prop explosion. "Real libraries?" Radix/Headless UI/Reach use this pattern.`,
        },
      ],
      tip: "React's Context + useContext is the Observer pattern. Custom hooks are often the Strategy pattern. Connect patterns to what you already know.",
      rajnishAngle:
        "Analytics event tracking at Times Internet uses Observer pattern — components publish events, tracker subscribes.",
    },
    {
      title: "Functional Programming Concepts",
      subtopics: ["Pure functions", "Immutability", "Higher-order functions", "Currying & partial application", "Composition"],
      questions: [
        {
          q: "What is a pure function? Why does React prefer them?",
          answer: `A **pure function** has two properties: (1) **deterministic** — same inputs always produce the same output; and (2) **no side effects** — it doesn't modify anything outside itself (no mutating arguments/globals, no I/O, no DOM writes, no \`Math.random\`/\`Date.now\`, no network). It depends only on its inputs and only returns a value.

~~~js
// ✅ PURE — same input -> same output, no side effects
function add(a, b) { return a + b; }
function double(arr) { return arr.map((x) => x * 2); } // returns NEW array, doesn't mutate

// ❌ IMPURE
let total = 0;
function addToTotal(x) { total += x; return total; }   // mutates external state
function addItem(arr, x) { arr.push(x); return arr; }   // mutates the argument
function now() { return Date.now(); }                   // non-deterministic
~~~

~~~
pure:    f(x) -> y   (always same y for same x; touches nothing else)
impure:  reads/writes external state, mutates inputs, does I/O, or is non-deterministic
~~~

**Why React prefers/requires purity:**
1. **Components must be pure functions of props + state** — given the same props/state, a component must render the same output, with **no side effects during render**. React relies on this to render correctly.
2. **Concurrent rendering depends on it** — React's Fiber can **pause, abort, restart, or render components multiple times** (Strict Mode double-invokes in dev to surface impurity). If render has side effects, those run unexpectedly/repeatedly, causing bugs. Pure render = safe to re-run/discard.
3. **Predictability & memoization** — purity makes \`React.memo\`/\`useMemo\`/\`useCallback\` valid: if output depends only on inputs, you can safely **skip re-computation/re-render** when inputs are unchanged. Impure functions can't be safely memoized.
4. **Easier testing/debugging** — pure functions are trivial to test (input -> assert output, no mocks/setup) and reason about.
5. **Immutability pairs with it** — React detects changes by reference; pure updates that produce **new** objects/arrays (not mutations) make change detection (and \`===\` bail-outs) work. Mutating state directly breaks React's update detection.

Where side effects go in React: **not in render** — they belong in **event handlers** or **\`useEffect\`** (explicitly the place for effects like data fetching, subscriptions, DOM mutations). Keeping render pure and isolating effects is the core mental model.

~~~
React render = pure(props, state) -> UI    (no side effects, deterministic)
side effects -> useEffect / event handlers (the designated impure zones)
~~~

This is also why **React Server Components must be pure** and why the **rules of hooks** (no conditional hooks, etc.) enforce predictable, pure-ish execution. FP's purity is baked into React's design.

Why it matters: purity is foundational to how React works (concurrent rendering, memoization, predictability); explaining **deterministic + no side effects** and **why concurrency/memoization/Strict Mode require it** shows you understand React's model, not just the API. Production angle: keeping components/render pure (effects in \`useEffect\`, immutable state updates) is what lets memoization and concurrent features work reliably — and avoids the subtle bugs Strict Mode's double-render exposes. Follow-up: "Why does Strict Mode double-render?" To surface impure render logic (side effects that shouldn't be there) in dev. "Immutability link?" Pure updates return new references so React's \`===\` change detection works; mutation breaks it. "Where do side effects go?" \`useEffect\`/event handlers, never during render.`,
        },
        {
          q: "What is currying? Write a curried add function.",
          answer: `**Currying** transforms a function that takes **multiple arguments** into a **sequence of functions each taking one argument** (or fewer at a time). \`f(a, b, c)\` becomes \`f(a)(b)(c)\`. It enables **partial application** — fixing some arguments now and supplying the rest later — which is great for creating specialized, reusable functions and for function composition.

~~~js
// normal
function add(a, b, c) { return a + b + c; }
add(1, 2, 3); // 6

// curried (manual)
const curriedAdd = (a) => (b) => (c) => a + b + c;
curriedAdd(1)(2)(3);   // 6

// partial application — fix some args, get a specialized function
const add5 = curriedAdd(5);     // a=5 fixed
const add5and10 = add5(10);     // b=10 fixed
add5and10(20);                  // 35
~~~

**A generic \`curry\` helper** (common interview ask — curry *any* function):
~~~js
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn.apply(this, args); // enough args -> call
    return (...next) => curried.apply(this, [...args, ...next]); // collect more
  };
}

const add = curry((a, b, c) => a + b + c);
add(1)(2)(3);    // 6
add(1, 2)(3);    // 6   — flexible arity
add(1)(2, 3);    // 6
~~~

~~~
add(a,b,c) ─curry─▶ add(a)(b)(c)  (one-at-a-time)
  collect args until fn.length reached -> then invoke
  partial application: pre-fill some args -> specialized reusable fn
~~~

**Why it's useful (the value, not just the trick):**
1. **Partial application / specialization** — build focused functions from general ones: \`const log = curry((level, msg) => ...); const error = log('ERROR');\`. Reuse without re-passing the same args.
2. **Function composition** — curried, single-argument functions compose cleanly into pipelines (\`pipe\`/\`compose\`), the backbone of point-free FP style and libraries like Ramda/lodash/fp.
3. **Configuration / dependency injection** — pre-configure a function (e.g. \`const fetchFrom = curry((baseUrl, path) => fetch(baseUrl + path)); const api = fetchFrom('/api')\`).
4. **Readability/reuse** in event handlers, formatters, validators.

**Currying vs partial application** (a precise distinction interviewers like): **currying** always breaks a function into a chain of **unary** (single-arg) functions; **partial application** fixes *some* number of arguments and returns a function for the rest (not necessarily one at a time). Currying *enables* partial application; \`Function.prototype.bind\` is a form of partial application (\`fn.bind(null, a)\`).

Trade-offs: more closures/indirection; can hurt readability if overused; minor perf cost. Use it where specialization/composition genuinely helps, not everywhere.

Why it matters: currying is a core FP concept underpinning composition and reusable specialized functions; being able to **write the unary curried add, a generic \`curry\` helper, and explain partial application + composition uses** shows FP fluency. Production angle: curried/partially-applied utilities — a configured API client, a leveled logger, reusable validators/formatters — reduce repetition and compose into clean pipelines (e.g. data transforms over news feed items). Follow-up: "Currying vs partial application?" Currying = chain of unary fns; partial application = fix some args (bind). "Generic curry with fn.length?" Collect args until \`fn.length\` reached, then invoke. "Real use?" Composition pipelines, DI/config, specialized handlers. "Downside?" Indirection/readability if overused.`,
        },
        {
          q: "What is function composition and how does it relate to React component composition?",
          answer: `**Function composition** combines simple functions into a more complex one by **piping the output of one into the input of the next** — \`compose(f, g)(x) = f(g(x))\`. You build behavior from small, focused, reusable pieces instead of one big function. It's a cornerstone of FP and directly mirrors how React builds UIs from components.

~~~js
// compose: right-to-left  (f after g)
const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);
// pipe: left-to-right (often more readable)
const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);

const trim = (s) => s.trim();
const lower = (s) => s.toLowerCase();
const slug = (s) => s.replace(/\\s+/g, '-');

const toSlug = pipe(trim, lower, slug);   // build a pipeline from small fns
toSlug('  Hello World  ');                // "hello-world"
~~~

~~~
pipe(trim, lower, slug)('  Hello World  ')
  ─▶ trim ─▶ lower ─▶ slug ─▶ "hello-world"   (data flows through small steps)
~~~

**How it relates to React component composition** (the key insight):
React's whole model is **composition over inheritance** — you build complex UIs by **nesting/composing small components**, each doing one thing, passing data down via props and UI via \`children\`. A component is essentially a function (\`props -> UI\`), and **nesting components is composing those functions**:
~~~jsx
// composing components (like composing functions)
<Page>
  <Header />
  <Article>
    <Byline />
    <Body />
  </Article>
  <Footer />
</Page>
// Page composes Header/Article/Footer; Article composes Byline/Body — small pieces -> complex UI
~~~

Parallels to draw:
- **Small, single-purpose units** — pure functions ↔ focused components; combine them rather than building monoliths.
- **\`children\` and composition** — passing components as \`children\`/props is composing them (the alternative to inheritance, which React deliberately avoids).
- **Higher-Order Components (HOCs)** are literally function composition on components: \`withAuth(withLogging(Component))\` composes wrappers — analogous to \`compose(f, g)\`.
- **Custom hooks** compose behavior (a hook can use other hooks) the way functions compose logic.
- **Pure + composable** — because components/functions are pure, composing them is predictable (same inputs -> same output), enabling reasoning and reuse.

~~~
FP:     pipe(small fns) -> complex behavior
React:  compose(small components) -> complex UI   (props down, children compose, HOCs/hooks compose)
~~~

The takeaway to state: **React is functional composition applied to UI** — favor composing small, pure, reusable components (and hooks) over inheritance or giant components, exactly as FP favors composing small pure functions over one big procedure.

Why it matters: composition is the unifying principle of both FP and React; explaining \`compose/pipe\` and mapping it to **component nesting, children, HOCs, and custom hooks** shows you grasp *why* React is designed the way it is (composition over inheritance), not just how to write JSX. Production angle: a design system of small composable components + composed custom hooks (data, analytics, a11y) builds complex pages from reusable pure pieces — easier to test, reuse, and reason about across properties. Follow-up: "compose vs pipe?" Same idea, opposite order (compose right-to-left, pipe left-to-right). "HOC relation?" HOCs compose components like functions. "Composition over inheritance?" React avoids class inheritance hierarchies; you compose components/hooks instead — more flexible and the FP way. "Custom hooks?" Compose behavior by using hooks within hooks.`,
        },
      ],
      tip: "React Server Components must be pure functions. Hooks rules enforce pure-function-like constraints. FP is baked into React.",
      rajnishAngle: "",
    },
  ],
};
