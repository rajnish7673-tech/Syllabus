import type { Week } from "../types";

export const week03: Week = {
  week: 6,
  theme: "React Deep Dive",
  color: "#06B6D4",
  topics: [
    {
      title: "Rendering & Reconciliation",
      subtopics: ["Virtual DOM diffing", "React Fiber", "Reconciliation algorithm", "Keys", "What is React", "Functional vs class components", "Component lifecycle"],
      questions: [
        {
          q: "What is React, and what are its key features?",
          answer: `React is a **declarative, component-based JavaScript library** for building user interfaces. Instead of imperatively mutating the DOM step by step ("find this element, change its text, add this class"), you describe **what the UI should look like for a given state**, and React figures out how to make the real DOM match that description.

Key features that come up in almost every interview:

- **Declarative** — you write \`<Counter count={n} />\` describing the desired output; React handles the imperative DOM operations to get there. Contrast with vanilla JS/jQuery-style code that manually walks and mutates the DOM.
- **Component-based** — UI is broken into independent, reusable pieces (components) that each manage their own logic/markup and compose into larger trees.
- **Virtual DOM** — React keeps a lightweight in-memory representation of the UI, diffs it against the previous version on updates, and applies only the minimal necessary changes to the real DOM (see the Virtual DOM question for the mechanics).
- **One-way (unidirectional) data flow** — data flows down from parent to child via props; children communicate back up via callbacks. This makes state changes predictable and easy to trace, compared to two-way binding where any part of the tree could mutate shared state directly.
- **JSX** — a syntax extension that lets you write HTML-like markup inside JavaScript, compiled to \`React.createElement()\` calls under the hood. It's not required (you can call \`createElement\` directly) but makes component trees far more readable.

~~~jsx
// declarative: describe the UI for this state
function Counter({ count, onIncrement }) {
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={onIncrement}>+</button>
    </div>
  );
}
// compare to imperative DOM manipulation:
// const div = document.createElement('div');
// const p = document.createElement('p'); p.textContent = 'Count: ' + count;
// ...manually append, manually update on every change
~~~

~~~text
state changes -> React re-renders the description -> diffs vs previous -> patches only what changed in the real DOM
~~~

Why it matters: this is usually the opening question in a round, and interviewers are listening for whether you can explain *why* React exists (the shift from imperative DOM manipulation to declarative UI) rather than just reciting buzzwords. Follow-up: "What problem was React solving when Facebook created it?" — keeping a complex, frequently-updating UI (the News Feed) in sync with state was becoming unmanageable with direct DOM manipulation; React's diffing model made that tractable.`,
        },
        {
          q: "Explain the difference between functional and class components.",
          answer: `Both are ways to define a React component, but they differ in syntax, how they hold state, and how they hook into lifecycle behavior. **Functional components with Hooks are the modern default** — class components are mostly seen in legacy codebases now.

~~~jsx
// Class component
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
    this.increment = this.increment.bind(this); // manual 'this' binding needed
  }
  componentDidMount() {
    console.log("mounted");
  }
  increment() {
    this.setState({ count: this.state.count + 1 });
  }
  render() {
    return <button onClick={this.increment}>{this.state.count}</button>;
  }
}

// Functional component (Hooks) - equivalent behavior
function Counter() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    console.log("mounted");
  }, []);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
~~~

Key differences:

~~~text
                class component              functional component
state           this.state + this.setState   useState hook
lifecycle       componentDidMount, etc.      useEffect (unifies mount/update/unmount)
'this'          exists, needs binding        no 'this' at all - just closures
reuse logic     HOCs / render props          custom hooks
boilerplate     more (constructor, bind)     less, more concise
error boundary  ONLY class components can    (still no hook equivalent as of React 19)
                implement one
~~~

Why functional + Hooks won out: no more \`this\` binding footguns, logic reuse via custom hooks is far cleaner than HOC "wrapper hell," and related logic (subscribe + cleanup) lives together in one \`useEffect\` instead of being split across \`componentDidMount\`/\`componentDidUpdate\`/\`componentWillUnmount\`.

One genuine gap: **error boundaries still require a class component** (\`static getDerivedStateFromError\` / \`componentDidCatch\`) — there's no hook equivalent, so most codebases keep exactly one small class component for this purpose and write everything else as functions.

Why it matters: interviewers want to hear that you understand *why* the ecosystem moved to Hooks (not just "hooks are newer"), and that you know the one place class components remain necessary. Follow-up: "Can you use Hooks inside a class component?" No — Hooks only work in function components (or other custom hooks); you can't call \`useState\` inside a class.`,
        },
        {
          q: "How does the React component lifecycle work?",
          answer: `Every component goes through three broad phases — **mount** (first render), **update** (re-render due to new props/state), and **unmount** (removed from the tree). Class components expose this via named lifecycle methods; function components unify most of it into \`useEffect\`.

~~~text
MOUNT                     UPDATE                      UNMOUNT
constructor()              (props/state change)
render()                   render()
componentDidMount()         componentDidUpdate()        componentWillUnmount()
~~~

Class component mapping:

~~~jsx
class Widget extends React.Component {
  constructor(props) { super(props); this.state = { data: null }; }     // MOUNT: setup
  componentDidMount() { this.subscription = subscribe(this.onData); }    // MOUNT: side effects, fetch, subscribe
  componentDidUpdate(prevProps) {                                       // UPDATE: react to changed props
    if (prevProps.id !== this.props.id) this.fetchData(this.props.id);
  }
  componentWillUnmount() { this.subscription.unsubscribe(); }            // UNMOUNT: cleanup
  render() { return <div>{this.state.data}</div>; }
}
~~~

Functional equivalent with \`useEffect\` — the three phases collapse into one hook, where the **effect body** runs after mount/update and the **returned cleanup function** runs before unmount (and before the next effect run):

~~~jsx
function Widget({ id }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const subscription = subscribe(id, setData); // mount + re-run on id change (like componentDidMount + componentDidUpdate)
    return () => subscription.unsubscribe();      // cleanup (like componentWillUnmount)
  }, [id]);

  return <div>{data}</div>;
}
~~~

~~~text
useEffect(fn, [id]) behavior:
  mount:        run fn
  id changes:   run cleanup from previous fn, then run fn again
  unmount:      run cleanup from the last fn
~~~

Why the functional model is cleaner: related setup/teardown logic (subscribe + unsubscribe, add listener + remove listener) lives in **one place** instead of being split across \`componentDidMount\` and \`componentWillUnmount\`, which is a common source of bugs in class components (forgetting to mirror a mount-time side effect in the unmount cleanup).

Why it matters: this question checks whether you can map the old (still-common-in-legacy-code) mental model to the Hooks model, since many teams have a mix of both during migration. Follow-up: "What's the Hook equivalent of \`shouldComponentUpdate\`?" — wrap the component in \`React.memo\` (with an optional custom comparison function) to skip re-renders when props are shallow-equal.`,
        },
        {
          q: "What is the Virtual DOM, and how does it improve performance?",
          answer: `The Virtual DOM (VDOM) is a lightweight JavaScript object tree that mirrors the structure of the real DOM. When state changes, React builds a **new** VDOM tree, **diffs** it against the previous one (reconciliation), and applies only the **minimal set of real DOM mutations** needed — instead of re-rendering everything from scratch.

~~~jsx
// state changes from count=0 to count=1
<div>
  <h1>Title</h1>
  <p>Count: {count}</p>
</div>
~~~

~~~text
old VDOM tree            new VDOM tree             diff result
div                       div                       div: unchanged
 h1 "Title"                h1 "Title"                 h1: unchanged (skip)
 p  "Count: 0"             p  "Count: 1"               p: text changed -> ONE real DOM update
~~~

Why this matters for performance: **direct DOM manipulation is expensive** — every read/write can trigger layout recalculation and repaint, and doing this naively for every single state change (re-rendering the whole subtree into the real DOM) would be slow. By diffing in-memory JS objects first (cheap) and batching the resulting real DOM writes (expensive) into one minimal pass, React avoids unnecessary touches to the actual DOM.

~~~text
without VDOM (naive):  state change -> rebuild entire real DOM subtree -> many layout/paint triggers
with VDOM:              state change -> diff cheap JS objects -> ONE targeted real DOM patch -> single layout/paint pass
~~~

Important nuance interviewers probe: **the Virtual DOM itself isn't "faster than the DOM"** in some magical absolute sense — a hand-optimized imperative DOM update for one specific case can always beat it. What the VDOM buys you is a **general-purpose optimization applied automatically**, so you get near-optimal DOM updates *without* having to hand-write minimal-diff imperative code for every single UI change yourself. It trades a small amount of diffing overhead for a large reduction in unnecessary DOM work, and removes the burden of manual DOM bookkeeping from the developer.

Why it matters: the honest, senior-level framing is "VDOM enables efficient, automatic, minimal DOM updates without manual optimization" rather than "VDOM is always faster than the DOM," which is a common misconception. Follow-up: "Is React the fastest possible way to update the DOM?" No — hand-written vanilla JS can be faster for a specific known case; VDOM's win is developer productivity plus good-enough performance by default, generalized across the whole app.`,
        },
        {
          q: "How does React's rendering process work from state update to UI update?",
          answer: `A full render cycle has four stages: **trigger -> render phase -> commit phase -> browser paint**. Understanding this end-to-end is what separates "I know Hooks" from "I understand how React actually works."

~~~text
1. TRIGGER    setState() / dispatch() called -> React schedules an update
2. RENDER     React calls your component function(s) again, builds a new
              element tree, diffs against the previous tree (reconciliation)
              -> interruptible, must be a PURE calculation, no side effects
3. COMMIT     React applies the computed DOM mutations: inserts, updates,
              removes real DOM nodes. Runs useLayoutEffect synchronously
              here, before the browser paints.
4. PAINT      Browser paints the updated screen. useEffect callbacks run
              AFTER paint, asynchronously (doesn't block the visual update)
~~~

~~~jsx
function Counter() {
  const [count, setCount] = useState(0);

  useLayoutEffect(() => {
    console.log("before paint"); // runs in the commit phase, synchronously
  });

  useEffect(() => {
    console.log("after paint"); // runs after the browser has painted
  });

  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
  // clicking: TRIGGER (setCount) -> RENDER (new tree with count+1, diffed)
  //           -> COMMIT (button's textContent updated in real DOM, useLayoutEffect runs)
  //           -> PAINT (screen updates) -> useEffect runs
}
~~~

**Batching**: React 18+ batches multiple \`setState\` calls that happen within the same event handler (and now even inside promises/timeouts/native event handlers, unlike React 17) into a **single** render+commit cycle, so calling \`setCount\` three times in one click handler still only triggers one re-render, not three.

~~~text
onClick={() => { setCount(c => c+1); setFlag(f => !f); setOther(...); }}
React 18: all three updates batched -> ONE render + ONE commit, not three
~~~

Why the render/commit split matters: because the **render phase can be paused, thrown away, or restarted** (e.g. a higher-priority update interrupts it — this is what Fiber enables), your component function must be pure with no side effects. Side effects belong in the **commit phase** territory — which is exactly what \`useEffect\`/\`useLayoutEffect\` are for; they run only once React has committed, not during the (possibly discarded) render calculation.

Why it matters: this question tests the full mental model in one shot — trigger, pure render, DOM commit, and paint-relative effect timing — which is exactly what's needed to reason correctly about \`useEffect\` vs \`useLayoutEffect\` timing bugs. Follow-up: "Why can't you call \`setState\` during render?" — render must be pure; calling \`setState\` there would trigger another render synchronously inside the current one, risking infinite loops, and violates the "render is just a calculation" contract Fiber depends on.`,
        },
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
        {
          q: "Explain useRef in depth. How is it different from useState?",
          answer: `\`useRef\` returns a **mutable container object** (\`{ current: value }\`) that persists across renders. The critical difference from \`useState\`: **mutating a ref does NOT trigger a re-render**, while \`setState\` always schedules one.

~~~jsx
function Example() {
  const renderCount = useRef(0);
  const [count, setCount] = useState(0);

  renderCount.current++; // mutate directly - no re-render triggered by this line
  console.log("rendered", renderCount.current, "times");

  return <button onClick={() => setCount(count + 1)}>{count}</button>;
  // clicking causes a re-render (because of setCount), and DURING that
  // render renderCount.current increments too - but incrementing the ref
  // itself never CAUSES a render
}
~~~

~~~text
useState:  set value -> React schedules re-render -> component function runs again -> new value visible in JSX
useRef:    set .current -> value updates immediately -> NO re-render -> JSX doesn't reflect it until something else re-renders
~~~

Three common uses of \`useRef\`:

**1. Accessing DOM nodes directly** (the most common use):
~~~jsx
function TextInput() {
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current.focus(); }, []); // imperative DOM access
  return <input ref={inputRef} />;
}
~~~

**2. Storing a mutable value that survives re-renders but shouldn't trigger one** (an "instance variable" for function components) — e.g. a timer ID, a previous value for comparison, or a flag:
~~~jsx
function Timer() {
  const intervalRef = useRef(null);
  useEffect(() => {
    intervalRef.current = setInterval(() => console.log("tick"), 1000);
    return () => clearInterval(intervalRef.current);
  }, []);
}
~~~

**3. Keeping the latest value accessible inside a stale closure** (common fix for the "stale closure in useEffect/setTimeout" bug):
~~~jsx
function Chat({ message }) {
  const latestMessage = useRef(message);
  useEffect(() => { latestMessage.current = message; }); // no deps - runs every render, always fresh

  useEffect(() => {
    const id = setInterval(() => {
      console.log(latestMessage.current); // always reads the CURRENT message, not a stale one
    }, 5000);
    return () => clearInterval(id);
  }, []); // empty deps - this effect's closure would otherwise be stuck on the first message
}
~~~

~~~text
useState:  "I want the UI to reflect this value" -> triggers re-render
useRef:    "I want to remember this value without the UI caring" -> silent mutation
~~~

Why it matters: mixing these up causes two opposite bugs — using \`useState\` for something that doesn't need to trigger a re-render wastes renders (e.g. a scroll position tracked purely for internal logic), while using \`useRef\` for something that should update the UI silently fails (the ref updates but the screen doesn't change until an unrelated re-render happens to occur). Follow-up: "Does changing \`ref.current\` during render cause issues?" — yes, mutating a ref during the render phase (not inside an effect/event handler) breaks the "render must be pure" contract and can cause inconsistent behavior under concurrent rendering.`,
        },
        {
          q: "How do useEffect dependencies work? What are some common mistakes developers make?",
          answer: `The dependency array tells React **when to re-run the effect**: React compares each value in the array to its value from the previous render (shallow \`Object.is\` comparison per item); if any changed, the effect re-runs (cleanup from the old run first, then the new run).

~~~jsx
useEffect(() => { /* effect */ }, [a, b]);
// [a, b] unchanged since last render -> skip
// a or b changed (by Object.is)      -> run cleanup from last time, then run effect again
~~~

~~~text
no array:        runs after EVERY render (rarely what you want)
[]  empty array: runs once after mount, cleanup once on unmount
[a, b]:          runs on mount, and again whenever a or b changes
~~~

**Mistake 1 — missing dependencies (stale closures).** Omitting a value the effect actually uses means the effect closes over an old version of it:

~~~jsx
// ❌ 'count' is used but omitted from deps -> effect always sees count=0
useEffect(() => {
  const id = setInterval(() => console.log(count), 1000); // stale closure
  return () => clearInterval(id);
}, []); // missing 'count'

// ✅ include it, or use the functional updater form to avoid needing it at all
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000); // doesn't read 'count' directly
  return () => clearInterval(id);
}, []);
~~~

**Mistake 2 — over-including objects/functions recreated every render**, causing the effect to re-run on every single render even though "nothing really changed":

~~~jsx
// ❌ options is a NEW object every render -> effect re-runs every render
const options = { limit: 10 };
useEffect(() => { fetchData(options); }, [options]);

// ✅ move the literal inside the effect, or memoize it
useEffect(() => { fetchData({ limit: 10 }); }, []); // no external object dependency at all
~~~

**Mistake 3 — ignoring the exhaustive-deps lint warning** by disabling it instead of fixing the actual issue. The lint rule is (almost always) correct — silencing it hides a real stale-closure bug rather than fixing it.

**Mistake 4 — forgetting cleanup**, causing duplicate subscriptions/listeners to pile up across re-runs:
~~~jsx
// ❌ no cleanup - a new listener is added every time 'id' changes, old ones never removed
useEffect(() => {
  window.addEventListener("resize", handleResize);
}, [id]);

// ✅ always clean up what you set up
useEffect(() => {
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, [id]);
~~~

~~~text
effect sets something up (subscribe, listener, timer, fetch)
   -> MUST return a cleanup that tears down the SAME thing
   -> otherwise it accumulates on every dependency change
~~~

Why it matters: nearly every "weird React bug" report — stale data in a callback, duplicate event listeners, an effect firing every render for no obvious reason — traces back to one of these four dependency mistakes. Follow-up: "How do you avoid needing a value in deps at all?" — use the functional updater form of \`setState\` (\`setCount(c => c + 1)\`) or a ref for values you need to read but that shouldn't trigger a re-run.`,
        },
        {
          q: "Write a React component that fetches data from an API and displays it using useEffect.",
          answer: `The pattern needs three pieces of state (data, loading, error), a fetch triggered from \`useEffect\`, and — critically — a cleanup guard so a slow, stale request can't overwrite state after the component has moved on to a different \`id\` or unmounted.

~~~jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isActive = true; // cleanup flag - prevents a stale response from setting state
    const controller = new AbortController();

    async function fetchUser() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(\`/api/users/\${userId}\`, { signal: controller.signal });
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
        const data = await res.json();
        if (isActive) setUser(data); // only update state if still the current effect
      } catch (err) {
        if (isActive && err.name !== "AbortError") setError(err.message);
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    fetchUser();

    return () => {
      isActive = false;   // mark this run's result as stale
      controller.abort(); // cancel the in-flight request
    };
  }, [userId]); // re-fetch whenever userId changes

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  return <div>{user.name}</div>;
}
~~~

~~~text
mount / userId changes:
  isActive = true, fetch starts
  --- userId changes again before fetch resolves ---
  cleanup runs: isActive = false, abort() cancels the old request
  new effect run starts: isActive = true again, new fetch starts
  old fetch's .then/.catch runs but isActive is false -> state update SKIPPED (stale, ignored)
~~~

Why both \`isActive\` and \`AbortController\` matter: \`AbortController\` actually **cancels the network request** (saves bandwidth, stops the server-perceived load); the \`isActive\` flag is a **belt-and-suspenders guard** in case the promise still resolves/rejects despite the abort (some browsers/environments don't reject cleanly on abort) — without it you risk the classic React warning "Can't perform a state update on an unmounted component," or worse, silently rendering stale data from a superseded request.

In practice, a library like **React Query / SWR** handles all of this (loading/error state, cancellation, caching, refetch-on-param-change) — this hand-rolled version is what interviewers want to see you can build from first principles, understanding exactly why each piece exists.

Why it matters: this is one of the most common "write some code" prompts in a React round, and the loading/error states plus the stale-response guard are exactly what separates a working demo from a component that's safe to ship. Follow-up: "What happens without the cleanup function?" — if the component unmounts or \`userId\` changes before the fetch resolves, you'd get a state update on a stale/unmounted render, either throwing a warning or showing the wrong user's data.`,
        },
        {
          q: "useContext basic implementation.",
          answer: `\`useContext\` reads the current value of a Context from the nearest matching \`Provider\` above it in the tree, re-rendering the component whenever that value changes — without needing to thread props down manually through every intermediate level (avoiding prop drilling).

~~~jsx
// 1. create the context (usually in its own file)
const ThemeContext = createContext("light"); // "light" is the default if no Provider is found

// 2. provide a value somewhere up the tree
function App() {
  const [theme, setTheme] = useState("dark");
  return (
    <ThemeContext.Provider value={theme}>
      <Toolbar />
    </ThemeContext.Provider>
  );
}

// 3. consume it anywhere below, no matter how deep
function Toolbar() {
  return <ThemedButton />; // doesn't need to know about theme at all
}

function ThemedButton() {
  const theme = useContext(ThemeContext); // reads directly from the nearest Provider
  return <button className={theme}>Click</button>;
}
~~~

~~~text
App (Provider value="dark")
 └─ Toolbar            <- doesn't touch theme, no prop drilling
     └─ ThemedButton   <- useContext(ThemeContext) reads "dark" directly
~~~

**Building a small custom hook around it** is standard practice — it hides the raw context and gives a nicer API plus a safety check for "used outside its Provider":

~~~jsx
const AuthContext = createContext(undefined);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const login = (u) => setUser(u);
  const logout = () => setUser(null);
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider"); // fail loudly, not silently with undefined
  }
  return ctx;
}

// usage anywhere under <AuthProvider>:
function Header() {
  const { user, logout } = useAuth();
  return user ? <button onClick={logout}>Logout {user.name}</button> : <LoginButton />;
}
~~~

**The performance gotcha**: every component that calls \`useContext(SomeContext)\` re-renders whenever that context's value changes — **even if the component only cares about part of the value**. Passing a big object as the context value (like \`{ user, login, logout }\` above) means any consumer re-renders on any field change. Splitting into multiple smaller contexts (e.g. a separate \`UserContext\` and \`ThemeContext\`), or memoizing the provided value, mitigates this.

Why it matters: \`useContext\` is the standard escape hatch from prop drilling, but pairing it with a custom hook (for a clean API + the "used outside Provider" guard) and being aware of its re-render-everything-that-reads-it behavior is what a senior answer covers beyond the basic mechanics. Follow-up: "Does useContext cause the whole app to re-render?" — no, only components that actually call \`useContext\` on that specific context re-render; siblings/parents that don't consume it are unaffected.`,
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
        {
          q: "React.memo vs Pure Component.",
          answer: `Both skip a re-render when props haven't meaningfully changed, using a **shallow comparison** — the difference is just which component style they apply to.

- **\`React.memo\`** — a higher-order component that wraps a **function component**.
- **\`PureComponent\`** — a base class you extend instead of \`React.Component\`, for **class components**. It implements \`shouldComponentUpdate\` with a shallow prop/state comparison automatically.

~~~jsx
// Function component
const Row = React.memo(function Row({ item }) {
  return <li>{item.name}</li>;
});
// skips re-render if 'item' is shallow-equal to the previous render's 'item'

// Class component
class Row extends React.PureComponent {
  render() {
    return <li>{this.props.item.name}</li>;
  }
}
// PureComponent auto-implements: shouldComponentUpdate = shallow compare props AND state
~~~

Key differences beyond "function vs class":

~~~text
                    React.memo                      PureComponent
applies to          function components              class components
compares            props only (by default)          props AND state
custom comparator   yes - memo(Component, areEqual)   override shouldComponentUpdate yourself
~~~

\`React.memo\` accepts an optional second argument for a **custom comparison function**, giving finer control than \`PureComponent\`'s fixed shallow-compare-everything behavior:

~~~jsx
const Row = React.memo(
  function Row({ item, onSelect }) {
    return <li onClick={() => onSelect(item.id)}>{item.name}</li>;
  },
  (prevProps, nextProps) => prevProps.item.id === nextProps.item.id
  // only re-render if the item's id actually changed, ignore other prop changes
);
~~~

Both are **shallow** comparisons — they check reference equality per prop/state field, one level deep. Neither deep-compares nested objects/arrays, so passing a new object literal or inline arrow function as a prop every render defeats the optimization regardless of which one you use (see the next question).

Why it matters: this question checks whether you know the shallow-comparison mechanism is identical in spirit across both component styles, just wired up differently — \`PureComponent\` is a fixed built-in comparison, \`React.memo\` is more flexible with a custom comparator option. Follow-up: "Does PureComponent deep compare?" No — shallow only, same limitation as \`React.memo\`'s default behavior.`,
        },
        {
          q: "How does React.memo work, and when can it actually hurt performance?",
          answer: `\`React.memo\` wraps a component so React **skips re-rendering it** if its props are shallow-equal to the previous render's props. It sounds like a free win, but it has real costs and common failure modes that make it actively harmful when misapplied.

**How it works:**
~~~jsx
const ExpensiveRow = React.memo(function ExpensiveRow({ data }) {
  console.log("rendering", data.id);
  return <div>{data.name}</div>;
});
// re-renders ONLY if 'data' prop reference changes (shallow compare)
~~~

**Failure mode 1 — new object/array/function props every render defeat it entirely:**
~~~jsx
// ❌ memo does nothing useful here - 'style' and 'onClick' are brand new every render
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <ExpensiveRow
      style={{ color: "red" }}           // new object every render
      onClick={() => console.log(count)} // new function every render
    />
  );
}
// ExpensiveRow re-renders every time Parent renders anyway - memo comparison always fails
~~~

Fix: memoize the props with \`useMemo\`/\`useCallback\`, or hoist static values out of the render body:
~~~jsx
function Parent() {
  const [count, setCount] = useState(0);
  const style = useMemo(() => ({ color: "red" }), []);       // stable reference
  const handleClick = useCallback(() => console.log(count), [count]); // stable unless count changes
  return <ExpensiveRow style={style} onClick={handleClick} />;
}
~~~

**Failure mode 2 — memoizing components that re-render for a good reason** (props genuinely change almost every time) adds the **cost of a comparison on every render for zero benefit** — the comparison itself isn't free, and for a component with many props it can outweigh just re-rendering a cheap component.

**Failure mode 3 — memoizing a component whose children still re-render anyway.** \`React.memo\` only stops the memoized component itself from re-rendering; if it's not actually expensive but its *children* are the real cost and aren't independently memoized, wrapping the parent buys nothing.

~~~text
when memo HELPS:      component is genuinely expensive to render + props are usually stable
when memo HURTS:       props are new objects/functions every render (comparison always fails, pure overhead)
                       OR component is cheap (comparison cost > render cost)
                       OR props change almost every render anyway (comparison never pays off)
~~~

Why it matters: "just wrap everything in \`React.memo\`" is a common junior instinct that can make things *worse* — every memoized component pays a comparison cost on every parent render, and if props aren't stabilized with \`useMemo\`/\`useCallback\`, that cost buys nothing. The React docs explicitly frame memo as an **opt-in performance escape hatch for measured bottlenecks**, not a default wrapper. Follow-up: "How do you know if memo is actually helping?" — profile with React DevTools Profiler's "why did this render" flag; if it still shows "props changed" every time despite wrapping in memo, the memoization isn't working and you need to stabilize the props themselves.`,
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
        {
          q: "What is prop drilling, and how can you avoid it?",
          answer: `Prop drilling is passing a prop **through several intermediate components that don't use it themselves**, just to get it from a high-up ancestor down to a deeply nested descendant that does need it. It works, but it couples every component in the chain to a prop it doesn't care about, and makes refactoring painful (renaming/adding a prop means touching every intermediate level).

~~~jsx
// ❌ prop drilling: Layout and Sidebar don't use 'user', they just forward it
function App() {
  const [user, setUser] = useState({ name: "Raj" });
  return <Layout user={user} />;
}
function Layout({ user }) {
  return <Sidebar user={user} />; // just passing through
}
function Sidebar({ user }) {
  return <UserBadge user={user} />; // just passing through
}
function UserBadge({ user }) {
  return <span>{user.name}</span>; // finally used here
}
~~~

~~~text
App (has 'user')
 └─ Layout (doesn't use it, just forwards)
     └─ Sidebar (doesn't use it, just forwards)
         └─ UserBadge (actually uses it)

3 components touched just to deliver 1 prop to the 4th level
~~~

**Fix 1 — Context API** (best for infrequently-changing, broadly-needed data like auth/theme):
~~~jsx
const UserContext = createContext(null);

function App() {
  const [user, setUser] = useState({ name: "Raj" });
  return (
    <UserContext.Provider value={user}>
      <Layout /> {/* no 'user' prop needed at all */}
    </UserContext.Provider>
  );
}
function Layout() { return <Sidebar />; }
function Sidebar() { return <UserBadge />; }
function UserBadge() {
  const user = useContext(UserContext); // reads directly, skips every intermediate level
  return <span>{user.name}</span>;
}
~~~

**Fix 2 — component composition** (pass the already-rendered element down instead of raw data, so intermediate components don't need to know about the data shape at all):
~~~jsx
function App() {
  const [user, setUser] = useState({ name: "Raj" });
  return <Layout sidebar={<UserBadge user={user} />} />; // Layout just renders whatever it's given
}
function Layout({ sidebar }) {
  return <div className="layout">{sidebar}</div>; // doesn't know or care what's inside
}
~~~

**Fix 3 — external state management** (Redux, Zustand, Jotai) for state needed across many unrelated branches of the tree, with fine-grained subscriptions so components only re-render for the slice they actually read.

Why it matters: prop drilling itself isn't "wrong" for one or two levels — introducing Context for every single prop is its own form of overengineering. The senior judgment call is recognizing **when** the chain gets long/wide enough (3+ levels, or fanning out to many siblings) that Context or composition genuinely pays for itself. Follow-up: "Isn't Context always better than prop drilling?" No — Context adds its own re-render considerations (see the Context performance pitfalls question) and can make data flow harder to trace; for a prop passed one level down, just pass the prop.`,
        },
        {
          q: "Explain Higher-Order Components (HOCs), Render Props, and Hooks. Why are Hooks preferred today?",
          answer: `All three solve the same problem — **reusing stateful logic across components** — but Hooks won because the other two patterns add structural overhead ("wrapper hell") that Hooks avoid entirely.

**Higher-Order Component (HOC)** — a function that takes a component and returns a new component with extra props/behavior injected:
~~~jsx
function withAuth(WrappedComponent) {
  return function AuthenticatedComponent(props) {
    const user = useCurrentUser();
    if (!user) return <LoginPrompt />;
    return <WrappedComponent {...props} user={user} />;
  };
}

const ProtectedDashboard = withAuth(Dashboard); // usage: <ProtectedDashboard />
~~~

**Render Props** — a component that takes a function as a prop (or as \`children\`) and calls it with the state/behavior it manages, letting the caller control rendering:
~~~jsx
function MouseTracker({ children }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <div onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}>
      {children(pos)} {/* caller decides what to render with the position */}
    </div>
  );
}

// usage:
<MouseTracker>{(pos) => <p>{pos.x}, {pos.y}</p>}</MouseTracker>
~~~

**Custom Hook** — the modern equivalent, just a function that uses other hooks:
~~~jsx
function useMousePosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);
  return pos;
}

// usage - no wrapper component, no render-prop indirection, just a function call:
function Cursor() {
  const pos = useMousePosition();
  return <p>{pos.x}, {pos.y}</p>;
}
~~~

Why Hooks are preferred:

~~~text
HOC:           extra component in the tree per HOC, props can silently collide/shadow,
               hard to trace which HOC injected which prop ("wrapper hell" in DevTools)
Render Props:  deep JSX nesting when combining several (callback-hell-like structure),
               harder to read at a glance than a flat list of hook calls
Custom Hooks:  NO extra component in the tree, explicit inputs/outputs (just function
               args/return values), multiple hooks compose flatly with no nesting
~~~

~~~jsx
// combining 3 cross-cutting concerns:
// HOC:            withAuth(withTheme(withAnalytics(Component)))       <- wrapper hell
// Render props:   <Auth>{u => <Theme>{t => <Analytics>{a => ...}}}    <- nesting hell
// Hooks:           const user = useAuth(); const theme = useTheme(); const track = useAnalytics();  <- flat, clear
~~~

Why it matters: interviewers want to hear that you understand HOCs and render props aren't "wrong," just superseded — some older libraries (react-redux's \`connect\`, older React Router versions) still use HOCs, so recognizing the pattern in legacy code matters even if you'd write a hook today. Follow-up: "Do HOCs still have a place?" Occasionally — e.g. wrapping a component that must remain a class (like an error boundary) with shared logic, since hooks can't be used inside class components.`,
        },
        {
          q: "Loading state (isLoading) with API calls.",
          answer: `A single boolean \`isLoading\` is the naive starting point, but real API-call UIs need to represent more than two states — the common bug is conflating "loading," "error," "empty," and "loaded" into ad-hoc combinations of booleans that can contradict each other.

**The naive (bug-prone) version:**
~~~jsx
function UserList() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    fetchUsers()
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, []);

  // bug risk: what if isLoading=false, error=null, AND data=null? (e.g. before the effect even ran)
  // that's an invalid/ambiguous state these three independent booleans can drift into
  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  return <List items={data} />;
}
~~~

**The state-machine version** — model it as a single discriminated union so impossible states (e.g. "loading" AND "has error" at once) can't be represented at all:

~~~jsx
function useAsync(fetchFn, deps) {
  const [state, setState] = useState({ status: "idle" });

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });

    fetchFn()
      .then((data) => { if (active) setState({ status: "success", data }); })
      .catch((error) => { if (active) setState({ status: "error", error }); });

    return () => { active = false; };
  }, deps);

  return state; // { status: "idle" | "loading" | "success" | "error", data?, error? }
}

function UserList() {
  const state = useAsync(fetchUsers, []);

  switch (state.status) {
    case "idle":
    case "loading": return <Spinner />;
    case "error":   return <ErrorMessage error={state.error} />;
    case "success": return state.data.length ? <List items={state.data} /> : <EmptyState />;
  }
}
~~~

~~~text
naive booleans:     isLoading + error + data, independently settable -> 2³ combinations, some invalid
state machine:       ONE status field -> exactly 4 valid states, no contradictions possible
idle -> loading -> success (with data)
               \\-> error (with error)
~~~

Why the state-machine shape matters: with independent booleans, nothing stops \`isLoading=true\` and \`error="failed"\` from being true simultaneously (a real bug — which UI wins?). A single \`status\` field makes that combination structurally impossible, and TypeScript discriminated unions can enforce it at compile time (\`data\` only exists when \`status === "success"\`).

In practice, **React Query / SWR** give you this exact status model for free (\`isLoading\`, \`isError\`, \`isSuccess\`, plus \`isFetching\` for background refetches) — the hand-rolled version above is what interviewers want to see you can reason through, but you wouldn't re-implement it for every fetch in a real app.

Why it matters: this question is really testing whether you think about the state *shape*, not just the visual loading spinner — production bugs from "loading spinner and error message showing at the same time" almost always trace back to independent boolean flags instead of a single status enum. Follow-up: "What about a background refetch (data already loaded, refetching in the background)?" — add a distinct \`isFetching\`/\`isRefetching\` flag separate from the initial \`isLoading\`, since you want to show stale data plus a subtle indicator, not a full-page spinner.`,
        },
        {
          q: "What is React Router, and how does routing work?",
          answer: `React Router is the standard client-side routing library for React — it maps **URL paths to components**, so navigating between "pages" updates the URL and swaps rendered components **without a full page reload**, keeping the SPA fast and stateful (e.g. scroll position/animations can persist across navigation in ways a full reload can't).

~~~jsx
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/articles/42">Sample Article</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/articles/:id" element={<Article />} />
        <Route path="*" element={<NotFound />} /> {/* catch-all for unmatched routes */}
      </Routes>
    </BrowserRouter>
  );
}

function Article() {
  const { id } = useParams();          // read the dynamic ":id" segment from the URL
  const navigate = useNavigate();      // imperative navigation, e.g. after a form submit
  return (
    <div>
      <h1>Article {id}</h1>
      <button onClick={() => navigate("/")}>Back home</button>
    </div>
  );
}
~~~

**How it works under the hood:** \`BrowserRouter\` uses the browser's **History API** (\`pushState\`/\`replaceState\`) instead of full navigations. Clicking a \`<Link>\` intercepts the click, calls \`history.pushState\` to change the URL bar **without** requesting a new HTML document from the server, and React Router then matches the new path against your \`<Route>\` definitions and renders the matching \`element\`.

~~~text
click <Link to="/articles/42">
   -> preventDefault() on the native <a> click (no full page reload)
   -> history.pushState(..., "/articles/42")   (URL bar updates)
   -> Router re-matches routes against new path
   -> renders <Article /> (the matched route's element)
   -> componentry that already existed (nav, layout) is NOT remounted
~~~

Key concepts:
- **Route matching** — \`/articles/:id\` is a dynamic segment; \`useParams()\` reads it. \`*\` catches unmatched paths (404).
- **Nested routes** — a parent \`<Route>\` can render an \`<Outlet />\` where its matched child route renders, letting layouts wrap multiple pages without re-rendering the shared shell.
- **Query params** — \`useSearchParams()\` reads/writes \`?key=value\` pairs independent of the path.
- **Programmatic navigation** — \`useNavigate()\` for redirecting after actions (form submit, auth check) instead of requiring a \`<Link>\` click.

Why it matters: this question checks the "client-side routing" mental model specifically — SPA navigation without a server round-trip for each "page." Follow-up: "How is this different from Next.js's file-based App Router?" — React Router matches routes you declare explicitly in JSX at runtime in the browser; Next.js derives routes from the file system and can render/fetch data on the **server** per route (SSR/RSC), which React Router alone (client-only) does not do.`,
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
