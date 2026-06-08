import type { Week } from "../types";

export const week03: Week = {
  week: 6,
  theme: "React Deep Dive",
  color: "#06B6D4",
  topics: [
    {
      title: "Rendering & Reconciliation",
      subtopics: ["Virtual DOM diffing", "React Fiber", "Reconciliation algorithm", "Keys"],
      questions: [
        {
          q: "How does React's reconciliation algorithm work?",
          answer: `Reconciliation is how React decides what changed between the previous render's element tree and the new one, and computes the minimal set of DOM mutations. A general tree-diff is O(n³); React makes it O(n) with two heuristics:

1. **Different element types -> replace the whole subtree.** If a node changes from \`<div>\` to \`<span>\` (or component A to component B), React unmounts the old subtree and mounts a fresh one — it does NOT try to diff across types.
2. **Same type -> keep the DOM node, update props, recurse into children.** It diffs attributes and continues down.
3. **Lists are matched by \`key\`,** not position — keys let React detect moves/inserts/removes instead of re-rendering everything.

~~~
old:  <ul>           new:  <ul>
        <li>A</li>           <li>B</li>
        <li>B</li>           <li>A</li>
      </ul>                 </ul>

without keys: diff by index -> "A->B, B->A" = rewrite both
with keys:    match by key  -> just REORDER the existing nodes
~~~

~~~jsx
// stable identity via key -> React moves nodes, preserves state/DOM
{items.map((it) => <Row key={it.id} data={it} />)}
~~~

The render happens in two conceptual phases (Fiber): the **render phase** builds the new tree and diffs (interruptible, no DOM writes, must be pure), and the **commit phase** applies the mutations to the DOM (synchronous, runs effects).

Why the heuristics are safe in practice: type changes across the same position are rare, and developers provide stable keys for lists — so the O(n) approximation matches real apps. Follow-up: "Why is a full tree diff O(n³)?" Optimal tree edit distance is cubic; React trades theoretical optimality for linear speed using the assumptions above. "What forces a remount?" Type change, or a changed \`key\` on the same element.`,
        },
        {
          q: "Why are keys important in lists? What happens with duplicate keys?",
          answer: `Keys give list children a **stable identity** across renders so React can match old and new elements by key (not by array index) and thus reorder/insert/remove efficiently — and, crucially, preserve each item's component state and DOM (focus, input text, scroll) when the list changes.

The index-as-key bug: when items are inserted/removed/reordered, indices shift, so React mismatches elements and **carries state to the wrong row**:
~~~jsx
// ❌ index key: prepend an item and every row's state shifts down
{items.map((it, i) => <input key={i} defaultValue={it.name} />)}
// ✅ stable id: state stays glued to the correct item
{items.map((it) => <input key={it.id} defaultValue={it.name} />)}
~~~

~~~
prepend "Z" to [A,B,C]
index keys: key0 was A now Z -> React thinks A "became" Z -> A's input
            state lands on the wrong item (visual/state corruption)
id keys:    Z is new (insert), A/B/C keep their keys -> state intact
~~~

**Duplicate keys**: React warns ("Encountered two children with the same key"). Behaviour becomes undefined/buggy — React can't tell the two apart, so updates, reordering, and reconciliation get confused: items may share/lose state, fail to update, or one may be dropped. It's a correctness bug, not just a warning.

Rules: keys must be **unique among siblings** (not globally) and **stable** across renders. Don't use \`Math.random()\` (changes every render -> forces remount, kills perf and state) or array index when the list can reorder/insert/delete. Index is acceptable only for static, append-only lists.

Production angle: with duplicate keys, mistakes show up as inputs holding the wrong value or list items not updating — debugging tip: that warning is the first thing to check. Follow-up: "Does changing a key intentionally reset a component?" Yes — a common trick to force-remount (e.g. reset a form) is to change its \`key\`.`,
        },
        {
          q: "What is React Fiber and why was it introduced?",
          answer: `Fiber is React's reconciler architecture (since React 16) — a complete rewrite that makes rendering **interruptible**. Before Fiber, reconciliation was a single synchronous recursive walk of the tree (the "stack reconciler") that, once started, ran to completion and **blocked the main thread**. Long renders froze input, animations, and paint.

Fiber breaks rendering into **units of work** (one "fiber" node per element) stored as a linked-list tree, so React can:
- **Pause** work, yield to the browser (handle input, paint), and **resume** later.
- **Prioritize** updates (urgent input vs non-urgent data) — the basis of concurrent features.
- **Abort/restart** in-progress renders (e.g. a newer, higher-priority update arrives).
- Reuse a fiber's previous state ("double buffering": current tree vs work-in-progress tree).

~~~
Stack reconciler (pre-16):  [-------- render whole tree, blocking --------]  paint
Fiber:                      [ work ][yield][ work ][yield][ work ] paint  (cooperative)
~~~

Two phases enabled by Fiber:
- **Render/reconcile phase** — interruptible, pure, no side effects, builds the WIP tree and diffs. Can be thrown away.
- **Commit phase** — synchronous and uncancellable; applies DOM mutations and runs effects (\`useLayoutEffect\` then paint then \`useEffect\`).

Why it matters (the "why"): it unlocked **concurrent React** — \`useTransition\`, \`useDeferredValue\`, \`Suspense\` for data, automatic batching, streaming SSR — all rely on React being able to interrupt and prioritize. Explain Fiber simply as **"incremental, interruptible rendering with priorities."**

Pitfall it creates: because the render phase can run **multiple times / be discarded**, components must be **pure** (no side effects during render) — putting a side effect in the render body can run unexpectedly. Follow-up: "Does Fiber make rendering parallel?" No — still single-threaded; it makes it *interruptible and scheduled*, not multi-threaded.`,
        },
      ],
      tip: "Explain Fiber as 'incremental rendering' — it lets React pause and resume work.",
      rajnishAngle: "",
    },
    {
      title: "Hooks — Deep Understanding",
      subtopics: [
        "useState batching",
        "useEffect cleanup",
        "useCallback/useMemo",
        "useRef vs useState",
        "Custom hooks",
      ],
      questions: [
        {
          q: "When does React batch state updates? What changed in React 18?",
          answer: `Batching means React groups multiple state updates into a **single re-render** for performance. Pre-18, React only batched updates inside React **event handlers**. Updates in async contexts (promises, \`setTimeout\`, native event listeners) were **not** batched — each \`setState\` triggered its own render.

React 18 introduced **automatic batching**: updates are batched **everywhere** — including promises, timeouts, and async callbacks — as long as they go through React's update mechanism.

~~~jsx
// React 17: 2 renders (not batched in async)   React 18: 1 render (batched)
setTimeout(() => {
  setCount((c) => c + 1);
  setFlag((f) => !f);   // pre-18: each causes a render; 18+: one render
}, 0);

// Both versions batch inside an event handler -> 1 render:
function onClick() {
  setCount((c) => c + 1);
  setFlag((f) => !f);   // always 1 render
}
~~~

~~~
React 17:  handler -> [batched]   async -> setState, render, setState, render
React 18:  handler -> [batched]   async -> [batched] -> single render
~~~

Why batching matters: fewer renders = less reconciliation, no intermediate inconsistent UI states, better INP. Automatic batching makes behaviour consistent regardless of where the update originates.

Two follow-ups they ask:
- **Opt out** with \`flushSync(() => setX(...))\` when you need the DOM updated synchronously between two updates (rare — e.g. measure layout immediately).
- **Stale state in batches** — within a batch, \`setCount(count + 1)\` twice still increments once because \`count\` is the same snapshot; use the **updater form** \`setCount(c => c + 1)\` to compound correctly.

Production angle: automatic batching reduced redundant re-renders in async data handlers (fewer renders on the news feed after fetches resolve), improving interaction latency. Follow-up: "Is batching the same as concurrent rendering?" No — batching collapses updates into one render; concurrency is about interruptibility/priority. They're separate React 18 features.`,
        },
        {
          q: "What happens if you return a function from useEffect?",
          answer: `The returned function is the effect's **cleanup**. React runs it (a) before re-running the effect on a dependency change, and (b) when the component unmounts. It's how you tear down subscriptions, timers, listeners, and aborts to prevent leaks and stale work.

~~~jsx
useEffect(() => {
  const id = setInterval(tick, 1000);
  window.addEventListener("resize", onResize);
  return () => {                  // cleanup
    clearInterval(id);
    window.removeEventListener("resize", onResize);
  };
}, []);                           // [] -> setup on mount, cleanup on unmount
~~~

Timing / order (the part people miss):
~~~
deps change:  cleanup(old) ──▶ effect(new)
unmount:      cleanup(final)
mount:        effect (no cleanup yet)
~~~
On every dependency change React runs the **previous** cleanup *before* the next effect — so you always remove the old subscription before adding a new one (no double-subscribe, no leak).

Common uses: \`removeEventListener\`, \`clearInterval/clearTimeout\`, \`AbortController.abort()\` for in-flight fetches, unsubscribing from stores/sockets.

Strict Mode gotcha (React 18 dev): effects run **mount -> cleanup -> mount** intentionally, to surface missing/incorrect cleanup. If your effect isn't idempotent (e.g. it double-subscribes without cleaning up), Strict Mode exposes the bug. This is dev-only; production mounts once.

~~~jsx
// fetch with cleanup to avoid setting state after unmount / race
useEffect(() => {
  const c = new AbortController();
  fetch(url, { signal: c.signal }).then(setData).catch(ignoreAbort);
  return () => c.abort();
}, [url]);
~~~

Follow-up: "What if cleanup is missing?" Leaks (listeners pile up), stale closures updating unmounted components, overlapping intervals. "Does cleanup see fresh or old values?" It closes over the values from the render that *created* it (the old ones) — which is exactly what you want for removing the right listener.`,
        },
        {
          q: "When should you use useMemo vs useCallback?",
          answer: `Both memoize to preserve referential stability across renders, but they cache different things: \`useMemo\` caches a **computed value**; \`useCallback\` caches a **function reference**. \`useCallback(fn, deps)\` is literally \`useMemo(() => fn, deps)\`.

~~~jsx
// useMemo: avoid recomputing an expensive value each render
const sorted = useMemo(() => bigList.slice().sort(cmp), [bigList]);

// useCallback: keep a stable function identity (for deps / memoized children)
const handleClick = useCallback((id) => select(id), [select]);
~~~

When each is actually worth it (the "why" — don't memoize reflexively):
- **useMemo** — (1) the computation is genuinely expensive (sorting/filtering large data, heavy derivation), OR (2) the value is an object/array passed to a memoized child or used in another hook's deps, where a new reference each render would break memoization/cause re-renders.
- **useCallback** — the function is passed to a \`React.memo\` child or used as a dependency of \`useEffect\`/\`useMemo\`. A fresh function identity each render would re-render the memoized child or re-fire the effect.

~~~
useMemo    -> returns the RESULT of calling the fn   (a value)
useCallback-> returns the FN itself                  (a reference)
~~~

The trap interviewers probe: **over-memoization**. Memoization isn't free — it costs memory and a deps comparison every render, and adds complexity. For cheap computations or functions not passed to memoized children, \`useMemo\`/\`useCallback\` can be **net-negative**. Memoize when profiling shows a real re-render/compute problem, or when referential stability is required for correctness.

Note: **React 19 + the React Compiler** auto-memoizes, reducing the need to hand-write these — mention it to show currency.

~~~jsx
// useCallback only helps because Child is memoized:
const Child = React.memo(function Child({ onPick }) { /* ... */ });
const onPick = useCallback((x) => setSel(x), []); // stable -> Child won't re-render
~~~

Follow-up: "useCallback with no deps and stale closure?" An empty-deps callback captures the first render's values — use the updater form or include deps. "Difference from useRef for stability?" useRef gives a mutable container, not a memoized value; different tool.`,
        },
        {
          q: "How do you design a good custom hook in React, and what mistakes do interviewers look for?",
          answer: `A custom hook extracts **reusable stateful logic** into a function. It is for sharing behavior, not for rendering UI.

~~~jsx
function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
~~~

What makes a hook well-designed:
- it starts with \`use\`
- it still follows the Rules of Hooks
- it exposes a small predictable API
- it hides effect setup, cleanup, and repeated logic cleanly

Good design principles:
- accept explicit inputs instead of depending on hidden globals
- return only what callers actually need
- keep side effects predictable
- avoid leaking implementation details

Common interview mistakes:
- calling hooks conditionally inside the custom hook
- mixing JSX rendering with hook logic
- returning unstable objects/functions carelessly
- missing dependencies and creating stale closure bugs
- doing too many unrelated jobs in one hook

Strong interview answer:
"I treat a custom hook like a small internal API. It should share stateful behavior, have explicit inputs, predictable outputs, and proper cleanup without coupling callers to internal implementation details."`,
        },
      ],
      tip: "Know the rules of hooks cold. Senior candidates are expected to know the 'why', not just the 'what'.",
      rajnishAngle:
        "Your video module integration and scroll handlers likely use these — be ready to discuss.",
    },
    {
      title: "Performance Optimization",
      subtopics: ["React.memo", "Code splitting", "Lazy loading", "Profiler", "Avoiding re-renders"],
      questions: [
        {
          q: "How do you prevent a child component from re-rendering unnecessarily?",
          answer: `A child re-renders when its parent re-renders (by default, regardless of prop changes) or when its own state/context changes. To prevent *unnecessary* re-renders, you must both **memoize the component** and **stabilize its props**.

Techniques, roughly in order:

1. **\`React.memo\`** — wraps a component so it re-renders only when props change (shallow compare):
~~~jsx
const Row = React.memo(function Row({ data, onSelect }) { /* ... */ });
~~~

2. **Stabilize prop references** — \`React.memo\` is useless if you pass new object/array/function literals each render. Memoize them:
~~~jsx
const onSelect = useCallback((id) => select(id), []);      // stable fn
const style = useMemo(() => ({ color }), [color]);          // stable object
<Row data={data} onSelect={onSelect} />
~~~

3. **Lift/move state down or split components** — if only part of a big component changes, isolate the changing part so the expensive part isn't re-rendered. State colocation is often the best "optimization."

4. **\`children\` as a prop** — passing children from a parent that *doesn't* re-render keeps them stable (a structural memoization trick).

5. **Custom comparator** for \`React.memo\` when shallow compare isn't enough (use sparingly — deep compares can cost more than the render).

~~~
parent renders ─▶ child renders (default)
React.memo(child) + stable props ─▶ child SKIPS render when props equal
~~~

The senior caveat (challenge the premise): **most re-renders are cheap** and React is fast. Don't wrap everything in \`memo\`/\`useCallback\` — measure first with the Profiler. Premature memoization adds complexity and its own overhead. Optimize the components that the Profiler shows are actually expensive or rendering too often.

Context gotcha: a Context value change re-renders **all** consumers; split contexts or memoize the provider value to avoid mass re-renders. React 19's compiler auto-memoizes much of this. Production angle: in a long article feed, memoizing row components + stable handlers (and virtualization) prevents the whole list re-rendering on unrelated state changes.`,
        },
        {
          q: "What is React.lazy and how does it work with Suspense?",
          answer: `\`React.lazy\` enables **component-level code splitting**: it takes a function that returns a dynamic \`import()\` and returns a component that's only fetched (a separate JS chunk) when first rendered. \`Suspense\` provides the fallback UI to show while that chunk loads.

~~~jsx
import { lazy, Suspense } from "react";
const HeavyChart = lazy(() => import("./HeavyChart")); // separate bundle

function Dashboard() {
  return (
    <Suspense fallback={<Spinner />}>
      <HeavyChart />   {/* chunk fetched on first render; fallback meanwhile */}
    </Suspense>
  );
}
~~~

~~~
initial bundle:  [app core]            (HeavyChart NOT included)
render <HeavyChart/> ─▶ fetch chunk ─▶ Suspense shows <Spinner/>
chunk arrives ─▶ React swaps in the real component
~~~

How it works under the hood: \`lazy\` returns a component that, on render, **throws the import promise**. \`Suspense\` catches that thrown promise, renders the \`fallback\`, and re-renders the children when the promise resolves. (This "throw a promise" mechanism is the same primitive Suspense uses for data fetching.)

Why / when: shrink the **initial bundle** by deferring code the user may not need immediately — routes, modals, heavy widgets (charts, editors, video players), below-the-fold features. Faster initial load, better LCP/TTI.

Rules & gotchas:
- The lazily-imported module must have a **default export** (or wrap a named export).
- Always wrap in **\`Suspense\`** (a lazy component without a Suspense boundary throws).
- Add an **error boundary** to handle chunk-load failures (network error fetching the chunk).
- For routes, split at the route level; for interactions, lazy-load on hover/intent to hide latency.

~~~jsx
// preload on intent to hide the fetch latency:
const load = () => import("./HeavyChart");
<button onMouseEnter={load} onClick={openChart}>Open</button>
~~~

Production angle: lazy-loading non-critical widgets/below-the-fold modules was part of cutting the initial bundle (~22%). Follow-up: "lazy vs next/dynamic?" In Next.js, \`next/dynamic\` wraps lazy + Suspense with SSR control (\`ssr: false\`) — preferred there. "What can Suspense's fallback cause?" A layout shift if the fallback and content differ in size — reserve space to protect CLS.`,
        },
        {
          q: "How do you profile a React app for performance issues?",
          answer: `Use the **React DevTools Profiler** plus the browser **Performance panel** together: the Profiler tells you *which components render, how often, and why*; the Performance panel tells you *where main-thread time and long tasks go*.

React DevTools Profiler workflow:
1. Open **Profiler** tab -> record -> perform the interaction -> stop.
2. Read the **flame graph** (each bar = a component; width = render time) and the **ranked chart** (most expensive components first).
3. Enable **"Record why each component rendered"** — it shows the trigger: props changed, state changed, parent rendered, or context changed. This pinpoints *unnecessary* re-renders.
4. Look for: components rendering on unrelated state changes, wide/expensive bars, and "rendered but props didn't change" (a \`React.memo\`/stable-prop opportunity).

~~~
Profiler flame graph:
  <Feed>            ████████░░  (re-renders on every keystroke — suspicious)
    <Row> x50       ██          (all 50 re-render — needs memo + keys + virtualization)
  reason: "parent rendered"  -> isolate state / memo rows
~~~

Chrome **Performance panel** (for the runtime cost):
- Record with **CPU 4–6x slowdown + Fast 3G** to mimic a mid-range Android (real audience).
- Find **Long Tasks** (>50ms, red-flagged) on the main thread; expand the flame chart bottom-up to see which functions/scripts dominate.
- Correlate React commits with scripting spikes; check for layout thrashing (forced reflows).

Other tools: the **Profiler API** (\`<Profiler onRender>\`) for programmatic timing, **why-did-you-render** for catching avoidable renders in dev, and **web-vitals**/Lighthouse for field-level INP/LCP.

The method (senior framing): **measure -> identify the worst offender -> fix -> re-measure.** Don't guess. Typical fixes the Profiler reveals: memoize a hot child + stabilize props, colocate/split state to shrink render scope, virtualize long lists, defer non-urgent updates with \`useTransition\`/\`useDeferredValue\`, code-split heavy components.

Production angle: profiling an article feed under CPU throttling exposed that an unrelated header state change re-rendered all feed rows — fixed by state colocation + memoized rows, improving INP. Follow-up: "How do you fix a long task you found?" Break it up / yield (\`scheduler.yield\`), move work off-main-thread (Web Worker), or defer it as non-urgent.`,
        },
      ],
      tip: "Mention bundle size reduction story (22%) — it's a perfect answer for performance questions.",
      rajnishAngle: "22% bundle reduction at Times Internet is a gold-standard answer here.",
    },
    {
      title: "State Management",
      subtopics: ["Context vs Redux", "Zustand/Jotai", "React Query / server state", "Derived state patterns", "Reducer pattern", "Context performance"],
      questions: [
        {
          q: "When would you choose Context API over Redux?",
          answer: `Context and Redux solve overlapping but different problems. **Context is a dependency-injection mechanism** (pass a value down the tree without prop drilling) — it is NOT a state-management library and has no optimized update model. **Redux is a full state container** with a single store, predictable reducers, middleware, devtools, and selective subscriptions.

Choose **Context** when:
- The state is **low-frequency** and **global-ish** UI config: theme, locale, current user, feature flags, auth status.
- You mainly need to **avoid prop drilling**, not manage complex evolving state.
- Simplicity matters — no extra dependency.

Choose **Redux** (or Zustand/Jotai) when:
- State updates are **frequent** and **fine-grained**, with many consumers needing different slices.
- You need **devtools, time-travel, middleware** (sagas/thunks), structured async flows, or a large team needing predictable conventions.

~~~
Context:  Provider value changes ─▶ ALL consumers re-render (no selectors)
Redux:    store changes ─▶ only components whose SELECTED slice changed re-render
~~~

The performance gotcha that drives the decision: **any change to a Context value re-renders every consumer**, regardless of which part they use. Redux (with \`useSelector\`) and Zustand subscribe to *slices*, so only affected components re-render. Putting fast-changing state (e.g. form keystrokes, mouse position) in a single Context is a classic performance bug.

Mitigations if you stay on Context: **split contexts** by concern, **memoize the provider value**, and separate "state" vs "dispatch" contexts so updaters don't re-render readers.

The modern nuance (challenge the binary): the real competitors to Redux today are **Zustand/Jotai** (simpler, selector-based, less boilerplate) for client state, and **React Query/SWR** for *server* state. Many apps need neither Redux nor much Context. Reach for Redux when you genuinely have complex, shared, frequently-updated client state. Production angle: theme/locale/user via Context; server data via React Query; rarely a global Redux store.`,
        },
        {
          q: "What is the difference between server state and client state?",
          answer: `**Client state** is owned by the UI and lives only in the browser: form inputs, toggles, modals open/closed, selected tab, theme. You control it fully and it's synchronous. **Server state** is data that lives on a server, is fetched asynchronously, is **shared/owned elsewhere**, and can become **stale** because others can change it. Conflating the two is the root of a lot of overcomplicated Redux code.

~~~
Client state          Server state
- you own it          - server owns it (a cache on the client)
- synchronous         - async (fetch)
- always fresh        - can go stale (someone else edits it)
- e.g. isModalOpen    - e.g. user profile, article list, cart from API
~~~

Why the distinction matters: server state needs things client state doesn't — **caching, deduplication, background refetching, revalidation (stale-while-revalidate), retries, pagination, optimistic updates, request cancellation**. Hand-rolling all that in Redux is huge boilerplate and error-prone. That's why **server-state libraries** (React Query, SWR, RTK Query, Apollo) exist — they treat client-side server data as a **cache** with freshness policies, not as canonical state.

~~~jsx
// server state: declarative cache with freshness + dedupe + retries
const { data, isLoading, error } = useQuery({
  queryKey: ["article", id],
  queryFn: () => fetchArticle(id),
  staleTime: 60_000,        // serve cached for 60s, then revalidate
});

// client state: plain useState
const [isOpen, setOpen] = useState(false);
~~~

The senior framing: **"Most of what people put in Redux is actually server state."** Move server data to React Query/SWR; keep a small amount of genuine client state in useState/Context/Zustand. This shrinks global state dramatically and removes manual loading/error/caching code.

Follow-up: "Where does derived state fit?" Compute it during render from server+client state (don't duplicate it into state). "Can server state be the source of truth?" The server is the source of truth; the client holds a synchronized cache that you revalidate.`,
        },
        {
          q: "How does React Query handle caching and revalidation?",
          answer: `React Query keeps a **normalized-by-key cache** (the QueryCache, keyed by \`queryKey\`) and follows a **stale-while-revalidate** model: it serves cached data instantly, then refetches in the background when data is considered stale, and updates the UI when fresh data arrives.

Core lifecycle concepts:
- **\`staleTime\`** — how long data is considered **fresh**. While fresh, mounts/refocuses serve cache with **no network request**. Default \`0\` (immediately stale -> background refetch on next trigger).
- **\`gcTime\`** (formerly cacheTime) — how long **unused** (no observers) data stays in memory before garbage collection (default 5 min).
- **Triggers for revalidation**: component mount, window **refocus**, network **reconnect**, interval (\`refetchInterval\`), or manual \`invalidateQueries\`.
- **Dedupe**: concurrent requests for the same key collapse into one.

~~~
fresh (within staleTime):  serve cache, NO fetch
stale (past staleTime):    serve cache instantly + background refetch -> update
unused past gcTime:        evict from memory
~~~

~~~jsx
useQuery({
  queryKey: ["feed", category],
  queryFn: () => fetchFeed(category),
  staleTime: 30_000,       // fresh for 30s
  gcTime: 5 * 60_000,      // keep 5 min after unused
});
// elsewhere, on publish:
queryClient.invalidateQueries({ queryKey: ["feed"] }); // mark stale -> refetch
~~~

Invalidation vs refetch: \`invalidateQueries\` marks matching queries **stale** so they refetch when next observed (surgical, by key prefix). You can also \`setQueryData\` to write the cache directly (used in optimistic updates).

Why it's powerful: you get instant UI from cache (perceived speed), automatic freshness (no manual loading/refetch glue), dedupe (less server load), retries, and pagination/infinite-query helpers — all declarative. The mental model is **"the client cache mirrors the server; revalidate on policy."**

Production angle: news feed with \`staleTime\` tuned per data type (short for breaking-news lists, longer for evergreen), \`invalidateQueries\` triggered on publish webhooks, refetch-on-focus so a returning reader sees fresh headlines. Follow-up: "How does this relate to HTTP/CDN caching?" It's an additional in-memory layer on the client; together with browser/CDN/Nginx caches it forms the multi-layer caching stack — React Query is the closest, app-aware layer.`,
        },
        {
          q: "When should you use useReducer instead of useState?",
          answer: `Use **\`useState\`** for simple isolated values. Use **\`useReducer\`** when state transitions are more complex, when several fields change together, or when you want updates represented as named **actions**.

~~~jsx
function reducer(state, action) {
  switch (action.type) {
    case "change":
      return { ...state, [action.field]: action.value };
    case "reset":
      return { name: "", email: "", errors: {} };
    case "setErrors":
      return { ...state, errors: action.errors };
    default:
      return state;
  }
}

const [state, dispatch] = useReducer(reducer, {
  name: "",
  email: "",
  errors: {},
});
~~~

Why it helps:
- keeps state logic centralized
- makes multi-step updates explicit
- works well for forms, wizards, and state machines

~~~
useState   -> simple field/value updates
useReducer -> related transitions with clear action names
~~~

The senior framing: when you start passing many setters around or coordinating several related updates in one event, a reducer often improves readability and predictability. Follow-up: "Is useReducer basically local Redux?" Conceptually yes — reducer + action model, just scoped locally.`,
        },
        {
          q: "What are the common Context performance pitfalls and how do you avoid them?",
          answer: `The biggest Context pitfall is that **when the provider value changes, every consumer re-renders**. That makes Context fine for low-frequency global state, but risky for fast-changing shared state.

Common mistakes:
1. one giant context for unrelated concerns
2. passing a new object literal as the provider value every render
3. putting hot state like form keystrokes or mouse position into Context

~~~jsx
// ❌ new object each render -> all consumers re-render
<AppContext.Provider value={{ user, theme, toggleTheme }}>
  {children}
</AppContext.Provider>
~~~

Better:

~~~jsx
const value = useMemo(() => ({ user, theme, toggleTheme }), [user, theme, toggleTheme]);
<AppContext.Provider value={value}>{children}</AppContext.Provider>
~~~

Other fixes:
- split contexts by concern
- separate state and dispatch contexts
- move hot state to selector-based tools like Zustand/Redux

~~~
one broad context   -> large re-render blast radius
small focused ones  -> smaller, cheaper updates
~~~

Why it matters: many candidates know Context conceptually but miss its update model. Production angle: splitting a giant app context often removes avoidable list/feed re-renders. Follow-up: "Can Context replace Redux?" Sometimes, but not when you need fine-grained subscriptions at scale.`,
        },
      ],
      tip: "Interviewers want to know you can choose the right tool. Context for global UI state, React Query for server data.",
      rajnishAngle: "",
    },
    {
      title: "Forms & Validation",
      subtopics: [
        "Controlled vs uncontrolled inputs",
        "Validation timing",
        "Debounced async validation",
        "File upload basics",
        "Preventing double submit",
      ],
      questions: [
        {
          q: "What is the difference between controlled and uncontrolled form components in React?",
          answer: `A **controlled input** gets its value from React state and updates via \`onChange\`. An **uncontrolled input** keeps its own state in the DOM, and you usually read it via a ref or on submit.

~~~jsx
// controlled
const [name, setName] = useState("");
<input value={name} onChange={(e) => setName(e.target.value)} />

// uncontrolled
const inputRef = useRef(null);
<input ref={inputRef} defaultValue="Raj" />
~~~

Controlled inputs are best when:
- validation/UI depends on the current value
- React should own the source of truth

Uncontrolled inputs are useful when:
- the form is simple
- you want lower state-management overhead
- you're integrating with native form behavior or third-party code

~~~
controlled   -> React state is source of truth
uncontrolled -> DOM input is source of truth
~~~

The senior answer is usually: use controlled inputs by default for rich app forms, but know uncontrolled inputs are valid and sometimes simpler. Follow-up: "Why does React warn about switching?" Because an input should not move from uncontrolled to controlled mid-lifecycle or vice versa.`,
        },
        {
          q: "How would you structure validation in a real-world frontend form?",
          answer: `A strong real-world form usually has **three layers** of validation:

1. **client-side syntax/required checks** for instant UX
2. **async validation** for rules like uniqueness
3. **server-side final validation** as the source of truth

~~~js
function validate(values) {
  const errors = {};
  if (!values.email) errors.email = "Email is required";
  else if (!/\\S+@\\S+\\.\\S+/.test(values.email)) errors.email = "Invalid email";
  if (values.password.length < 8) errors.password = "Minimum 8 characters";
  return errors;
}
~~~

Good UX patterns:
- avoid showing all errors before the user interacts
- validate some fields on blur, not every keystroke
- debounce expensive async checks
- always show field-specific, actionable messages

The key principle: **client validation improves UX, server validation enforces truth**. Never rely only on the client because requests can be forged and server rules may change.

Why it matters: forms are one of the most common frontend interview areas because they combine state, UX, and API concerns. Follow-up: "Validate on change or blur?" Lightweight format checks can happen on change; noisier checks often feel better on blur or submit.`,
        },
        {
          q: "How do you handle file uploads and prevent double-submit issues in a form?",
          answer: `File uploads usually send **multipart/form-data**, commonly via a \`FormData\` object. To prevent double-submit issues, track a **pending/submitting** state and ignore or disable repeated submits while the request is in flight.

~~~js
async function handleSubmit(event) {
  event.preventDefault();
  if (isSubmitting) return;

  setIsSubmitting(true);
  try {
    const form = new FormData();
    form.append("file", file);
    form.append("title", title);

    await fetch("/api/upload", {
      method: "POST",
      body: form,
    });
  } finally {
    setIsSubmitting(false);
  }
}
~~~

Important notes:
- don't manually set the multipart boundary header when using \`FormData\`
- validate file type/size before uploading for faster feedback
- show progress for large uploads when needed
- disable or guard the submit button while pending

~~~
without submit guard -> duplicate requests possible
with pending flag    -> second submit is ignored/disabled
~~~

Why it matters: this is a common interview scenario because it mixes form UX with real browser/network behavior. Follow-up: "How do you show upload progress?" Use XHR upload progress events or a higher-level upload library when progress feedback is important.`,
        },
      ],
      tip: "Client-side validation is for UX; server-side validation is for truth. Mention both.",
      rajnishAngle:
        "Forms are a classic frontend interview area because they combine state, validation, and API coordination in one place.",
    },
    {
      title: "Error Boundaries & Suspense",
      subtopics: ["Error boundaries", "Suspense for data fetching", "Concurrent features"],
      questions: [
        {
          q: "How do you implement an error boundary?",
          answer: `An error boundary is a component that **catches JavaScript errors thrown during rendering, in lifecycle methods, and in constructors of its child tree**, shows a fallback UI, and prevents the whole app from unmounting (a white screen). As of today they **must be class components** — there's no hook equivalent; you use the two lifecycles \`getDerivedStateFromError\` (render the fallback) and \`componentDidCatch\` (log the error).

~~~jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error }; // update state -> render fallback
  }
  componentDidCatch(error, info) {
    // side effect: log to Sentry with component stack
    reportError(error, info.componentStack);
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? <p>Something went wrong.</p>;
    return this.props.children;
  }
}

// usage — wrap risky/independent subtrees
<ErrorBoundary fallback={<AdFallback />}>
  <AdWidget />
</ErrorBoundary>
~~~

~~~
child throws during render ─▶ nearest ErrorBoundary catches
  ─▶ getDerivedStateFromError -> fallback UI
  ─▶ componentDidCatch -> log
rest of the app keeps working
~~~

What error boundaries do **NOT** catch (important):
- Errors in **event handlers** (use try/catch there).
- **Asynchronous** code (\`setTimeout\`, promises) — not during render.
- **Server-side rendering** errors.
- Errors thrown **in the boundary itself**.

Best practices: place boundaries **strategically** to isolate failures — wrap independent widgets so one crashing widget doesn't take down the page; provide a **reset** mechanism (e.g. a "Try again" that changes a key to remount). In practice teams use **\`react-error-boundary\`** (a maintained library) which adds \`onReset\`, \`resetKeys\`, and a hook-friendly API.

Production angle: wrapping ad widgets and the video module in error boundaries so a third-party/ad failure renders a small fallback instead of blanking the article. Follow-up: "How do boundaries interact with Suspense?" A boundary catches the *error* path; Suspense handles the *loading* path — you typically nest both (ErrorBoundary outside, Suspense inside).`,
        },
        {
          q: "What can Suspense NOT catch?",
          answer: `Suspense handles the **loading/pending** state of a subtree — it shows a \`fallback\` while a child "suspends" (throws a promise). It is specifically *not* an error handler and has clear boundaries on what it coordinates.

Suspense does NOT catch / handle:
1. **Errors** — if data fetching *fails* (rejects), Suspense doesn't show the fallback for that; the error propagates and must be caught by an **error boundary**. Suspense = loading; ErrorBoundary = failure. You pair them.
2. **Event-handler async** — a fetch triggered in \`onClick\` doesn't suspend rendering; Suspense only reacts to suspending *during render*.
3. **Arbitrary promises/async effects** — Suspense integrates with frameworks/libraries that implement the suspending contract (React 19 \`use()\`, Next.js data fetching, React Query's suspense mode, \`React.lazy\`). A bare \`await\` in \`useEffect\` won't trigger it.
4. **Updates already committed** — Suspense governs the transition to new content, not post-commit changes.

~~~jsx
<ErrorBoundary fallback={<Error />}>   {/* catches failures */}
  <Suspense fallback={<Skeleton />}>   {/* catches loading */}
    <Article id={id} />                {/* suspends on data / lazy load */}
  </Suspense>
</ErrorBoundary>
~~~

~~~
child suspends (pending) ─▶ <Suspense fallback> shows skeleton
child rejects (error)    ─▶ Suspense does NOT help ─▶ <ErrorBoundary> shows error
~~~

The mechanism: a component "suspends" by **throwing a promise** during render; Suspense catches that thrown *promise* and renders the fallback until it resolves. If instead an **error** is thrown, that's an error boundary's job. So the two are complementary halves of async UI — loading and failure.

Follow-up: "Does Suspense work with arbitrary data fetching today?" In React 19, \`use(promise)\` and framework integrations make it first-class on the client/server; you generally don't throw promises by hand. "Streaming SSR + Suspense?" Next.js streams HTML and reveals Suspense boundaries as their data resolves — fallback first, real content streamed in.`,
        },
        {
          q: "How does Suspense interact with concurrent rendering?",
          answer: `Concurrent rendering (Fiber + React 18) lets React prepare UI **in the background without blocking**, and Suspense is the coordination point for async content during those interruptible renders. Together they avoid jarring loading flashes and keep the app responsive while new content loads.

Key interactions:
1. **Transitions** (\`useTransition\`/\`startTransition\`) mark an update as **non-urgent**. During the transition, React can keep showing the **current** UI (no fallback flash) while it renders the new content in the background, then swap when ready. Without a transition, a suspending update would immediately show the Suspense fallback.

~~~jsx
const [isPending, startTransition] = useTransition();
function onTabChange(tab) {
  startTransition(() => setTab(tab)); // keep old tab visible while new one loads
}
// isPending -> show a subtle inline spinner, NOT a full fallback
~~~

2. **Avoiding fallback "flicker"** — React 18 won't hide already-visible content to show a fallback for a transition; it waits. For brand-new boundaries it shows the fallback. \`useDeferredValue\` similarly lets you render stale content while fresh content prepares.

3. **Streaming SSR** — on the server, React streams HTML and uses Suspense boundaries to **flush** content progressively: the shell + fallbacks stream first, then each boundary's real HTML streams in as its data resolves, and hydration is selective. This improves TTFB and lets users see content sooner.

~~~
urgent (no transition):   suspend ─▶ show fallback immediately
transition/deferred:      keep current UI ─▶ prepare new in bg ─▶ swap (no flash)
streaming SSR:            shell+fallbacks flush ─▶ boundaries stream in as ready
~~~

Why this matters: concurrent features turn Suspense from a simple spinner into a tool for **smooth, interruptible UX** — instant feedback (\`isPending\`), no layout-thrash from flashing spinners, prioritized input over background data, and faster perceived loads via streaming.

Production angle: tab/category switches on the news app using \`startTransition\` so the current view stays put with a subtle pending indicator instead of blanking to a skeleton; streaming SSR flushes the article shell first, then ads/recommendations stream in. Follow-up: "Difference between useTransition and useDeferredValue?" Transition wraps the *state update*; deferredValue wraps a *derived value* — both keep the UI responsive while heavy/suspending work prepares.`,
        },
      ],
      tip: "Error boundaries are class components only — knowing this shows depth.",
      rajnishAngle:
        "You can mention wrapping ad widgets and video modules in error boundaries at Times Internet.",
    },
    {
      title: "All React Hooks (with examples)",
      subtopics: [
        "State: useState, useReducer",
        "Effects: useEffect, useLayoutEffect, useInsertionEffect",
        "Refs/perf: useRef, useMemo, useCallback, useImperativeHandle",
        "Context, useId, useDebugValue",
        "Concurrent: useTransition, useDeferredValue, useSyncExternalStore",
        "React 19: use, useActionState, useFormStatus, useOptimistic",
      ],
      questions: [
        {
          q: "Walk through all the core React hooks with a one-line example of each.",
          answer: `Hooks let function components use state and lifecycle features. Group them by purpose — interviewers like a structured tour:

**State hooks:**
~~~jsx
// useState — local state
const [count, setCount] = useState(0);
setCount(c => c + 1);                    // updater form (safe in batches)

// useReducer — complex/related state via a reducer (Redux-style, local)
const [state, dispatch] = useReducer(reducer, initialState);
dispatch({ type: 'increment' });
~~~

**Effect hooks (side effects):**
~~~jsx
// useEffect — run after render/paint (data fetch, subscriptions); cleanup on unmount/deps change
useEffect(() => { const id = setInterval(tick, 1000); return () => clearInterval(id); }, []);

// useLayoutEffect — runs SYNCHRONOUSLY after DOM mutation, BEFORE paint (measure/mutate layout)
useLayoutEffect(() => { const h = ref.current.offsetHeight; setH(h); }, []);

// useInsertionEffect — fires before layout effects; for CSS-in-JS libs to inject styles (rarely used directly)
~~~

**Ref & performance hooks:**
~~~jsx
// useRef — mutable container that persists across renders WITHOUT causing re-render (DOM refs / instance vars)
const inputRef = useRef(null);  inputRef.current.focus();

// useMemo — memoize an expensive computed VALUE
const sorted = useMemo(() => bigList.slice().sort(cmp), [bigList]);

// useCallback — memoize a FUNCTION reference (for memoized children / effect deps)
const onPick = useCallback((id) => select(id), []);

// useImperativeHandle — customize the ref a parent gets (expose methods from a child)
useImperativeHandle(ref, () => ({ focus: () => inputRef.current.focus() }), []);
~~~

**Context & utility hooks:**
~~~jsx
// useContext — read a Context value (avoids prop drilling)
const theme = useContext(ThemeContext);

// useId — stable unique IDs across server/client (SSR-safe; for aria-* / label htmlFor)
const id = useId();

// useDebugValue — label a custom hook in React DevTools
useDebugValue(isOnline ? 'Online' : 'Offline');
~~~

**Concurrent hooks (React 18):**
~~~jsx
// useTransition — mark a state update as non-urgent (keep UI responsive)
const [isPending, startTransition] = useTransition();
startTransition(() => setTab(next));

// useDeferredValue — render a "deferred" (stale-but-fast) copy of a fast-changing value
const deferredQuery = useDeferredValue(query);

// useSyncExternalStore — subscribe to an EXTERNAL store correctly (concurrent-safe); used by Redux/Zustand
const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
~~~

**React 19 hooks (forms/async — see next question):** \`use\`, \`useActionState\`, \`useFormStatus\`, \`useOptimistic\`.

~~~
STATE      useState · useReducer
EFFECTS    useEffect · useLayoutEffect · useInsertionEffect
REF/PERF   useRef · useMemo · useCallback · useImperativeHandle
CONTEXT/U  useContext · useId · useDebugValue
CONCURRENT useTransition · useDeferredValue · useSyncExternalStore
REACT 19   use · useActionState · useFormStatus · useOptimistic
~~~

Rules of hooks (always state these): call hooks **only at the top level** (never in conditions/loops/nested functions) and **only from React functions** (components or custom hooks). React tracks hooks by **call order**, so conditional calls break that mapping. The lint rule \`eslint-plugin-react-hooks\` enforces it.

The ones interviewers probe deepest: **useEffect cleanup/deps**, **useMemo vs useCallback** (value vs function), **useRef vs useState** (ref doesn't re-render), **useLayoutEffect vs useEffect** (sync-before-paint vs async-after-paint), and **useSyncExternalStore** (why external stores need it for concurrency). Production angle: \`useRef\` for DOM/scroll handlers and video module instances, \`useTransition\`/\`useDeferredValue\` for responsive tab/search on the feed, \`useSyncExternalStore\` under Zustand/Redux, \`useId\` for accessible form labels (SSR-safe). Follow-up: "useEffect vs useLayoutEffect?" Layout effect runs synchronously before paint (measure DOM, avoid flicker) but blocks paint — use sparingly. "useRef vs useState?" Ref is mutable and persistent but doesn't trigger re-render; state does. "Why useSyncExternalStore?" Concurrent rendering can tear external-store reads; this hook subscribes safely.`,
        },
        {
          q: "What are the important changes introduced in React 19?",
          answer: `React 19 (stable, late 2024) focuses on **simplifying async/forms, server integration, and removing long-standing boilerplate**. The headline changes:

**1. New hooks for actions & forms:**
~~~jsx
// use() — read a Promise OR Context during render (can be called conditionally!)
function Comments({ commentsPromise }) {
  const comments = use(commentsPromise);   // suspends until resolved (with <Suspense>)
  const theme = use(ThemeContext);          // also reads context
}

// useActionState — manage a form action's state (pending, result, errors)
const [state, formAction, isPending] = useActionState(async (prev, formData) => {
  return await submit(formData);
}, initialState);

// useFormStatus — read the parent <form>'s pending status (for submit buttons)
function SubmitButton() { const { pending } = useFormStatus(); return <button disabled={pending}>Save</button>; }

// useOptimistic — show optimistic UI while an action is in flight, auto-rollback on failure
const [optimistic, addOptimistic] = useOptimistic(messages, (state, newMsg) => [...state, newMsg]);
~~~

**2. \`<form>\` Actions** — pass a function to \`<form action={fn}>\` (and \`formAction\` on buttons); React handles submission, pending state, and (with Server Actions) the server round-trip — with **progressive enhancement** (works before JS hydrates):
~~~jsx
<form action={async (formData) => { await save(formData); }}>...</form>
~~~

**3. \`ref\` as a regular prop — \`forwardRef\` no longer needed:**
~~~jsx
// React 19: function components can accept ref directly as a prop
function Input({ ref, ...props }) { return <input ref={ref} {...props} />; }
// no more forwardRef(...) wrapper boilerplate
~~~

**4. The React Compiler (React Forget)** — an optional build-time compiler that **auto-memoizes** components/values, so much hand-written \`useMemo\`/\`useCallback\`/\`React.memo\` becomes unnecessary. (Ships separately; opt-in.)

**5. Server Components & Server Actions** — now stable/first-class (RSC, \`'use server'\` actions) — the foundation Next.js App Router builds on.

**6. Smaller but notable improvements:**
~~~
- Document metadata: render <title>/<meta>/<link> anywhere; React hoists them to <head>
- Stylesheet & async script support with precedence/dedup
- Resource preloading APIs: preload(), preinit(), prefetchDNS(), preconnect()
- Context: <Context> can be used directly as a provider (no <Context.Provider>)
- Better hydration error messages (diffed); cleaner error reporting
- useDeferredValue gets an initial-value option
- Cleanup functions allowed from ref callbacks
~~~

~~~
React 19 themes:
  async/forms made easy  -> use(), Actions, useActionState/useFormStatus/useOptimistic
  less boilerplate       -> ref as prop (no forwardRef), React Compiler (auto-memo),
                            <Context> as provider, metadata anywhere
  server-first           -> stable Server Components + Server Actions
~~~

Why it matters: React 19 changes idiomatic patterns — forms/mutations via **Actions + useActionState/useOptimistic** instead of manual \`useState\`+\`fetch\`, **\`ref\` as a prop** (drop forwardRef), **\`use()\`** for promises/context, and the **React Compiler** reducing manual memoization. Knowing these signals you're current. Production angle: comment/subscribe forms on the news site become \`<form action>\` + \`useActionState\` (+ \`useOptimistic\` for instant feedback), server-rendered metadata via native \`<title>/<meta>\`, and resource hints via \`preconnect()\`/\`preload()\` for the CDN/LCP image. Follow-up: "forwardRef gone?" \`ref\` is now a normal prop in function components. "What does the compiler replace?" Most hand-written \`useMemo\`/\`useCallback\`/\`React.memo\`. "use() vs useEffect-fetch?" \`use(promise)\` reads a promise during render (with Suspense) — declarative async. "Actions?" Functions passed to \`<form action>\`/transitions that handle pending/errors and integrate with Server Actions.`,
        },
      ],
      tip: "Group hooks by purpose: state, effects, ref/perf, context, concurrent, and the new React 19 form/async hooks. Know the rules of hooks cold.",
      rajnishAngle:
        "React 19 Actions + useOptimistic fit comment/subscribe forms on the news app; the React Compiler reduces manual memoization.",
    },
  ],
};
