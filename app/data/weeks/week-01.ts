import type { Week } from "../types";

export const week01: Week = {
  week: 1,
  theme: "JavaScript Fundamentals & Runtime",
  color: "#F59E0B",
  topics: [
    {
      title: "Execution Context & Call Stack",
      subtopics: [
        "GEC vs FEC",
        "Creation phase vs execution phase",
        "Call stack basics",
        "Hoisting (var/let/const/function)",
        "Temporal Dead Zone",
        "undefined vs not defined",
      ],
      questions: [
        {
          q: "What is an execution context and how does the call stack use it?",
          answer: `An execution context is the environment in which JavaScript runs your code. Think of it like a temporary "workspace" the engine creates so it knows:

- what variables exist
- what the value of \`this\` is
- what outer scope is available
- which line is currently running

There are two core ones interviewers care about:
- Global Execution Context (GEC): created once when the file starts.
- Function Execution Context (FEC): created every time a function is called.

Each context is pushed onto the call stack. The call stack is just a stack of these workspaces.

~~~js
function one() {
  console.log("one");
  two();
}

function two() {
  console.log("two");
}

one();
~~~

~~~text
Start:
[ Global ]

Call one():
[ one ]
[ Global ]

Call two():
[ two ]
[ one ]
[ Global ]

two() finishes -> pop
one() finishes -> pop
~~~

Easy analogy: imagine a stack of plates in a kitchen. Every function call puts a new plate on top. When that function finishes, the top plate is removed. JavaScript always works on the top plate first.

Inside each execution context, JavaScript works in 2 broad phases:

~~~text
1. Creation phase
   - registers variables/functions
   - sets up scope chain
   - decides \`this\`

2. Execution phase
   - runs code line by line
   - assigns real values
   - calls other functions
~~~

Why this matters: hoisting, closures, scope chain, and stack overflow all become much easier once you understand that JS is constantly creating and popping execution contexts.`,
        },
        {
          q: "What is hoisting? How does it differ for var vs let?",
          answer: `Hoisting is the behaviour where the JS engine, during the *creation phase* of an execution context (before any line runs), scans the scope and allocates memory for declarations. It is NOT "moving code to the top" — that's the junior mental model. What actually happens is the engine registers identifiers in the variable environment before execution begins.

The key distinction is *what value the binding holds* between creation and the actual declaration line:

~~~js
console.log(a); // undefined  -> var is hoisted AND initialized to undefined
var a = 10;

console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 20;     // let/const are hoisted but NOT initialized (TDZ)
~~~

So both var and let are hoisted. The difference is initialization:
- \`var\` -> hoisted to the top of the *function* scope, auto-initialized to \`undefined\`.
- \`let\`/\`const\` -> hoisted to the top of the *block* scope, but left *uninitialized*. Touching them before the declaration throws (the Temporal Dead Zone).

Function *declarations* are hoisted with their full body (callable before the line). Function *expressions* assigned to var are not (you get undefined, then "not a function").

~~~
Creation phase (var):   a -> undefined        (usable, wrong value)
Creation phase (let):   b -> <uninitialized>  (TDZ, throws on access)
Execution phase:        assignment runs, binding gets real value
~~~

Why it matters / the "why": \`let\`/\`const\` were designed to surface bugs early. \`var\`'s "silent undefined" hides typos and use-before-define mistakes. Block scoping also fixes the classic loop-closure bug.

Interviewer follow-ups: "Is a function declaration or a var hoisted first?" (functions win — they're fully hoisted over var of the same name). "Does hoisting cross function boundaries?" (no — var is function-scoped, not global unless declared there).`,
        },
        {
          q: "Explain the temporal dead zone with an example.",
          answer: `The Temporal Dead Zone (TDZ) is the window between when a \`let\`/\`const\` binding is hoisted (start of its block) and when its declaration statement actually executes and initializes it. Inside that window the binding *exists* but accessing it throws a ReferenceError.

~~~js
{
  // TDZ for "x" starts here
  // console.log(x); // ReferenceError: Cannot access 'x' before initialization
  // typeof x;       // ALSO throws (surprising — typeof is normally safe)
  const x = 5; // TDZ ends here, x initialized
  console.log(x); // 5
}
~~~

~~~
| block start ............ const x = 5 ............ block end |
|<------- TDZ (access => ReferenceError) ------>|<-- usable ->|
~~~

The "why": TDZ exists so \`const\` can be a real constant (it has no meaningful "undefined" pre-state) and so use-before-declaration is an *error* instead of a silent \`undefined\`. It catches real bugs at the point of mistake.

Classic trap interviewers love:

~~~js
let y = 1;
function f() {
  console.log(y); // ReferenceError, NOT 1
  let y = 2;      // this 'y' shadows the outer one for the WHOLE block
}
f();
~~~

Even though an outer \`y\` exists, the inner \`let y\` is hoisted to the top of the function block, so the reference resolves to the *inner* binding which is still in its TDZ. This surprises people who expect it to print the outer 1.

Follow-up: "Why does \`typeof\` throw here when it's supposed to be the safe operator?" — because the binding is in TDZ; \`typeof undeclaredVar\` is safe, but \`typeof tdzVar\` is not.`,
        },
        {
          q: "What is the difference between undefined and not defined?",
          answer: `This is a very common interview trap because the words sound similar, but they mean very different things.

\`undefined\` means:
- the variable exists
- but it has not been given a value yet

\`not defined\` means:
- the variable does not exist in the current scope at all
- trying to read it throws a ReferenceError

~~~js
let a;
console.log(a); // undefined

console.log(b); // ReferenceError: b is not defined
~~~

~~~text
undefined   -> box exists, but empty
not defined -> box was never created
~~~

Easy analogy:
- \`undefined\` = you have a locker, but nothing is inside it yet.
- \`not defined\` = you don't even have a locker.

A few interview-important cases:

~~~js
var x;
console.log(x); // undefined

console.log(typeof x); // "undefined"
console.log(typeof y); // "undefined" even if y was never declared
console.log(y);        // ReferenceError: y is not defined
~~~

Important exception:
- \`typeof undeclaredVar\` is safe.
- But \`typeof letVar\` inside TDZ still throws.

~~~js
{
  // console.log(typeof z); // ReferenceError because z is in TDZ
  let z = 10;
}
~~~

Best interview one-liner:
"undefined means declared but not assigned; not defined means the identifier was never declared in the current accessible scope."`,
        },
        {
          q: "What happens when you call a function before it's declared?",
          answer: `It depends entirely on *how* the function was defined — declaration vs expression. This is a favourite "do you really understand hoisting" probe.

Function declaration -> works. The whole function (name + body) is hoisted during the creation phase, so it's callable above its definition:

~~~js
greet(); // "hi" -> works
function greet() { console.log("hi"); }
~~~

Function expression (var) -> the *variable* is hoisted as \`undefined\`, the assignment runs later. Calling it early throws TypeError:

~~~js
greet(); // TypeError: greet is not a function
var greet = function () { console.log("hi"); };
~~~

Function expression (let/const) -> ReferenceError (TDZ), not TypeError:

~~~js
greet(); // ReferenceError: Cannot access 'greet' before initialization
const greet = () => console.log("hi");
~~~

~~~
declaration      => callable before definition (full hoist)
var expression   => 'undefined', call => TypeError: not a function
let/const expr   => TDZ, call => ReferenceError
~~~

The "why" / production angle: this is why codebases standardize on a style. Declarations let you call helpers defined lower in the file (top-down readability). But many teams prefer const arrow functions to get the TDZ safety net and avoid accidental early calls. In React, components are usually const expressions, so import/definition order matters.

Follow-up: "Two function declarations with the same name?" — the last one wins (later overwrites earlier during hoisting). "Declaration inside an \`if\` block?" — block-scoped in strict mode/modules; legacy behaviour is engine-dependent, so avoid it.`,
        },
      ],
      tip: "Draw the call stack on paper. Interviewers love when you visualize it.",
      rajnishAngle:
        "Relate to how Next.js server components vs client components have different execution contexts.",
    },
    {
      title: "Closures & Scope Chain",
      subtopics: [
        "Lexical scope",
        "Scope chain",
        "Closure use cases",
        "setTimeout + closures",
        "Memory leaks via closures",
      ],
      questions: [
        {
          q: "What is lexical scope and scope chain in JavaScript?",
          answer: `Lexical scope means scope is decided by where code is written, not by where a function is called from.

In simple words:
- a function can access its own variables
- then variables from its parent scope
- then parent of parent
- and so on until global scope

That lookup path is called the scope chain.

~~~js
const globalVar = "global";

function outer() {
  const outerVar = "outer";

  function inner() {
    const innerVar = "inner";
    console.log(innerVar);  // own scope
    console.log(outerVar);  // parent scope
    console.log(globalVar); // global scope
  }

  inner();
}

outer();
~~~

~~~text
inner scope  ->  outer scope  ->  global scope  ->  null
~~~

Easy analogy: imagine asking for a book.
- First check your own bag.
- If not found, check your room.
- Then check the house.
- If it's nowhere, you get "not defined".

That is exactly how the scope chain works.

Very important interview point: the function remembers where it was defined, not where it was called.

~~~js
const name = "global";

function outer() {
  const name = "outer";

  function show() {
    console.log(name);
  }

  return show;
}

const fn = outer();
fn(); // "outer"
~~~

Even though \`fn()\` is called later somewhere else, it still looks up variables using the place where \`show\` was created. That is lexical scope, and closures are built on top of it.`,
        },
        {
          q: "What is a closure? Give a real-world use case.",
          answer: `A closure is a function bundled together with references to its surrounding lexical scope. When a function is created, it keeps a live link to the variable environment it was defined in — so even after the outer function returns, the inner function can still read/write those variables. Scope is determined *lexically* (by where code is written), not by where it's called.

~~~js
function makeCounter() {
  let count = 0;            // private state, lives on after makeCounter returns
  return {
    inc() { return ++count; },
    get() { return count; },
  };
}
const c = makeCounter();
c.inc(); // 1
c.inc(); // 2  -> 'count' persists, but is unreachable from outside
~~~

~~~
makeCounter() returns -> its stack frame would normally be gone,
but 'count' is still referenced by inc/get, so the engine keeps
that environment alive on the heap:

   [ closure ] --captures--> { count: 2 }
        ^ inc() / get() read & mutate it
~~~

Real-world use cases (name several — interviewers want breadth):
1. Data privacy / module pattern — emulate private fields before #private existed.
2. Function factories — \`const add5 = makeAdder(5)\`.
3. Memoization caches — the cache object lives in the closure.
4. Debounce / throttle — the timer id is held in closure between calls.
5. React hooks — \`useState\`'s setter closes over the fiber; event handlers close over props/state (which causes the "stale closure" bug).

~~~js
function debounce(fn, ms) {
  let timer;                      // closed over across invocations
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
~~~

The "why": closures are how JS does encapsulation and stateful functions without classes. Production angle: a reusable analytics wrapper or an Nginx-config builder that captures shared options is a closure.

Follow-up: "What does the closure capture — the value or the variable?" The *variable* (binding), not a snapshot. That's exactly why the loop bug below happens.`,
        },
        {
          q: "How do closures cause memory leaks? How do you prevent them?",
          answer: `Closures keep their captured environment alive as long as the closure itself is reachable. If a long-lived reference (a global, an event listener, a timer, a cache) holds a closure that captures large objects or DOM nodes, the garbage collector can't reclaim them — that's the leak.

Common leak patterns:

~~~js
// 1) Listener capturing a big object, never removed
function attach(node) {
  const huge = new Array(1e6).fill("*"); // captured
  node.addEventListener("click", () => console.log(huge.length));
  // if 'node' is removed from DOM but listener not detached,
  // 'huge' stays alive (detached DOM node leak)
}

// 2) setInterval closure that captures and never clears
const data = loadBigThing();
setInterval(() => process(data), 1000); // 'data' pinned forever

// 3) Accidental capture: the closure references the whole scope,
//    keeping variables alive even if it only "logically" needs one.
~~~

Prevention:
- Remove listeners (\`removeEventListener\`) and clear timers (\`clearInterval\`) on teardown. In React, that's the \`useEffect\` cleanup return.
- Null out references you no longer need: \`huge = null\`.
- Scope tightly — don't capture more than necessary; extract just the value you need.
- Use \`WeakMap\`/\`WeakRef\` for caches keyed on objects/DOM nodes so entries are GC-eligible when the key dies.

~~~js
useEffect(() => {
  const onScroll = () => {/* ... */};
  window.addEventListener("scroll", onScroll);
  return () => window.removeEventListener("scroll", onScroll); // prevents leak
}, []);
~~~

How to *detect*: Chrome DevTools -> Memory -> heap snapshots (take 3: baseline, after action, after GC). Growing "retained size" and "Detached HTMLDivElement" nodes are the smoking gun.

Production angle: long-session news readers who leave a tab open for hours accumulate listener/closure leaks from scroll handlers and ad widgets if cleanup is missed.`,
        },
        {
          q: "Why does setTimeout inside a loop with var print the same value, and how do you fix it?",
          answer: `This is one of the most famous closure interview questions.

~~~js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// 3, 3, 3
~~~

Many people expect \`0, 1, 2\`, but all callbacks print \`3\`.

Why?
- \`setTimeout\` does not run immediately. It puts the callback in the task queue.
- the \`for\` loop finishes first
- with \`var\`, there is only one shared \`i\` binding
- by the time callbacks run, \`i\` has become \`3\`

~~~text
Loop phase:      i becomes 0 -> 1 -> 2 -> 3
Callback phase:  all closures read the same final i = 3
~~~

Fixes:

1. Use \`let\` so each iteration gets its own binding:
~~~js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// 0, 1, 2
~~~

2. Use an IIFE to capture the current value:
~~~js
for (var i = 0; i < 3; i++) {
  ((j) => setTimeout(() => console.log(j), 0))(i);
}
~~~

3. Use array methods that create a fresh parameter:
~~~js
[0, 1, 2].forEach((i) => setTimeout(() => console.log(i), 0));
~~~

Easy analogy:
- \`var\` = three people sharing one whiteboard
- \`let\` = each person gets their own note card

This question tests 3 things together:
- closures
- function scope vs block scope
- event loop timing

Best short answer:
"Because \`var\` creates one shared binding and the timeout callbacks run after the loop ends, every closure sees the final value. \`let\` fixes it by creating a new binding per iteration."`,
        },
      ],
      tip: "Talk about memoization, debounce/throttle — both are classic closure patterns.",
      rajnishAngle:
        "Your Nginx caching config abstraction or reusable analytics hooks are closure examples.",
    },
    {
      title: "Event Loop, Microtasks & Macrotasks",
      subtopics: ["Call stack", "Web APIs", "Task queue vs microtask queue", "Promise execution order", "Single-threaded runtime", "Blocking vs non-blocking"],
      questions: [
        {
          q: "Is JavaScript single-threaded or multi-threaded?",
          answer: `The JavaScript **language execution model is single-threaded**: one **call stack**, one piece of JS running at a time, **run-to-completion**. That means if a function is executing, no other JS can interrupt it halfway on that same thread.

~~~js
console.log("start");
while (true) {}   // blocks forever
console.log("end"); // never reached
~~~

But the environment around JavaScript is **not** purely single-threaded. The browser/Node runtime has other systems working in parallel:
- browser Web APIs (timers, network, DOM events)
- rendering engine
- libuv thread pool in Node
- **Web Workers / Worker Threads** for actual parallel JS on separate threads

~~~
main JS thread:   one call stack, one task at a time
browser/runtime:  timers, network, rendering, I/O happening outside that stack
workers:          separate JS threads with separate event loops
~~~

So the precise senior answer is:
- **JavaScript on the main thread is single-threaded**
- but modern runtimes can use **multiple threads/processes around it**
- and you can opt into real parallelism with **Web Workers** (browser) or **Worker Threads** (Node)

Why people get confused: \`setTimeout\`, fetch, and DOM events feel "parallel," but the callback code still returns to the **single main JS thread** later via the event loop.

Why it matters: this distinction is one of the most common JavaScript runtime interview questions. The high-signal answer is not just "single-threaded," but "single-threaded execution with concurrent runtime support and optional worker-based parallelism." Follow-up: "Can two pieces of JS run at the exact same time?" On the same main thread, no. In separate workers, yes.`,
        },
        {
          q: "What is the difference between microtask and macrotask queues?",
          answer: `JS is single-threaded with an event loop that pulls work from two kinds of queues. The critical rule: after each macrotask (and after the current synchronous run-to-completion), the engine drains the *entire* microtask queue before rendering or taking the next macrotask.

Macrotasks (task queue): \`setTimeout\`, \`setInterval\`, \`setImmediate\` (Node), I/O, UI events, \`MessageChannel\`. One per loop turn.

Microtasks: Promise \`.then/.catch/.finally\` callbacks, \`queueMicrotask\`, \`await\` continuations, \`MutationObserver\`. Drained completely after each task.

~~~
            ┌─────────────┐
            │  Call Stack │ run-to-completion
            └──────┬──────┘
                   │ empty?
                   ▼
        drain ALL microtasks  (promises, queueMicrotask)
                   │
                   ▼
            render (if needed)
                   │
                   ▼
        take ONE macrotask (setTimeout, event, I/O)
                   │
                   └────── loop ──────┘
~~~

Why it matters: microtasks have priority and can starve the loop (see below). It explains why a Promise that resolves "later" still runs before a \`setTimeout(…, 0)\` queued "earlier".

~~~js
console.log("sync");
setTimeout(() => console.log("macro"), 0);
Promise.resolve().then(() => console.log("micro"));
console.log("sync end");
// sync, sync end, micro, macro
~~~

Follow-up: "Is \`await\` a macrotask?" No — the code after \`await\` is scheduled as a microtask continuation. "Where does \`requestAnimationFrame\` fit?" It's its own pre-render callback phase, between microtasks and paint — not the task queue.`,
        },
        {
          q: "In what order does this run: setTimeout, Promise.then, console.log?",
          answer: `Synchronous code first, then all microtasks (Promise callbacks), then macrotasks (setTimeout). Canonical question:

~~~js
console.log("1");
setTimeout(() => console.log("2"), 0);
Promise.resolve().then(() => console.log("3"));
console.log("4");
// Output: 1, 4, 3, 2
~~~

Trace:
~~~
1) "1"  -> sync, logs immediately
2) setTimeout schedules cb -> MACRO task queue
3) Promise.then schedules cb -> MICRO task queue
4) "4"  -> sync, logs
   --- call stack empty ---
5) drain microtasks -> "3"
6) take one macrotask -> "2"
~~~

Harder variant they escalate to:

~~~js
console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve()
  .then(() => { console.log("C"); return Promise.resolve(); })
  .then(() => console.log("D"));
Promise.resolve().then(() => console.log("E"));
console.log("F");
// A, F, C, E, D, B
~~~

The subtlety: returning a Promise from \`.then\` adds *extra* microtask ticks, so "D" is delayed and "E" sneaks in before it. With \`async/await\`:

~~~js
async function run() {
  console.log("1");
  await null;            // everything after await => microtask
  console.log("2");
}
console.log("0"); run(); console.log("3"); // 0, 1, 3, 2
~~~

How to nail it in interviews: say out loud "sync runs to completion, then microtask queue fully drains, then one macrotask, repeat." Then walk the queues on paper. Production angle: INP optimization is literally about not blocking this loop — yielding so the browser can drain tasks and paint.`,
        },
        {
          q: "What is blocking vs non-blocking JavaScript?",
          answer: `**Blocking** code prevents the main thread from doing anything else until that work finishes. **Non-blocking** code lets the runtime continue handling other work and notifies you later when the result is ready.

Blocking example:

~~~js
function heavyWork() {
  const start = Date.now();
  while (Date.now() - start < 3000) {} // busy wait 3 seconds
}

console.log("A");
heavyWork();
console.log("B");
~~~

The UI/event loop is stuck during \`heavyWork()\`. No clicks, no paint, no timers can run until it finishes.

Non-blocking example:

~~~js
console.log("A");
setTimeout(() => {
  console.log("B");
}, 3000);
console.log("C");
// A, C, then later B
~~~

Here the timer is handled by the runtime, and the callback returns later through the event loop without blocking the current thread.

~~~
blocking:
  JS starts work -> main thread busy -> everything waits

non-blocking:
  JS schedules work -> main thread continues -> callback/promise later
~~~

Important nuance:
- JavaScript can be **single-threaded but non-blocking**
- "non-blocking" does **not** mean the work finished instantly
- it means the current JS thread was free to keep processing other tasks

Typical blocking sources:
- huge loops
- heavy JSON parsing
- large synchronous localStorage work
- layout thrashing
- sync XHR (deprecated/bad)

Typical non-blocking patterns:
- timers
- fetch / network I/O
- promises / async-await
- Web Workers for heavy compute

Why it matters: this concept is at the heart of why JavaScript can power interactive UIs despite being single-threaded. Production angle: poor INP is often just "too much blocking main-thread work"; the fix is to chunk, defer, or move the work off-thread. Follow-up: "Is async/await blocking?" No — \`await\` pauses the function, not the whole thread; the rest continues via the event loop.`,
        },
        {
          q: "What is starvation in the event loop?",
          answer: `Starvation is when one category of work monopolizes the loop and prevents other work — rendering, input handling, or macrotasks — from ever running. Because the engine drains the *entire* microtask queue before rendering or taking the next macrotask, a microtask that keeps scheduling more microtasks can freeze the page forever.

~~~js
function starve() {
  Promise.resolve().then(starve); // each microtask queues another
}
starve();
// The browser never paints, never fires events, never runs setTimeout.
// The tab appears frozen even though no "long task" loop exists.
~~~

~~~
microtask drain loop:  m -> m -> m -> m -> ... (never empties)
                       ^ render & macrotasks NEVER get a turn
~~~

Two flavours:
1) Microtask starvation (above) — endless promise chaining; macrotasks/paint starve.
2) Macrotask/main-thread hogging — a single long synchronous task (heavy JSON parse, huge loop) blocks everything for its duration. This is what shows up as a "Long Task" (>50ms) and tanks INP.

Fixes:
- Break long work into chunks and yield to the loop: \`await scheduler.yield()\` (modern), or \`setTimeout(…, 0)\` / \`MessageChannel\` to hand control back so paint and input can happen.
- Move heavy compute to a Web Worker (off the main thread entirely).
- Don't recursively schedule microtasks unboundedly.

~~~js
async function processChunks(items) {
  for (let i = 0; i < items.length; i++) {
    doWork(items[i]);
    if (i % 50 === 0) await scheduler.yield(); // let browser breathe
  }
}
~~~

Production angle: at a high-traffic news site, third-party scripts + heavy scroll handlers create long tasks that starve interaction handling, hurting INP. The fix is yielding, throttling scroll handlers, and offloading scripts (Partytown/Web Worker).`,
        },
      ],
      tip: "Practice logging output-prediction questions. Very common in senior rounds.",
      rajnishAngle:
        "INP optimization at NBT is literally about unblocking the event loop — great story to tell.",
    },
    {
      title: "Prototype & this keyword",
      subtopics: ["Prototype chain", "Object.create", "call/apply/bind", "Arrow fn vs regular fn this"],
      questions: [
        {
          q: "How does prototypal inheritance differ from classical inheritance?",
          answer: `Classical inheritance (Java/C++): classes are blueprints; instances are created by copying structure from the class; inheritance is class-extends-class, resolved at compile time. Prototypal inheritance (JS): objects inherit directly from *other objects* via a live delegation link (\`[[Prototype]]\`, exposed as \`__proto__\`). There are no copies — property lookups *delegate* up a chain at runtime.

~~~js
const base = { greet() { return "hi " + this.name; } };
const user = Object.create(base);   // user.[[Prototype]] === base
user.name = "Raj";
user.greet(); // "hi Raj" — greet found on base via the chain
~~~

~~~
user ──[[Prototype]]──▶ base ──[[Prototype]]──▶ Object.prototype ──▶ null
 own: name              own: greet            own: toString,hasOwnProperty
~~~

Lookup algorithm: read \`obj.x\` -> check own properties -> if missing, follow \`[[Prototype]]\` link -> repeat until found or \`null\` (then \`undefined\`). Writes, by contrast, usually create an *own* property on the object (they don't mutate the prototype).

Key differences to articulate:
- Delegation, not copying — change a method on the prototype and *all* delegating objects see it instantly (live).
- Dynamic — you can alter the chain at runtime (\`Object.setPrototypeOf\`), though it's a perf footgun.
- \`class\` in JS is syntactic sugar over prototypes — \`class\` methods live on \`.prototype\`, \`extends\` sets up the chain. It looks classical but is prototypal underneath.

~~~js
class Animal { speak() { return "..."; } }
class Dog extends Animal { speak() { return "woof"; } }
// Dog.prototype.__proto__ === Animal.prototype
~~~

The "why": delegation gives memory efficiency (one shared method, not per-instance copies) and runtime flexibility. Follow-up: "What's the cost of a long prototype chain?" — slower lookups for deep misses; keep chains shallow. "\`hasOwnProperty\` vs \`in\`?" — \`in\` walks the chain, \`hasOwnProperty\` checks own only.`,
        },
        {
          q: "What does 'this' refer to in an arrow function vs regular function?",
          answer: `Regular functions get \`this\` bound *dynamically* at call time — it depends on *how* the function is called. Arrow functions have *no own* \`this\`; they capture it lexically from the enclosing scope at definition time (and it can never be reassigned, even with call/apply/bind).

The four call-site rules for a regular function's \`this\`:
~~~
1. new Foo()        -> this = the new object
2. obj.method()     -> this = obj (implicit binding)
3. fn.call/apply/bind(ctx) -> this = ctx (explicit)
4. fn()  (plain)    -> this = undefined (strict) | globalThis (sloppy)
   Default binding — the classic "lost this" bug.
~~~

~~~js
const obj = {
  name: "Raj",
  regular() { return this.name; },
  arrow: () => this.name, // 'this' = enclosing (module/undefined), NOT obj
};
obj.regular();        // "Raj"
obj.arrow();          // undefined — arrow ignores the call site
const f = obj.regular;
f();                  // undefined — 'this' lost (default binding)
~~~

Why arrows are great in callbacks: they "remember" the surrounding \`this\`, fixing the old leak:
~~~js
class Timer {
  count = 0;
  start() {
    setInterval(() => { this.count++; }, 1000); // arrow -> 'this' = instance
    // a regular fn here would have this=undefined/global -> bug
  }
}
~~~

React relevance: arrow class methods / inline arrows auto-bind \`this\`, avoiding the \`this.handleClick = this.handleClick.bind(this)\` boilerplate. But because arrows ignore call-site binding, you should NOT use them for object methods that rely on \`this\`, or for prototype methods.

Follow-ups: "Can you \`bind\` an arrow?" No effect on \`this\`. "What is \`this\` in a standalone arrow at module top level?" The module's \`this\` (undefined in ESM). "Event handler \`this\`?" Regular function -> the element; arrow -> lexical.`,
        },
        {
          q: "Explain Object.create() vs new keyword.",
          answer: `Both produce objects linked to a prototype, but they operate at different levels. \`Object.create(proto)\` directly creates a new object whose \`[[Prototype]]\` is exactly \`proto\` — no constructor runs. \`new Fn()\` runs a constructor function through a 4-step algorithm.

What \`new Fn(args)\` does under the hood:
~~~
1. Create a fresh object: obj = {}
2. Link it: obj.[[Prototype]] = Fn.prototype
3. Call Fn with this = obj (run constructor body)
4. Return obj  (unless the constructor explicitly returns an object)
~~~

~~~js
function User(name) { this.name = name; }
User.prototype.greet = function () { return "hi " + this.name; };

const a = new User("Raj");        // runs constructor, sets name
a.greet();                        // "hi Raj"

// Object.create: pick the prototype explicitly, no constructor
const proto = { greet() { return "hi " + this.name; } };
const b = Object.create(proto);   // b.[[Prototype]] === proto
b.name = "Raj";
b.greet();                        // "hi Raj"
~~~

Differences that matter:
- \`Object.create\` lets you set the prototype to *anything*, including \`null\` (\`Object.create(null)\` -> a "dictionary" object with no inherited props like \`toString\` — great for safe maps, avoids prototype-pollution surprises).
- \`new\` ties you to a constructor + its \`.prototype\`.
- \`Object.create(proto, propsDescriptor)\` can also define properties with full descriptors (writable/enumerable/configurable) in one call.

Hand-rolled \`new\` (great whiteboard answer):
~~~js
function myNew(Ctor, ...args) {
  const obj = Object.create(Ctor.prototype);   // steps 1-2
  const ret = Ctor.apply(obj, args);           // step 3
  return ret instanceof Object ? ret : obj;    // step 4
}
~~~

The "why": \`Object.create\` is the purest expression of prototypal inheritance (object-to-object). \`new\` is the constructor sugar most code uses. Follow-up: "How is \`class\` related?" \`class\` uses the \`new\` mechanism and wires \`extends\` via \`Object.create\`-like prototype linking internally.`,
        },
      ],
      tip: "Arrow functions are common in React — explain why they don't have their own 'this'.",
      rajnishAngle: "",
    },
    {
      title: "Data Types & Type Conversions",
      subtopics: [
        "Primitive vs reference types",
        "typeof quirks",
        "Truthy/falsy values",
        "Implicit coercion",
        "Explicit conversion",
        "call vs apply vs bind",
      ],
      questions: [
        {
          q: "What are the main JavaScript data types? Primitive vs reference?",
          answer: `JavaScript values fall into two broad buckets: **primitive values** and **objects (reference types)**.

**Primitive types**:
- \`string\`
- \`number\`
- \`bigint\`
- \`boolean\`
- \`undefined\`
- \`symbol\`
- \`null\`

Everything else is an **object/reference type**: plain objects, arrays, functions, dates, maps, sets, regexes, etc.

~~~js
const a = 10;                // primitive
const b = "hello";           // primitive
const c = null;              // primitive
const d = { name: "Raj" };   // object
const e = [1, 2, 3];         // object
const f = function () {};    // function object
~~~

The practical difference interviewers want:
- **Primitives are copied by value**
- **Objects are copied by reference**

~~~js
let x = 10;
let y = x;
y = 20;
console.log(x); // 10

const user1 = { name: "Raj" };
const user2 = user1;
user2.name = "Aman";
console.log(user1.name); // "Aman"
~~~

~~~
primitive copy:  x -> 10      y -> 10   (separate values)
object copy:     user1 ─┐
                        ├─▶ { name: "Raj" }
                 user2 ─┘   (same object)
~~~

Important quirks to mention:
- \`typeof null === "object"\` is a historical bug
- arrays are objects, so \`typeof [] === "object"\`
- functions are callable objects, so \`typeof fn === "function"\`

Why it matters: this explains mutation bugs, React state update mistakes, shallow vs deep copy issues, and why equality behaves differently for objects. Follow-up: "How do you detect arrays?" \`Array.isArray(x)\`. "How do you compare objects?" By reference unless you write a deep comparison.`,
        },
        {
          q: "How does type conversion work in JavaScript? Implicit vs explicit coercion?",
          answer: `JavaScript does **type conversion** in two ways:
- **Explicit conversion**: you intentionally convert using \`Number()\`, \`String()\`, \`Boolean()\`
- **Implicit coercion**: JavaScript converts automatically during operations/comparisons

~~~js
Number("42");      // 42
String(99);        // "99"
Boolean(0);        // false

"5" + 1;           // "51"   string concatenation
"5" - 1;           // 4      numeric coercion
true + 1;          // 2
null + 1;          // 1
undefined + 1;     // NaN
~~~

The mental model:
- If \`+\` sees a string, it often becomes **string concatenation**
- Math operators like \`-\`, \`*\`, \`/\` usually coerce to **number**
- Conditionals coerce values to **boolean**

~~~text
"5" + 1   -> "51"
"5" - 1   -> 4
Boolean("")  -> false
Boolean("0") -> true
~~~

The **falsy values** are only:
\`false\`, \`0\`, \`-0\`, \`0n\`, \`""\`, \`null\`, \`undefined\`, \`NaN\`

Everything else is truthy, including:
- \`[]\`
- \`{}\`
- \`"0"\`
- \`"false"\`

Common interview traps:
~~~js
[] == false;   // true
"" == 0;       // true
null == undefined; // true
null === undefined; // false
~~~

This is why senior engineers prefer:
- **explicit conversions when readability matters**
- **strict equality \`===\` instead of loose equality \`==\`**

Why it matters: coercion bugs cause real production issues in forms, query params, feature flags, and conditional rendering. Good interview line: "JavaScript coercion is powerful but surprising, so I prefer explicit conversion and strict equality unless I deliberately want coercion." Follow-up: "Difference between \`==\` and \`===\`?" \`==\` coerces, \`===\` compares without coercion.`,
        },
        {
          q: "What is the difference between call, apply, and bind?",
          answer: `All three let you control the value of **\`this\`** for a function, but they differ in **when** the function runs and **how** arguments are passed.

~~~js
function introduce(city, country) {
  return this.name + " from " + city + ", " + country;
}

const user = { name: "Raj" };

console.log(introduce.call(user, "Pune", "India"));
console.log(introduce.apply(user, ["Pune", "India"]));

const bound = introduce.bind(user, "Pune", "India");
console.log(bound());
~~~

Difference:
- \`call\` -> invokes immediately, args passed one by one
- \`apply\` -> invokes immediately, args passed as an array
- \`bind\` -> does **not** invoke immediately; returns a new function

~~~text
call  -> run now with this + args
apply -> run now with this + args[]
bind  -> make a new pre-configured function for later
~~~

When \`bind\` is especially useful:
- fixing the classic **lost this** callback problem
- partial application (presetting some arguments)

~~~js
const user2 = {
  name: "Raj",
  greet() {
    console.log(this.name);
  },
};

setTimeout(user2.greet, 100);            // undefined / lost this
setTimeout(user2.greet.bind(user2), 100); // "Raj"
~~~

One more subtlety:
- \`call\` and \`apply\` execute now
- \`bind\` is like preparing a reusable wrapper

Why it matters: this comes up constantly in JavaScript interviews because it tests whether you understand function invocation, \`this\`, and callbacks under the hood. Follow-up: "Does bind change the original function?" No, it returns a new one. "Can bind be used multiple times?" Yes, but rebinding a bound function's \`this\` usually doesn't change the original bound \`this\`.`,
        },
      ],
      tip: "Use === by default. Reach for explicit Number/String/Boolean conversion when code would otherwise depend on coercion magic.",
      rajnishAngle:
        "These questions show up in every frontend JS round because they connect directly to form handling, query params, and React state bugs.",
    },
    {
      title: "Async JavaScript",
      subtopics: [
        "Callbacks → Promises → async/await",
        "Promise.all / race / allSettled",
        "Error handling",
      ],
      questions: [
        {
          q: "What is Promise.allSettled vs Promise.all?",
          answer: `Both run promises concurrently and wait for multiple, but they differ in failure semantics — which makes them suited to very different situations.

\`Promise.all\` is fail-fast: it resolves with an array of all results *only if every* promise fulfills. The moment *any* rejects, the whole thing rejects immediately with that error (the other in-flight promises still run, but their results are discarded).

\`Promise.allSettled\` never short-circuits: it waits for *all* to settle and resolves with an array of outcome objects, each \`{ status: "fulfilled", value }\` or \`{ status: "rejected", reason }\`. It never rejects.

~~~js
const results = await Promise.allSettled([fetchA(), fetchB(), fetchC()]);
results.forEach((r) => {
  if (r.status === "fulfilled") use(r.value);
  else console.warn("failed:", r.reason);
});

try {
  const [a, b, c] = await Promise.all([fetchA(), fetchB(), fetchC()]);
} catch (e) {
  // one failure => we lost ALL results, even the successful ones
}
~~~

~~~
Promise.all       : [✓ ✓ ✗ ✓] -> REJECTS on first ✗ (all-or-nothing)
Promise.allSettled: [✓ ✓ ✗ ✓] -> RESOLVES with per-item status (partial OK)
~~~

When to use which:
- \`all\` -> the results are interdependent; if one fails the whole operation is meaningless (e.g. you need user + permissions + config together to render).
- \`allSettled\` -> independent, best-effort fetches where partial success is acceptable.

Production angle: rendering a news article page = article body + related articles + ad config in parallel. Use \`allSettled\` so a failing ad-config call doesn't blank the whole page — render the article, skip the ads. Using \`all\` there would be a reliability bug.

Follow-up: cousins to mention — \`Promise.race\` (first to settle, success or fail) and \`Promise.any\` (first to *fulfill*, ignores rejections until all fail -> AggregateError).`,
        },
        {
          q: "How do you handle errors in async/await?",
          answer: `\`await\` makes a rejected promise *throw* at the await point, so you handle it with ordinary \`try/catch/finally\`. That's the headline benefit over \`.then().catch()\` — synchronous-looking error flow.

~~~js
async function load() {
  try {
    const res = await fetch("/api/article");
    if (!res.ok) throw new Error("HTTP " + res.status); // fetch won't throw on 4xx/5xx!
    return await res.json();
  } catch (err) {
    report(err);          // network error OR the thrown HTTP error
    return fallback;
  } finally {
    setLoading(false);    // always runs
  }
}
~~~

Critical gotcha interviewers probe: \`fetch\` only rejects on *network* failure (DNS, offline, CORS). A 404/500 still resolves successfully — you must check \`res.ok\` yourself. Juniors miss this constantly.

Patterns for robustness:
- Parallel awaits — don't \`try/catch\` each; wrap the \`Promise.all\`/\`allSettled\`:
~~~js
const [a, b] = await Promise.all([getA(), getB()]); // one catch covers both
~~~
- \`await\` inside loops: a throw breaks the loop. Use \`allSettled\` if you want to continue past failures.
- Go-style wrapper to avoid try/catch pyramids:
~~~js
const to = (p) => p.then((d) => [null, d]).catch((e) => [e, null]);
const [err, data] = await to(fetchUser());
if (err) return handle(err);
~~~
- Re-throw if you can't handle it here — don't swallow errors silently (that hides bugs and breaks observability).
- Unhandled rejections: an async function that throws with no \`catch\` produces an unhandled promise rejection. Add a global net: \`window.onunhandledrejection\` (browser) / \`process.on("unhandledRejection")\` (Node) to log to Sentry.

Production angle: a shared fetch wrapper that checks \`res.ok\`, retries 5xx with backoff, fails fast on 4xx, and forwards to Sentry — used across all news-feed fetches.`,
        },
        {
          q: "What is the difference between parallel and sequential async execution?",
          answer: `Sequential = each await waits for the previous to finish before starting the next (total time ≈ sum). Parallel = kick all operations off together, then await them collectively (total time ≈ the slowest one). For *independent* tasks, sequential awaiting is a common, costly performance bug.

~~~js
// SEQUENTIAL — ~300ms (100+100+100). Each await blocks the next start.
const a = await getA(); // waits 100ms
const b = await getB(); // THEN waits 100ms
const c = await getC(); // THEN waits 100ms

// PARALLEL — ~100ms. All start immediately, await together.
const [a, b, c] = await Promise.all([getA(), getB(), getC()]);
~~~

~~~
sequential:  A────▶ B────▶ C────▶            (3x latency)
parallel:    A────▶
             B────▶   } all at once          (1x latency)
             C────▶
~~~

The mechanism: calling \`getA()\` starts the async work immediately and returns a promise. \`await\` only pauses the *current function's* continuation; it doesn't stop other promises from progressing. So if you create all the promises first and await later, they overlap.

~~~js
// also parallel — start first, await after:
const pA = getA(), pB = getB();
const a = await pA, b = await pB;
~~~

When to keep it sequential: when each step *depends* on the previous (B needs A's id). Then you have no choice.

Classic trap — \`await\` in \`forEach\` doesn't do what people expect (it doesn't wait, and it's accidentally "parallel-but-unawaited"):
~~~js
items.forEach(async (i) => { await save(i); }); // forEach ignores the promises
// sequential:  for (const i of items) await save(i);
// parallel:    await Promise.all(items.map(save));
~~~

Production angle: Next.js RSC data fetching — fetching article + metadata + recommendations with \`Promise.all\` instead of three sequential awaits cuts TTFB dramatically. Follow-up: "How do you limit parallelism to N?" — a concurrency pool / chunked \`Promise.all\` so you don't fire 500 requests at once.`,
        },
      ],
      tip: "Write code for fetching multiple APIs in parallel — it comes up in every senior interview.",
      rajnishAngle:
        "Parallel data fetching in Next.js RSC — you've done this for news feeds.",
    },
  ],
};
