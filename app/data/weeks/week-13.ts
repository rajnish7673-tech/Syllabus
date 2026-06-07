import type { Week } from "../types";

export const week13: Week = {
  week: 13,
  theme: "TypeScript for Senior Engineers",
  color: "#3B82F6",
  topics: [
    {
      title: "Type System Fundamentals",
      subtopics: [
        "type vs interface",
        "Union & intersection types",
        "Literal types",
        "Type narrowing",
        "typeof / instanceof guards",
        "unknown vs any",
      ],
      questions: [
        {
          q: "What is the difference between type and interface in TypeScript? When do you use each?",
          answer: `Both define the shape of objects, and for most object types they're **interchangeable**. The differences are in **capabilities** and **extensibility**.

~~~ts
// interface — declaration merging, extends
interface User { name: string; }
interface User { age: number; }     // MERGES -> { name, age }  (declaration merging)
interface Admin extends User { role: string; }

// type — aliases ANYTHING (unions, tuples, primitives, mapped/conditional)
type ID = string | number;          // union — interfaces CAN'T do this
type Point = [number, number];      // tuple
type Admin2 = User & { role: string }; // intersection (type's "extends")
type Keys = keyof User;             // mapped/utility composition
~~~

~~~
                      interface              type
object shapes         yes                    yes
unions / tuples       NO                     YES (type ID = A | B)
primitives/aliases    no                     yes (type Name = string)
extends               extends keyword        & (intersection)
declaration merging   YES (re-open & add)    NO (duplicate = error)
mapped/conditional    no                     yes
~~~

When to use which (the common guidance):
- **interface** for **object/class shapes**, especially **public API surfaces** that might be **extended or augmented** — declaration merging lets consumers/libs add to it (e.g. augmenting \`Window\`, Express \`Request\`). Slightly better error messages and tooling for objects.
- **type** for **unions, tuples, primitives, function types, and computed/mapped/conditional types** — anything beyond a plain object shape.

The honest senior take: **pick one as a default and be consistent.** Many teams default to \`interface\` for objects (extensible, mergeable) and reach for \`type\` when they need unions/tuples/advanced composition. The React docs now prefer typing props as plain object types/interfaces (no \`React.FC\`).

Why it matters: a constant beginner question; the senior answer is "interchangeable for object shapes, but **only \`type\` does unions/tuples/mapped types**, and **only \`interface\` does declaration merging**" — plus a consistency recommendation. Production angle: typing component props and API-response shapes (interface), union types for state/variants and route params (type), augmenting third-party types via interface merging. Follow-up: "Can interface do unions?" No — use \`type\`. "Why might a library use interface?" So consumers can augment it via declaration merging. "React.FC?" Discouraged — type props explicitly.`,
        },
        {
          q: "What is type narrowing and what are the different ways to achieve it?",
          answer: `**Type narrowing** is when TypeScript **refines a broader type to a more specific one** within a code branch, based on checks you perform — so you can safely access members specific to the narrowed type. The compiler's **control-flow analysis** tracks these checks.

The narrowing techniques:
~~~ts
function process(value: string | number | null | Date | string[]) {
  // 1. typeof guard (primitives)
  if (typeof value === 'string') value.toUpperCase();   // value: string

  // 2. truthiness / null check
  if (value === null) return;                            // narrows out null

  // 3. instanceof guard (classes)
  if (value instanceof Date) value.getFullYear();        // value: Date

  // 4. Array.isArray
  if (Array.isArray(value)) value.length;                // value: string[]

  // 5. 'in' operator (property presence)
  // if ('name' in obj) ...
}

// 6. Equality / literal narrowing
type Dir = 'up' | 'down';
function move(d: Dir) { if (d === 'up') { /* d: 'up' */ } }

// 7. Discriminated union (tagged union) — narrow by a literal "tag"
type Shape = { kind: 'circle'; r: number } | { kind: 'square'; s: number };
function area(sh: Shape) {
  switch (sh.kind) {
    case 'circle': return Math.PI * sh.r ** 2;   // sh: circle
    case 'square': return sh.s ** 2;             // sh: square
  }
}

// 8. Custom type guard (user-defined predicate: 'arg is Type')
function isString(x: unknown): x is string { return typeof x === 'string'; }
if (isString(val)) val.toUpperCase();            // val: string

// 9. Assertion functions ('asserts x is T')
function assertDefined<T>(x: T): asserts x is NonNullable<T> { if (x == null) throw new Error(); }
~~~

~~~
broad type (string | number | null) ─▶ a check (typeof/instanceof/in/===/guard)
   ─▶ within that branch, TS NARROWS to the specific type ─▶ safe member access
~~~

Key tools:
- **\`typeof\`** for primitives, **\`instanceof\`** for classes, **\`Array.isArray\`**, **\`in\`** for property presence, **equality/literal** checks, and **discriminated unions** (a shared literal \`kind\`/\`type\` field — the cleanest, most scalable pattern, great with \`switch\`).
- **User-defined type guards** (\`x is T\`) and **assertion functions** (\`asserts x is T\`) for custom/reusable narrowing.
- **Exhaustiveness checking** with \`never\`: in a discriminated-union switch, a \`default: const _exhaustive: never = sh;\` makes the compiler error if you forget a case.

Why it matters: narrowing is how you write **type-safe code over unions** (very common with API responses, state, and variants); knowing the **full toolbox (typeof/instanceof/in/discriminated unions/custom guards/assertion fns)** is senior-level. Production angle: discriminated unions for component/loading state (\`{ status: 'loading' } | { status: 'error', error } | { status: 'success', data }\`) with exhaustive switches, and custom type guards validating API responses. Follow-up: "Best for many cases?" Discriminated unions + switch + \`never\` exhaustiveness. "Custom guard syntax?" \`function isX(v): v is X\`. "Assertion function?" \`asserts v is T\` — narrows after the call (throws otherwise).`,
        },
        {
          q: "What is the difference between unknown and any?",
          answer: `Both can hold **any value**, but they differ critically in **type safety**: **\`any\` disables type checking** (you can do anything with it, unsafely); **\`unknown\` is the type-safe counterpart** — you can assign anything *to* it, but you **can't use it** until you **narrow** it to a specific type first.

~~~ts
let a: any;
a = 5; a.foo.bar(); a();        // ALL allowed — no checks, no safety (runtime crash risk)

let u: unknown;
u = 5; u = 'hi'; u = {};        // assigning anything TO unknown is fine
u.toUpperCase();                // ❌ ERROR — can't use unknown without narrowing
if (typeof u === 'string') u.toUpperCase();  // ✅ narrowed to string -> safe
~~~

~~~
                 any                          unknown
holds anything   yes                          yes
use without check yes (UNSAFE — no errors)     NO (must narrow first) — SAFE
assignable TO     anything (escapes the type)  only unknown/any (contained)
type checking     OFF                          ON
~~~

The crucial distinction:
- **\`any\` is a "type system escape hatch"** — it **turns off** type checking for that value and, worse, it **propagates**: \`any\` is assignable to everything, so it silently spreads unsafety through your code. It defeats the purpose of TypeScript.
- **\`unknown\` is "I don't know the type yet, force me to check"** — it accepts any value but **forces you to narrow** (via typeof/instanceof/guards/validation) before use, and it's **only assignable to \`unknown\`/\`any\`** (it can't silently leak into typed code). It's **type-safe \`any\`.**

When to use each:
- **\`unknown\`** — for values whose type you genuinely don't know at compile time but want to handle safely: \`JSON.parse()\` results, \`catch (err: unknown)\` (errors are \`unknown\` in modern TS), external/untrusted input, generic APIs. Narrow/validate (often with **Zod** or a type guard) before use.
- **\`any\`** — **avoid**; only as a last-resort escape for gradual migration or truly untypeable third-party code, ideally isolated. \`strict\` mode flags implicit \`any\`.

~~~ts
try { /* ... */ } catch (err) {               // err: unknown (modern TS)
  if (err instanceof Error) console.log(err.message); // narrow before use
}
const data: unknown = JSON.parse(raw);
const user = UserSchema.parse(data);           // validate -> typed (Zod)
~~~

Why it matters: preferring **\`unknown\` over \`any\`** is a hallmark of safe TypeScript — it keeps the compiler's guarantees at boundaries (parsed JSON, errors, external input) instead of throwing them away; the senior answer stresses that **\`any\` propagates unsafely while \`unknown\` forces narrowing**. Production angle: typing API responses and \`catch\` errors as \`unknown\` then validating (Zod/type guards) before use — so malformed data is caught, not silently trusted. Follow-up: "Why not any?" It disables checking and spreads. "catch error type?" \`unknown\` in strict TS — narrow with \`instanceof Error\`. "Assign unknown to a string?" Not without narrowing/asserting; that's the safety.`,
        },
      ],
      tip: "Prefer interface for objects (extendable), type for unions/tuples/mapped types. Prefer unknown over any — it forces you to narrow.",
      rajnishAngle:
        "Typing Next.js page props, API responses, and component props at Times Internet.",
    },
    {
      title: "Generics",
      subtopics: [
        "Generic functions",
        "Generic constraints (extends)",
        "Generic components in React",
        "Conditional types",
        "infer keyword",
      ],
      questions: [
        {
          q: "Write a generic function that returns the first element of any array.",
          answer: `**Generics** let a function work over **any type while preserving type information** — instead of \`any\` (which loses types), a type parameter \`<T>\` flows the input type to the output. A "first element" function is the classic intro:

~~~ts
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

const n = first([1, 2, 3]);          // n: number | undefined  (T inferred as number)
const s = first(['a', 'b']);         // s: string | undefined  (T inferred as string)
const u = first<User>(users);        // explicit type arg
~~~

~~~
first<T>(arr: T[]): T | undefined
  call with number[] -> T = number -> returns number | undefined
  call with string[] -> T = string -> returns string | undefined
  TYPE FLOWS through; no 'any', full inference at the call site
~~~

Why generic, not \`any\`:
~~~ts
function firstAny(arr: any[]): any { return arr[0]; }
const x = firstAny([1, 2]);          // x: any  -> lost the type, no safety/autocomplete
~~~
With \`any\`, the return type is \`any\` — you lose the connection between input and output. With \`<T>\`, TypeScript **infers** \`T\` from the argument and gives you a precisely-typed result.

Notes/variations interviewers like:
- **\`T | undefined\`** return — accessing \`arr[0]\` on a possibly-empty array can be undefined (honest typing; with \`noUncheckedIndexedAccess\` this is enforced).
- **Inference** — you rarely pass \`<T>\` explicitly; TS infers it from the argument. That's the power: write once, type-safe for all element types.
- **Constraints** — add \`<T extends ...>\` to restrict what \`T\` can be (next question).
- **Multiple type params** — \`function pair<A, B>(a: A, b: B): [A, B]\`.
- **Generic arrow / in React** — \`const first = <T,>(arr: T[]): T | undefined => arr[0];\` (the trailing comma \`<T,>\` disambiguates from JSX in .tsx files).

~~~ts
// last, map, identity — same idea
function identity<T>(x: T): T { return x; }
function lastOf<T>(arr: T[]): T | undefined { return arr[arr.length - 1]; }
~~~

Why it matters: generics are the foundation of **reusable, type-safe utilities** (the difference between \`any\` and real typing); writing \`first<T>\` fluently and explaining **type inference + why it beats \`any\`** is table-stakes TS. Production angle: a generic API wrapper \`fetchJson<T>(url): Promise<T>\`, generic data-table/list utilities, and reusable hooks all rely on this pattern across the codebase. Follow-up: "Why not any?" Loses the input->output type link. "Return type?" \`T | undefined\` (array may be empty). "Multiple params / constraints?" \`<A, B>\`, \`<T extends X>\`. "Generic in .tsx?" Use \`<T,>\` to avoid JSX ambiguity.`,
        },
        {
          q: "What are generic constraints? Give an example with extends.",
          answer: `A **generic constraint** restricts what types a type parameter can be, using **\`extends\`**: \`<T extends Constraint>\` means "T can be any type that is assignable to \`Constraint\`." This lets you **safely access members** of \`T\` inside the function (which you couldn't on an unconstrained \`T\`) while still keeping it generic.

~~~ts
// WITHOUT constraint — can't access .length (T might not have it)
function longest<T>(a: T, b: T): T {
  return a.length > b.length ? a : b;   // ❌ Error: 'length' does not exist on T
}

// WITH constraint — T must have a numeric 'length'
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length > b.length ? a : b;   // ✅ safe — T is guaranteed to have .length
}
longest('hello', 'hi');                 // ok (strings have length)
longest([1, 2], [3]);                   // ok (arrays have length)
longest(1, 2);                          // ❌ Error: number has no 'length'
~~~

~~~
<T extends Shape>  ->  "T is any type assignable to Shape"
   -> inside the fn you may use Shape's members on T (type-safe)
   -> at the call site, only matching types are allowed
~~~

The powerful **\`keyof\` constraint** — type-safe property access (a classic interview example):
~~~ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];               // K is constrained to T's keys; return type is T[K]
}
const user = { name: 'Raj', age: 30 };
getProp(user, 'name');           // string  (T[K] inferred)
getProp(user, 'age');            // number
getProp(user, 'xyz');            // ❌ Error: 'xyz' is not a key of user
~~~
\`K extends keyof T\` guarantees \`key\` is a real property of \`obj\`, and \`T[K]\` (an **indexed access type**) gives the exact value type — fully type-safe dynamic property access.

Other common constraints:
~~~ts
<T extends object>                 // any non-primitive
<T extends unknown[]>              // any array/tuple
<T extends (...args: any[]) => any> // any function (for HOFs)
<T extends { id: string }>         // must have an id (entities)
function clone<T extends object>(o: T): T { return { ...o }; }
~~~

Constraints can also have **defaults**: \`<T extends string = string>\`.

Why it matters: constraints are what make generics **both flexible and safe** — you can operate on \`T\`'s known members without resorting to \`any\`; the **\`keyof\`/\`T[K]\`** pattern for type-safe property access is a frequent senior question. Production angle: generic utilities like \`getProp\`/\`pick\`/\`groupBy<T extends {id}>\`, a typed event emitter \`on<K extends keyof Events>\`, and form/field helpers all use constrained generics. Follow-up: "Why constrain?" To use T's members safely while staying generic. "keyof + T[K]?" Type-safe access: key restricted to real keys, return type is the exact property type. "Default type param?" \`<T extends X = X>\`.`,
        },
        {
          q: "What is the infer keyword and where would you use it?",
          answer: `**\`infer\`** is used inside a **conditional type** to **extract (capture) a type from another type into a named type variable**, which you can then use in the result. It's how TypeScript "pulls out" a piece of a type — the return type of a function, the element type of an array, the resolved type of a Promise, etc. It only appears within the \`extends\` clause of a conditional type.

~~~ts
// the pattern: T extends SomeShape<infer X> ? X : fallback
// "if T matches this shape, capture the X part and return it"

// extract a function's RETURN type (this is how ReturnType<T> works):
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type A = MyReturnType<() => string>;          // string
type B = MyReturnType<(x: number) => boolean>; // boolean

// extract an array's ELEMENT type:
type ElementType<T> = T extends (infer U)[] ? U : never;
type C = ElementType<number[]>;               // number
type D = ElementType<string[]>;               // string

// unwrap a Promise's resolved type (like Awaited<T>):
type Unwrap<T> = T extends Promise<infer V> ? V : T;
type E = Unwrap<Promise<User>>;               // User
type F = Unwrap<number>;                       // number (not a promise -> T)

// extract the FIRST parameter type:
type FirstArg<T> = T extends (first: infer P, ...rest: any[]) => any ? P : never;
~~~

~~~
conditional type:  T extends Pattern<infer X> ? UseX : Fallback
   infer X  =  "match this position and capture whatever type is there as X"
~~~

How it works: a **conditional type** (\`T extends U ? A : B\`) asks "is T assignable to U?" With \`infer\`, you put a **placeholder** in \`U\` — when TS pattern-matches \`T\` against the shape, it **binds the matched type to the \`infer\` variable**, which you reference in the true branch. It's structural pattern-matching on types.

Where you use it:
- Building **utility types** that extract parts of other types — \`ReturnType\`, \`Parameters\`, \`Awaited\`, \`InstanceType\` are all built on \`infer\`.
- Unwrapping containers: get the element of an array, the resolved value of a Promise, the props of a component, the value type of a Map, etc.
- Advanced library typing (typing wrappers/HOFs where the result type depends on extracting something from the input type).

~~~ts
// real-world: infer a React component's props type
type PropsOf<C> = C extends React.ComponentType<infer P> ? P : never;
~~~

Why it matters: \`infer\` is the key to **type extraction** and understanding how built-in utility types work; it's an advanced-TS signal. Knowing the **\`T extends X<infer R> ? R : never\`** pattern and naming real uses (ReturnType/Awaited/element type) shows you can write library-grade types. Production angle: extracting types from existing values to avoid duplication — e.g. inferring an API client's response type, a component's props, or a Zod schema's output type instead of re-declaring them. Follow-up: "Where can infer appear?" Only in the \`extends\` clause of a conditional type. "Built-ins using it?" ReturnType, Parameters, Awaited, InstanceType. "Multiple infers?" Allowed — capture several positions in one pattern.`,
        },
      ],
      tip: "Generics are the key to reusable, type-safe utilities. Constraints (extends) let you safely use T's members. infer extracts types in conditional types.",
      rajnishAngle:
        "Generic API response wrapper type used across multiple Times Internet data-fetching utilities.",
    },
    {
      title: "Advanced Types & Utility Types",
      subtopics: [
        "Mapped types",
        "Conditional types",
        "Utility types (Partial, Pick, Omit, Record, ReturnType)",
        "Discriminated unions",
        "DeepPartial",
      ],
      questions: [
        {
          q: "What is a mapped type? Write a DeepPartial<T> type.",
          answer: `A **mapped type** creates a new type by **iterating over the keys of an existing type** and transforming each property — using the \`[K in keyof T]\` syntax. It's how the built-in utility types (\`Partial\`, \`Required\`, \`Readonly\`, \`Pick\`, \`Record\`) are implemented.

~~~ts
// the mapped-type syntax: for each key K in keyof T, define a property
type MyPartial<T> = { [K in keyof T]?: T[K] };        // make all optional (built-in Partial)
type MyReadonly<T> = { readonly [K in keyof T]: T[K] }; // make all readonly
type MyRequired<T> = { [K in keyof T]-?: T[K] };       // -? removes optionality
type Nullable<T> = { [K in keyof T]: T[K] | null };    // transform value types

interface User { name: string; address?: { city: string } }
type PartialUser = MyPartial<User>;   // { name?: string; address?: {...} }
~~~

~~~
{ [K in keyof T]: ... }
  K  = each property key of T
  T[K] = that property's value type (indexed access)
  modifiers:  ?  (optional)   readonly   -?  (remove optional)   -readonly (remove readonly)
~~~

**\`DeepPartial<T>\`** — makes properties optional **recursively** (the standard "write this type" interview ask):
~~~ts
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? T[K] extends (infer U)[]                  // arrays: recurse into element type
      ? DeepPartial<U>[]
      : DeepPartial<T[K]>                       // nested object: recurse
    : T[K];                                     // primitive: leave as-is (optional)
};

interface Config { server: { host: string; port: number }; tags: string[] }
type PartialConfig = DeepPartial<Config>;
// { server?: { host?: string; port?: number }; tags?: ...[] }
const patch: PartialConfig = { server: { host: 'x' } };  // ✅ deeply optional
~~~

The mechanism: map over each key making it optional (\`?\`); if the value is an **object**, **recurse** with \`DeepPartial\` (handling arrays specially so you recurse into the element type, not the array); otherwise keep the primitive. The simpler shallow \`Partial<T>\` only makes the **top level** optional — \`DeepPartial\` goes all the way down (useful for config merges, partial updates, mock factories).

Bonus — **key remapping with \`as\`** (TS 4.1+), e.g. generate getter names or filter keys:
~~~ts
type Getters<T> = { [K in keyof T as \`get\${Capitalize<string & K>}\`]: () => T[K] };
// { getName: () => string; ... }  (template-literal key remapping)
~~~

Why it matters: mapped types are the foundation of TS's utility types and a common "implement DeepPartial/your own Partial" coding-round task; knowing **\`[K in keyof T]\`, the modifiers (\`?\`/\`readonly\`/\`-?\`), recursion, and key remapping** shows you can build types, not just use them. Production angle: \`DeepPartial\` for deep config/state patch objects and test mock factories; custom mapped types to derive form-state or readonly view types from domain models. Follow-up: "Built-ins using mapped types?" Partial/Required/Readonly/Pick/Record. "DeepPartial vs Partial?" Deep recurses into nested objects; Partial is one level. "Key remapping?" \`[K in keyof T as NewKey]\` to rename/filter keys.`,
        },
        {
          q: "What is a discriminated union and why is it useful for state machines?",
          answer: `A **discriminated union** (tagged union) is a union of object types that **share a common literal "discriminant" property** (the *tag*) with a unique value per member. TypeScript uses that tag to **narrow** the union to a specific member, giving exhaustive, type-safe handling — ideal for modeling **states/variants**.

~~~ts
// each member has a literal 'status' tag (the discriminant)
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }        // 'data' only exists on success
  | { status: 'error'; error: string };   // 'error' only exists on error

function render(state: RequestState<User>) {
  switch (state.status) {                  // narrow by the tag
    case 'idle':    return 'Idle';
    case 'loading': return 'Loading...';
    case 'success': return state.data.name;   // ✅ TS knows 'data' exists here
    case 'error':   return state.error;       // ✅ 'error' exists here
    default:
      const _exhaustive: never = state;       // exhaustiveness check (see below)
      return _exhaustive;
  }
}
~~~

~~~
union of variants sharing a literal tag:
  { status:'loading' } | { status:'success', data } | { status:'error', error }
  switch(state.status) -> each case NARROWS to that variant -> safe member access
~~~

Why it's perfect for state machines / UI state:
1. **Models mutually-exclusive states accurately** — a request is *either* loading *or* success *or* error, never a mushy \`{ loading: boolean; data?: T; error?: string }\` where invalid combinations (loading **and** error) are representable. The union **makes illegal states unrepresentable**.
2. **Type-safe access per state** — \`data\` is only accessible after narrowing to \`success\`; you can't accidentally read \`state.data\` while loading (compile error). This kills a whole class of bugs.
3. **Exhaustiveness checking with \`never\`** — assigning the narrowed \`state\` to a \`never\` in \`default\` makes the compiler **error if you add a new state and forget to handle it** — the union and the switch stay in sync. Invaluable as state machines grow.

Compare the anti-pattern:
~~~ts
// ❌ booleans/optionals: illegal combos possible, unsafe access
interface BadState<T> { isLoading: boolean; data?: T; error?: string }
// can be { isLoading: true, error: 'x', data: {...} } — nonsensical
~~~

This is also the model behind **reducers** (action types as a discriminated union -> exhaustive \`switch\` in the reducer), XState, and Redux Toolkit slices.

Why it matters: discriminated unions are the idiomatic TS way to model **state/variants safely** (loading states, reducer actions, API results, shape types) — "make illegal states unrepresentable" + exhaustiveness is a senior design principle. Production angle: typing data-fetching/UI state and Redux actions as discriminated unions with exhaustive switches, so adding a new state forces every handler to be updated (compiler-enforced). Follow-up: "vs boolean flags?" Unions forbid illegal combinations and give per-state type safety. "Exhaustiveness?" \`const _: never = state\` in default errors on unhandled cases. "Where else?" Reducer actions, shape/AST node types, result types.`,
        },
        {
          q: "What does ReturnType<T> do and when would you use it?",
          answer: `**\`ReturnType<T>\`** is a **built-in utility type** that **extracts the return type of a function type**. \`ReturnType<typeof fn>\` gives you the type \`fn\` returns — so you can reference it without manually re-declaring it (DRY). It's implemented with a conditional type + \`infer\` (see the infer question).

~~~ts
function createUser(name: string) {
  return { id: crypto.randomUUID(), name, createdAt: new Date() };
}
type User = ReturnType<typeof createUser>;
// User = { id: string; name: string; createdAt: Date }  — derived, not hand-written

// under the hood:
type ReturnTypeImpl<T extends (...a: any[]) => any> = T extends (...a: any[]) => infer R ? R : never;
~~~

~~~
ReturnType<typeof someFunction>  ->  the type that function returns
   single source of truth: change the function, the type updates automatically
~~~

When to use it (the value — **deriving types from values instead of duplicating**):
1. **Avoid re-declaring a function's output type** — if a factory/selector/action-creator returns a shape, derive the type from it rather than maintaining a parallel interface that can drift out of sync.
2. **Redux action creators** — \`type Action = ReturnType<typeof setUser>\` keeps the action type tied to the creator.
3. **Custom hooks / selectors** — \`type AuthState = ReturnType<typeof useAuth>\` to type consumers without restating the shape.
4. **Inferring from libraries** — capture the return type of a library function you call (e.g. a config builder, a Zod \`.parse\`, an ORM query).

It pairs with **sibling utility types** that also extract from functions/types:
~~~
ReturnType<T>     -> the return type of function T
Parameters<T>     -> a TUPLE of T's parameter types
Awaited<T>        -> unwraps Promise (resolved value type)
InstanceType<T>   -> instance type of a class constructor
ConstructorParameters<T> -> constructor's params
~~~
~~~ts
type Args = Parameters<typeof createUser>;        // [name: string]
type Result = Awaited<ReturnType<typeof fetchUser>>; // unwrap a Promise-returning fn
~~~

Common pitfall: use **\`ReturnType<typeof fn>\`** (with \`typeof\`) when you have a **function value**; \`ReturnType<MyFnType>\` when you have a function **type**. Forgetting \`typeof\` on a value is the usual mistake.

Why it matters: \`ReturnType\` (and friends \`Parameters\`/\`Awaited\`) embody **"derive types from implementation, don't duplicate them"** — keeping types and code in sync automatically; knowing them (and that they're \`infer\`-based) is everyday senior TS. Production angle: typing Redux actions from creators, hook returns, and API/selector outputs via \`ReturnType\`/\`Awaited\` so refactors don't desync a hand-maintained interface. Follow-up: "How implemented?" Conditional type + \`infer R\`. "typeof needed?" Yes for function *values*. "Get param types?" \`Parameters<T>\` (a tuple). "Unwrap a Promise-returning fn?" \`Awaited<ReturnType<typeof fn>>\`.`,
        },
      ],
      tip: "Utility types appear in almost every senior TS interview. Know Partial, Required, Readonly, Pick, Omit, Record, ReturnType, Parameters, Awaited cold.",
      rajnishAngle:
        "DeepPartial for config patches; ReturnType to derive action/hook types — real patterns across the codebase.",
    },
    {
      title: "TypeScript with React & Next.js",
      subtopics: [
        "Typing props & children",
        "Typing hooks",
        "Typing events",
        "Typing Server Components",
        "Generic components",
      ],
      questions: [
        {
          q: "How do you type children in React with TypeScript?",
          answer: `Children are typed with **\`React.ReactNode\`** — the broadest, correct type that covers everything React can render: JSX elements, strings, numbers, arrays, fragments, portals, \`null\`/\`undefined\`/\`boolean\` (which render nothing).

~~~tsx
// explicit prop type (recommended modern style)
interface CardProps {
  title: string;
  children: React.ReactNode;     // anything renderable
}
function Card({ title, children }: CardProps) {
  return <section><h2>{title}</h2>{children}</section>;
}

// usage — strings, elements, arrays, expressions all valid:
<Card title="News"><p>hi</p>{items.map(i => <Row key={i.id} />)}</Card>
~~~

~~~
React.ReactNode  ⊇  JSX.Element | string | number | boolean | null | undefined | ReactNode[]
   = everything React can render -> the right type for generic 'children'
~~~

The options and when to use which:
- **\`React.ReactNode\`** — the default for \`children\` (covers all renderable content). Use this unless you need to restrict.
- **\`React.ReactElement\` / \`JSX.Element\`** — when children must be **a single JSX element** (not a string/array). More restrictive.
- **\`React.ReactNode\` with function children (render props)** — \`children: (value: T) => React.ReactNode\`.
- **\`PropsWithChildren<P>\`** — a helper that adds \`children?: ReactNode\` to your props (handy, though many prefer declaring it explicitly):
~~~tsx
function Card({ title, children }: React.PropsWithChildren<{ title: string }>) { ... }
~~~

**Avoid \`React.FC\`** (the modern recommendation): \`React.FC\` used to auto-include \`children\`, but it's discouraged now — it implicitly adds \`children\` (even to components that shouldn't have any), complicates generics, and the React docs/types moved away from it. Prefer typing props explicitly and adding \`children: ReactNode\` when needed:
~~~tsx
// ❌ discouraged
const Card: React.FC<{ title: string }> = ({ title, children }) => ...
// ✅ preferred — explicit props, explicit children
function Card({ title, children }: { title: string; children: React.ReactNode }) { ... }
~~~

Why it matters: typing \`children\` correctly (and knowing **\`ReactNode\` vs \`ReactElement\`** and why **\`React.FC\` is out of favor**) is a very common React+TS question; it signals you're current with React typing conventions. Production angle: layout/card/section components across the design system take \`children: React.ReactNode\`; constrained slots (e.g. a Tabs component requiring \`<Tab>\` elements) use more specific element types; render-prop components type children as functions. Follow-up: "ReactNode vs ReactElement?" Node = anything renderable; Element = a single JSX element. "Why not React.FC?" Implicit children + generics friction — type props explicitly. "Render props?" \`children: (arg: T) => React.ReactNode\`.`,
        },
        {
          q: "How do you type a custom hook that returns a tuple?",
          answer: `Hooks that return a **fixed-length, positional array** (like \`useState\`'s \`[value, setter]\`) should be typed as a **tuple** so each position keeps its specific type. By default TypeScript **infers an array of a union type** (\`(T | Setter)[]\`), which loses positional types — you fix this with an explicit **tuple return type** or **\`as const\`**.

~~~tsx
// ❌ inferred as (boolean | (() => void))[] — destructured types are wrong/union
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = () => setOn(o => !o);
  return [on, toggle];                      // inferred: (boolean | (() => void))[]
}
const [isOpen, toggle] = useToggle();       // both: boolean | (() => void)  ❌

// ✅ explicit tuple return type — each position keeps its type
function useToggle(initial = false): [boolean, () => void] {
  const [on, setOn] = useState(initial);
  return [on, () => setOn(o => !o)];
}
const [isOpen, toggle] = useToggle();       // isOpen: boolean, toggle: () => void  ✅

// ✅ alternative: 'as const' makes the array a readonly tuple, preserving positions
function useCounter(start = 0) {
  const [count, setCount] = useState(start);
  return [count, () => setCount(c => c + 1)] as const; // readonly [number, () => void]
}
~~~

~~~
return [a, b]            -> inferred: (typeof a | typeof b)[]   (union array — loses positions)
return [a, b] as const   -> readonly [typeof a, typeof b]        (tuple — positions kept)
explicit : [A, B]        -> [A, B]                                (tuple — positions kept)
~~~

The two fixes:
1. **Explicit tuple return annotation** — \`: [boolean, () => void]\`. Clearest and most controlled; documents the API.
2. **\`as const\`** — turns the returned array literal into a **readonly tuple**, so TS infers \`readonly [number, () => void]\` and destructuring gets the right per-position types. Less boilerplate but the tuple is \`readonly\`.

For a **generic** tuple-returning hook, use a generic + tuple:
~~~tsx
function useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(initial);
  // ...read/write localStorage...
  return [val, setVal];
}
const [name, setName] = useLocalStorage('name', 'Raj'); // name: string, setName: (v: string) => void
~~~

When to return a **tuple vs an object**: tuples are great when consumers want to **rename on destructure** (like \`useState\`); but for hooks returning **many** values, return an **object** instead (named, order-independent, self-documenting) — positional tuples get confusing past 2–3 items.

Why it matters: it's a precise React+TS detail that trips people up (default array-union inference) and shows you understand **tuples vs arrays** and \`as const\`; the senior nuance is also **tuple vs object return** design. Production angle: custom hooks like \`useToggle\`/\`useDisclosure\`/\`useLocalStorage\` return typed tuples (mirroring \`useState\`), while richer hooks (\`useQuery\`-style) return typed objects. Follow-up: "Why is the default wrong?" TS infers a union array, losing positions. "as const vs explicit type?" \`as const\` infers a readonly tuple; explicit type is clearer/mutable. "Tuple or object?" Tuple for 2 rename-able values; object for many named values.`,
        },
        {
          q: "How do you type Next.js page params and searchParams in the App Router?",
          answer: `In the App Router, a page receives **\`params\`** (dynamic route segments) and **\`searchParams\`** (the query string). In **Next.js 15/16 these are Promises** (async request APIs), so you type them as \`Promise<...>\` and **\`await\`** them in a Server Component (or unwrap with \`use()\` in a Client Component).

~~~tsx
// app/article/[slug]/page.tsx  (Server Component) — Next 15/16
interface PageProps {
  params: Promise<{ slug: string }>;                     // dynamic segment(s)
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>; // query
}

export default async function ArticlePage({ params, searchParams }: PageProps) {
  const { slug } = await params;                         // MUST await in Next 15+
  const { page } = await searchParams;
  const article = await getArticle(slug);
  return <Article data={article} />;
}

// catch-all routes:  app/shop/[...categories]/page.tsx
//   params: Promise<{ categories: string[] }>
// optional catch-all: [[...slug]] -> params: Promise<{ slug?: string[] }>
~~~

~~~
params       -> dynamic route segments:  /article/[slug]      -> { slug: string }
                catch-all [...x]          -> { x: string[] }
searchParams -> query string ?a=1&b=2&b=3 -> { a: string, b: string[] } (repeats = array)
   Next 15/16: BOTH are Promise<...>  -> await (server) or use() (client)
~~~

Details that matter:
- **\`params\` shape** depends on the route: \`[slug]\` -> \`{ slug: string }\`; \`[...all]\` (catch-all) -> \`{ all: string[] }\`; \`[[...all]]\` (optional catch-all) -> \`{ all?: string[] }\`.
- **\`searchParams\` values** are \`string | string[] | undefined\` — a repeated query key (\`?tag=a&tag=b\`) becomes a **string array**, and missing keys are \`undefined\`. Always handle those.
- **Next 15/16 async** — \`await params\`/\`await searchParams\` (and \`await cookies()\`/\`await headers()\`). In **Next 14** they were synchronous objects (no \`Promise\`/await) — so the typing depends on your version (verify against the installed version per AGENTS.md).
- **Client Components** can't be \`async\`, so unwrap the promise with React's \`use()\`:
~~~tsx
'use client';
import { use } from 'react';
export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
}
~~~
- **\`generateMetadata\`** receives the same \`{ params, searchParams }\` (also Promises in 15/16) and is typed the same way; return type \`Metadata\`/\`Promise<Metadata>\`.
- **\`generateStaticParams\`** returns the param objects to pre-render: \`(): Promise<{ slug: string }[]>\`.

Why it matters: this is everyday App Router typing and a current-knowledge signal (the **async params** change in Next 15/16 is a common gotcha); knowing the **param shapes for catch-all routes** and the **\`string | string[] | undefined\`** searchParams typing shows real Next.js+TS fluency. Production angle: typed article/category pages (\`[slug]\`, \`[...categories]\`) awaiting params/searchParams, with \`generateMetadata\` and \`generateStaticParams\` typed accordingly across the portals. Follow-up: "Next 15 vs 14?" 15/16 made params/searchParams async (Promises) — await them; 14 was sync. "Client component?" Use \`use(params)\` (can't be async). "Catch-all type?" \`string[]\` (optional catch-all -> \`string[] | undefined\`). "Repeated query param?" Becomes \`string[]\`.`,
        },
      ],
      tip: "React.FC is now discouraged — type props explicitly. Children = React.ReactNode. In Next 15/16, params/searchParams are Promises — await them.",
      rajnishAngle:
        "Typing RSC props, dynamic route params, and API response shapes across NBT/Maharashtra Times pages.",
    },
    {
      title: "tsconfig & Build Config",
      subtopics: [
        "strict mode",
        "paths alias",
        "moduleResolution",
        "isolatedModules",
        "Declaration files (.d.ts)",
      ],
      questions: [
        {
          q: "What does strict mode enable in TypeScript?",
          answer: `**\`"strict": true\`** in \`tsconfig.json\` is an umbrella flag that turns on a **family of strict type-checking options** at once. It's the recommended baseline — it catches a large class of bugs (especially null/undefined errors) at compile time. The flags it enables:

~~~jsonc
{ "compilerOptions": { "strict": true } }   // enables ALL of the below:
~~~
~~~
strictNullChecks          — null/undefined are NOT assignable to other types unless explicit
                            (the biggest win: forces handling of null/undefined)
noImplicitAny             — error on variables/params that implicitly become 'any'
strictFunctionTypes       — stricter (contravariant) function parameter checking
strictBindCallApply       — type-check bind/call/apply arguments
strictPropertyInitialization — class properties must be initialized (or marked ! / optional)
noImplicitThis            — error when 'this' has an implicit 'any' type
useUnknownInCatchVariables — catch (err) is 'unknown', not 'any' (must narrow)
alwaysStrict              — emit "use strict" and parse in strict mode
~~~

The most impactful is **\`strictNullChecks\`** — without it, \`null\`/\`undefined\` are silently assignable everywhere, so \`obj.prop.value\` compiles even when \`prop\` can be null (then crashes at runtime). With it, TS **forces you to handle** the null case:
~~~ts
// strictNullChecks ON:
function getLen(s: string | null) {
  return s.length;          // ❌ Error: 's' is possibly null
  return s?.length ?? 0;    // ✅ must handle null (optional chaining / guard)
}
~~~

And **\`noImplicitAny\`** stops untyped code from silently degrading to \`any\`:
~~~ts
function f(x) { return x * 2; }   // ❌ Error: 'x' implicitly has type 'any'
function f(x: number) { ... }     // ✅ must annotate
~~~

~~~
strict: true  =  strictNullChecks + noImplicitAny + strictFunctionTypes
                 + strictBindCallApply + strictPropertyInitialization
                 + noImplicitThis + useUnknownInCatchVariables + alwaysStrict
~~~

Why always enable it (the senior reasoning): it converts whole categories of **runtime bugs into compile-time errors** — null-pointer crashes, untyped data leaking through as \`any\`, unsafe \`this\`. The cost is more upfront annotations/handling, but the payoff is far fewer production bugs and better refactoring safety. New projects (incl. \`create-next-app\`) enable it by default; migrating a legacy codebase, you can turn it on incrementally (e.g. enable \`strictNullChecks\` first, fix, then the rest) or use \`// @ts-expect-error\` sparingly.

Complementary (not in \`strict\` but recommended) flags: **\`noUncheckedIndexedAccess\`** (array/object index access includes \`undefined\` — even safer), \`noImplicitReturns\`, \`noFallthroughCasesInSwitch\`, \`exactOptionalPropertyTypes\`.

Why it matters: \`strict\` is the single highest-value tsconfig setting; knowing **what it enables (esp. strictNullChecks/noImplicitAny) and why it prevents production bugs** is expected of anyone who configures TS seriously. Production angle: \`strict: true\` (plus \`noUncheckedIndexedAccess\`) across the codebase so null-handling and untyped data are caught at build time — fewer runtime crashes on the high-traffic site. Follow-up: "Most important flag in it?" \`strictNullChecks\` — forces null/undefined handling. "noImplicitAny?" Errors on untyped values that would become \`any\`. "Migrate a legacy app?" Enable incrementally (strictNullChecks first), fix, then the rest. "Beyond strict?" \`noUncheckedIndexedAccess\` for index safety.`,
        },
        {
          q: "What is isolatedModules and why does Next.js require it?",
          answer: `**\`isolatedModules: true\`** tells TypeScript to ensure each file can be **transpiled independently/in isolation** — i.e., compiling one file at a time **without** access to the **whole-program type information**. It enforces restrictions so that **single-file transpilers** (Babel, SWC, esbuild — which **don't type-check**, they just strip types per file) produce correct output. Next.js (and Vite, etc.) use **SWC/Babel** for fast builds, so they **require** this guarantee.

The problem it solves: \`tsc\` sees the **entire program**, so it knows whether an imported name is a **type** (erase it) or a **value** (keep it). A single-file transpiler **only sees one file** and can't tell — so certain TS constructs are ambiguous/unsafe to compile in isolation. \`isolatedModules\` makes those into **errors** so you write code that's safe for per-file transpilation.

~~~ts
// ❌ With isolatedModules, re-exporting a TYPE without 'type' is an error,
//    because a single-file transpiler can't tell if 'User' is a type or value:
export { User } from './types';          // Error if User is a type
// ✅ must mark type-only re-exports:
export type { User } from './types';
import type { Props } from './types';    // type-only import (erased cleanly)

// also flagged: const enums (can't be inlined without whole-program info),
// files with no imports/exports treated specially, certain ambient/namespace cases
~~~

~~~
tsc (whole program): knows User is a type -> erases it safely
SWC/Babel (per file): sees only this file -> can't tell type vs value
   -> isolatedModules forces 'import type'/'export type' so erasure is UNAMBIGUOUS
~~~

What \`isolatedModules\` enforces (the rules):
- **Type-only imports/exports must use \`import type\` / \`export type\`** so transpilers know to erase them (and don't accidentally emit a runtime import for a type, or drop a value import).
- **No \`const enum\`** (can't inline across files without the type-checker) — use a regular enum or a const object.
- Restrictions on re-exporting types and on certain namespace/ambient constructs.
- Every file must be a **module** (have an import/export) in some setups.

Why **Next.js requires it**: Next compiles with **SWC** (a Rust single-file transpiler) for speed — it **transpiles each file in isolation and doesn't do full type-checking during the build** (type-checking is a separate \`tsc\`/IDE step). So your code must be safe to transpile per-file, which is exactly what \`isolatedModules\` guarantees. \`create-next-app\` sets \`isolatedModules: true\` by default for this reason.

Why it matters: it explains the **per-file transpilation model** of modern fast bundlers and why **\`import type\`/\`export type\`** matter — a question that probes whether you understand how TS code actually gets built (SWC/Babel don't type-check; they erase types per file). Production angle: with Next.js + SWC, the codebase uses \`import type\`/\`export type\` consistently (enforced by \`isolatedModules\` + \`verbatimModuleSyntax\`) so fast builds are correct, with type-checking handled by \`tsc --noEmit\` in CI separately. Follow-up: "Why does SWC need it?" It transpiles file-by-file without whole-program type info; can't disambiguate type vs value imports. "Const enum?" Disallowed — can't inline without the checker. "Does SWC type-check?" No — it strips types; run \`tsc --noEmit\` for checking. "verbatimModuleSyntax?" Related modern flag that makes type-only imports explicit and removes ambiguity.`,
        },
        {
          q: "How do you write a .d.ts declaration file for a third-party library missing types?",
          answer: `When an npm package ships **no TypeScript types** (no bundled \`.d.ts\` and no \`@types/...\` package), you write your own **declaration file** (\`.d.ts\`) to **\`declare\`** the module's shape so imports type-check. Declaration files contain **only type information** (no implementation) — they describe the runtime API to the compiler.

**Quick fix — declare the module (minimal, untyped):**
~~~ts
// types/untyped-lib.d.ts  (or any *.d.ts included by tsconfig)
declare module 'some-untyped-lib';   // makes it importable, but as 'any' (no safety)
~~~

**Proper typing — describe the API:**
~~~ts
// types/some-lib.d.ts
declare module 'some-lib' {
  export interface Options { timeout?: number; retries?: number }

  export function connect(url: string, opts?: Options): Connection;

  export class Connection {
    send(data: string): Promise<void>;
    close(): void;
    readonly isOpen: boolean;
  }

  // default export:
  const lib: { version: string; connect: typeof connect };
  export default lib;
}
~~~
Now \`import { connect } from 'some-lib'\` is fully typed.

~~~
package has no types ─▶ write a .d.ts that 'declare module "pkg"' { ...the API... }
   .d.ts = types only (no code); the compiler trusts it describes the runtime shape
~~~

Key points:
- **Where to put it** — any \`*.d.ts\` file the tsconfig \`include\`s (e.g. a \`types/\` folder, or \`global.d.ts\`). Ensure \`tsconfig\` includes it (\`"include": ["**/*.ts", "types/**/*.d.ts"]\` or a \`typeRoots\`).
- **\`declare module 'name'\`** matches the import specifier; declare the **exports** (functions, classes, interfaces, default) with **signatures only** — no bodies.
- **Check DefinitelyTyped first** — many libs have community types: \`npm i -D @types/<pkg>\`. Only hand-write a \`.d.ts\` if no \`@types\` exists. (Ideally, contribute your types back to DefinitelyTyped or upstream.)
- **Augmenting existing types** (global/module augmentation) — extend built-in or third-party types via declaration merging:
~~~ts
// augment the global Window
declare global { interface Window { dataLayer: unknown[]; gtag: (...a: any[]) => void } }
export {};   // make this file a module so 'declare global' works

// augment a module (e.g. add a property to an existing typed lib)
declare module 'existing-lib' { interface Config { extra?: string } }
~~~
- **Ambient values / globals** — \`declare const __APP_VERSION__: string;\`, \`declare function gtag(...): void;\` for globals injected by the build or a script.
- **Asset/module shims** — declare non-code imports: \`declare module '*.svg' { const src: string; export default src }\`.

Why it matters: integrating **untyped third-party libraries** safely is a real-world senior task; knowing **\`declare module\`, signature-only declarations, checking @types first, and module/global augmentation** shows you can keep type safety even at the edges. Production angle: writing \`.d.ts\` declarations/augmentations for an untyped ad/analytics SDK or a legacy internal lib (and augmenting \`Window\` for \`dataLayer\`/\`gtag\`) so third-party integrations on the news site stay type-safe. Follow-up: "Check first?" \`@types/<pkg>\` on DefinitelyTyped. "Quickest unblock?" \`declare module 'x';\` (treats it as any — unsafe, temporary). "Augment Window?" \`declare global { interface Window {...} }\` + \`export {}\`. "Asset imports?" \`declare module '*.svg'\` shims.`,
        },
      ],
      tip: "Always enable strict: true. isolatedModules is required for SWC/Babel per-file transpilation — use import type/export type. Check @types before hand-writing .d.ts.",
      rajnishAngle:
        "Your Next.js tsconfig (strict, paths, isolatedModules) and .d.ts augmentations for untyped ad/analytics SDKs.",
    },
  ],
};
