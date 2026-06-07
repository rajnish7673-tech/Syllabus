import type { Week } from "../types";

export const week17: Week = {
  week: 17,
  theme: "CI/CD & DevOps for Frontend",
  color: "#FB923C",
  topics: [
    {
      title: "CI/CD Pipeline Fundamentals",
      subtopics: [
        "CI vs CD vs CD",
        "Pipeline stages",
        "GitHub Actions basics",
        "Branch strategies",
        "Trunk-based development",
      ],
      questions: [
        {
          q: "What is the difference between Continuous Delivery and Continuous Deployment?",
          answer: `Both are "CD" and both keep your code **always in a releasable state**, but they differ in the **final step**: **Continuous Delivery** automates everything up to production but requires a **manual approval/button** to actually release; **Continuous Deployment** removes that gate — every change that passes the pipeline is **automatically deployed to production**.

~~~
Continuous Integration (CI):
  commit ─▶ auto build + lint + test on every push/PR  (catch issues early, merge often)

Continuous Delivery (CD):
  CI ─▶ auto-deploy to staging + ready-to-release artifact ─▶ [MANUAL approval] ─▶ prod

Continuous Deployment (CD):
  CI ─▶ all gates pass ─▶ AUTO deploy to prod  (no human in the loop)
~~~

~~~
                    Continuous Delivery        Continuous Deployment
to production       manual approval/click      fully automatic
human gate          YES (release decision)     NO
release cadence     on-demand (one click)      every passing commit
risk control        human reviews before prod  relies on automated gates + safety nets
~~~

**Continuous Delivery** — the pipeline produces a deployable artifact and may auto-deploy to staging, but a person decides **when** to push to prod (a click). Good when you need release timing control, regulatory sign-off, coordinated launches, or business approval.

**Continuous Deployment** — the highest automation: merge to main -> pass all checks -> **live**, no human step. Requires **strong automated confidence**: comprehensive tests, **feature flags** (ship code dark, toggle features separately), **canary/progressive rollout**, automated **monitoring + rollback**, so a bad deploy is caught and reverted automatically.

The relationship: **CI -> Continuous Delivery -> Continuous Deployment** is a maturity ladder. They all share CI (auto build/test on every change). The extra leap to *Deployment* is **organizational and safety** (do you trust automation to go straight to prod?), not just tooling.

Key prerequisites for Continuous **Deployment**: feature flags (decouple deploy from release), robust test coverage + E2E, canary/blue-green rollout, fast automated rollback, and good observability/alerting — because there's no human safety check before users see it.

Why it matters: people use "CD" ambiguously; the senior answer pins the difference (**manual gate vs none**) and names what Continuous Deployment **requires** (flags, canary, monitoring, rollback). Production angle: a news platform might use **Continuous Delivery** with a manual prod-release gate for the main app (coordinate with editorial/ads), while lower-risk services use Continuous Deployment — both behind feature flags so deploy ≠ release. Follow-up: "Which do you recommend?" Depends on risk tolerance + safety infra; many start with Delivery and graduate to Deployment as test/flag/monitoring maturity grows. "How do flags help?" They let you deploy continuously but release features gradually/independently — reducing the risk of auto-deploy.`,
        },
        {
          q: "What stages would you include in a frontend CI/CD pipeline?",
          answer: `Order stages **cheapest/fastest first** so the pipeline **fails fast** — catch a lint error in seconds rather than after a 5-minute build. A solid frontend pipeline:

~~~
1. Install        — npm ci (exact lockfile install) + cache node_modules / .next/cache
2. Lint           — ESLint + Prettier (format), fast, fails on style/obvious errors
3. Type-check     — tsc --noEmit (catch type errors before build)
4. Unit/Integration tests — Jest/Vitest + React Testing Library
5. Build          — next build (fails on build errors; produces artifact)
6. Bundle/budget  — size-limit / Lighthouse CI budgets (fail on perf regressions)
7. E2E tests      — Playwright/Cypress against the built app / preview
8. Security       — npm audit / Snyk (dependency + SAST)
9. Deploy         — to staging/preview (per PR) then prod (on main, gated or auto)
10. Post-deploy   — smoke tests, synthetic checks, Sentry release tagging, monitoring
~~~

~~~
fail-fast ordering: lint(10s) -> types(30s) -> unit(1m) -> build(3m) -> e2e(5m) -> deploy
   cheap checks gate expensive ones -> faster feedback, less wasted CI time
~~~

The reasoning per choice:
- **Cheap-first ordering** — lint/type-check/unit are fast; running them before the costly build/E2E gives quick feedback and saves CI minutes (don't run a 5-min E2E if lint fails).
- **\`npm ci\` not \`npm install\`** — installs the exact locked versions, reproducible and faster; **cache** node_modules and **\`.next/cache\`** to speed builds.
- **Type-check separately** (\`tsc --noEmit\`) even though build does some checking — explicit and fast.
- **Bundle-size budgets** (size-limit) + **Lighthouse CI** — gate **performance regressions** (a 50KB dep creep fails the PR). Deterministic budgets are great PR gates.
- **E2E on a production-like build / PR preview** — not dev mode (unrepresentative).
- **Security scans** in the pipeline (audit/Snyk) — shift security left.
- **Per-PR preview deploys** (Vercel/Netlify-style) — reviewers test the real change; E2E/Lighthouse run against it.
- **Post-deploy**: smoke tests + **Sentry release** tagging (associate errors with the deploy) + monitoring so regressions are caught fast.

**Branch protection**: PRs must pass required checks before merge; deploy to prod only from \`main\` (gated or auto). Add **path filtering** so unrelated changes don't run the whole suite.

Why it matters: a well-structured pipeline is how a multi-contributor frontend stays shippable and regression-free; the senior signal is **fail-fast ordering, performance/security gates, preview deploys, and post-deploy verification** — not just "build and deploy." Production angle: the news app's pipeline — lint/type/test -> build -> bundle budget + Lighthouse CI on a preview URL -> E2E smoke of critical flows (article load, share, subscribe) -> deploy to staging on PR, prod on main with Sentry release tagging. Follow-up: "Why fail-fast order?" Fast feedback + cheaper CI. "How prevent perf regressions?" Bundle budgets + Lighthouse CI as required checks. "Speed up the pipeline?" Caching (node_modules/.next), parallel jobs, path filtering, affected-only testing in a monorepo.`,
        },
        {
          q: "What is trunk-based development and how does it differ from GitFlow?",
          answer: `**Trunk-based development (TBD)** is a branching strategy where developers integrate **small, frequent changes into a single shared branch ("trunk"/main)** — at least daily — using **short-lived** feature branches (hours to a day or two) that merge back fast. **GitFlow** is a heavier model with **multiple long-lived branches** (\`main\`, \`develop\`, \`feature/*\`, \`release/*\`, \`hotfix/*\`) and a structured merge ceremony.

~~~
Trunk-Based Development:
  main ●──●──●──●──●──●   (always releasable)
        \\●/  \\●/  \\●/      short-lived branches merge back in <1-2 days
  + feature flags to hide incomplete work

GitFlow:
  main      ●─────────────●────────●     (releases/tags)
  develop   ●──●──●──●──●──●──●──●─       (integration)
  feature       \\●──●──●/                (long-lived feature branches)
  release                  \\●──●/        (release stabilization)
  hotfix                         \\●/
~~~

~~~
                  Trunk-Based                    GitFlow
branches          1 trunk + tiny short-lived     many long-lived (main/develop/release/...)
integration       continuous (daily+)            batched at merge points
merge conflicts   rare, small                    frequent, large (long-lived branches drift)
release           continuous / on-demand         scheduled release branches
incomplete work   hidden behind FEATURE FLAGS    isolated on feature branches
CI/CD fit         excellent (built for it)       slower, more coordination
complexity        low                            high (ceremony)
~~~

**Trunk-based** keeps everyone on one integration line, so changes merge **before they diverge** — minimizing **merge hell** and integration risk. Incomplete features are merged but **hidden behind feature flags** (so trunk is always releasable). It's the model that **best enables CI/CD** (small, frequent, tested merges -> continuous delivery/deployment) and is favored by high-performing teams (DORA research links it to better delivery performance).

**GitFlow** suits **versioned/release-cadence** products (desktop apps, libraries with explicit versions, multiple supported releases) where you need formal release branches and hotfix isolation. But for **web apps deploying continuously**, its long-lived \`develop\`/\`feature\`/\`release\` branches cause **drift, big merges, and slower delivery** — overkill.

The trade-offs / requirements: TBD needs **strong CI, good test coverage, feature flags, and small PRs/code review discipline** — because you're integrating to the shared branch constantly, the safety net is automation, not branch isolation. GitFlow trades delivery speed for explicit release control.

~~~
web app deploying continuously  -> Trunk-Based (+ feature flags + strong CI)
versioned/released software     -> GitFlow (formal releases, multiple versions)
~~~

Why it matters: branching strategy directly affects delivery speed and CI/CD; the senior answer is "**trunk-based + feature flags for continuously-deployed web apps** (fewer conflicts, faster delivery), GitFlow for versioned release products," with the caveat that TBD requires CI/test/flag maturity. Production angle: a continuously-deployed news frontend fits **trunk-based** — short-lived branches, small PRs, feature flags to ship new article layouts dark and roll out gradually, with the pipeline gating every merge to main. Follow-up: "Doesn't merging incomplete work break main?" That's what feature flags are for — code is merged but the feature is off until ready. "GitHub Flow?" A lightweight trunk-based variant (main + short feature branches + PRs) common for web apps. "Why do long-lived branches hurt?" They drift from main, producing large, conflict-prone, risky merges and delaying integration feedback.`,
        },
      ],
      tip: "Good pipeline order: lint → type-check → unit test → build → E2E → deploy. Fail fast on the cheap checks first.",
      rajnishAngle:
        "Times Internet CI/CD for Next.js deployments — what your pipeline looks like, what gates exist before prod.",
    },
    {
      title: "GitHub Actions for Frontend",
      subtopics: [
        "Workflow syntax",
        "Actions marketplace",
        "Caching node_modules",
        "Matrix builds",
        "Environment secrets",
        "PR checks",
      ],
      questions: [
        {
          q: "How do you cache node_modules in a GitHub Actions workflow to speed up builds?",
          answer: `Caching avoids re-downloading/re-installing dependencies on every run, cutting CI time significantly. The cleanest way is **\`actions/setup-node\` with built-in npm caching**, keyed on the lockfile; for finer control use **\`actions/cache\`** directly. Crucially, **cache the dependency download cache and the Next.js build cache too.**

**Simplest — \`setup-node\` built-in cache:**
~~~yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'                 # caches the npm download cache, keyed on package-lock.json
- run: npm ci                    # fast install from cache
~~~

**Manual control — \`actions/cache\` (cache node_modules and/or .next/cache):**
~~~yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.npm                     # npm's download cache
      .next/cache                # Next.js build cache — huge rebuild speedup
    key: \${{ runner.os }}-node-\${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      \${{ runner.os }}-node-     # fallback to a partial match
- run: npm ci
~~~

~~~
cache key = OS + hash(package-lock.json)
  lockfile unchanged -> exact cache HIT -> skip re-download, fast npm ci
  lockfile changed   -> miss -> restore-keys gives a near-match -> partial speedup -> rebuild cache
~~~

Key principles (the senior details):
1. **Key on the lockfile hash** (\`hashFiles('**/package-lock.json')\`) — the cache invalidates only when dependencies actually change, so unchanged deps reuse the cache. \`restore-keys\` provides a fallback partial cache when the exact key misses (so you still get *some* benefit after a dep change).
2. **Cache \`~/.npm\` (the download cache), not necessarily \`node_modules\`** — caching the npm cache + running \`npm ci\` is robust and avoids stale/partial \`node_modules\` issues; some teams cache \`node_modules\` directly for max speed (then \`npm ci\` is near-instant) — both are valid, with \`~/.npm\` being the safer default.
3. **Cache \`.next/cache\`** — Next.js's build cache dramatically reduces **rebuild** time (incremental compilation). This is a commonly-missed, high-impact cache for Next.js CI.
4. **\`npm ci\` not \`npm install\`** — deterministic, lockfile-exact, designed for CI, and faster.

~~~
cache: ~/.npm  (install speed)  +  .next/cache  (build speed)
keyed on lockfile hash -> invalidates only when deps change
~~~

Why it matters: dependency install + build are the slowest CI steps; correct caching (lockfile-keyed, including \`.next/cache\`) can cut pipeline time substantially — a frequent practical optimization. Knowing to also cache the **Next.js build cache** signals real experience. Production angle: the news app's GitHub Actions caches \`~/.npm\` + \`.next/cache\` keyed on the lockfile, with \`setup-node\`'s npm cache, so PR builds are fast despite many dependencies. Follow-up: "Cache node_modules or ~/.npm?" \`~/.npm\` + \`npm ci\` is safer (avoids partial/stale node_modules); caching node_modules directly is faster but riskier. "Why hash the lockfile?" Invalidate the cache exactly when deps change, not on every code change. "Monorepo?" Key on all lockfiles / use per-workspace caches and the package manager's workspace caching.`,
        },
        {
          q: "How do you run tests only when relevant files change (path filtering)?",
          answer: `Use **path filters** so a workflow (or job) only runs when files in specific paths change — avoiding running the whole test suite for unrelated edits (e.g. don't run frontend tests when only docs or backend changed). Two main mechanisms: workflow-level **\`on.paths\`** triggers and job-level **changed-files detection**.

**1. Workflow-level \`paths\` / \`paths-ignore\`** (skips the whole workflow):
~~~yaml
on:
  pull_request:
    paths:
      - 'apps/web/**'           # run only if web app files changed
      - 'packages/ui/**'
      - '!**/*.md'              # ignore docs-only changes
~~~

**2. Detect changed files in a job and conditionally run steps** (more flexible, e.g. in a monorepo):
~~~yaml
jobs:
  test:
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }          # need history to diff
      - id: changes
        uses: dorny/paths-filter@v3
        with:
          filters: |
            web: 'apps/web/**'
            api: 'apps/api/**'
      - if: steps.changes.outputs.web == 'true'
        run: npm run test --workspace=web   # only test web if it changed
~~~

~~~
PR touches only apps/api + README ─▶ web filter false ─▶ skip web tests
PR touches apps/web ─▶ web filter true ─▶ run web tests
   -> only the affected parts run -> faster CI, less waste
~~~

**Monorepo-aware tooling (the scalable answer):** tools like **Turborepo** (\`turbo run test --filter=...[origin/main]\`) or **Nx affected** compute which projects are **affected** by a change (using the dependency graph) and run tests/builds **only for those** — far smarter than path globs because they account for **transitive dependencies** (changing \`packages/ui\` reruns everything that imports it):
~~~yaml
- run: npx turbo run lint test build --filter='...[origin/main]'  # only affected projects
~~~

Caveats (the senior nuance):
- **\`paths\` filters + required status checks** interact tricky: if a workflow is **skipped** by a path filter but is a **required** check, the PR can be **blocked** waiting for a check that never runs. Use a "dummy success" job or branch-protection config that handles skipped required checks, or filter at the **job/step** level (workflow always runs, steps conditionally execute) so the required check still reports.
- **Affected detection** needs git history (\`fetch-depth: 0\`) and a correct base ref.

~~~
simple repo:   on.paths / paths-ignore  (skip workflow for irrelevant changes)
monorepo:      Turborepo/Nx 'affected'   (dependency-graph-aware, runs only impacted projects)
gotcha:        skipped required checks can block PRs -> filter at step level or add a pass job
~~~

Why it matters: in large repos/monorepos, running everything on every PR is slow and wasteful; path/affected filtering is the standard way to keep CI fast — and knowing the **required-check skip gotcha** and **dependency-graph-aware tools** shows real CI experience. Production angle: a monorepo of Times Internet properties/shared packages uses Turborepo \`affected\` so a change to one portal or a shared component only tests/builds the impacted projects (and everything depending on the shared package), keeping PR CI fast. Follow-up: "Why not just path globs in a monorepo?" Globs miss transitive deps — changing a shared package must retest consumers; \`affected\`/Turbo handles that via the graph. "Required check skipped by path filter?" Filter at step level or add a guaranteed-pass job so branch protection isn't stuck.`,
        },
        {
          q: "How do you deploy only when tests pass and the branch is main?",
          answer: `Gate the deploy job with **\`needs:\`** (depend on the test/build jobs so it only runs if they succeed) and an **\`if:\`** condition checking the **branch/ref** (only \`main\`). Combine with **branch protection** (required checks before merge) and **GitHub Environments** (protected secrets + optional approval) for a safe prod deploy.

~~~yaml
name: CI/CD
on:
  push: { branches: [main] }     # deploy path triggers on main
  pull_request:                  # PRs run tests but not deploy

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run lint && npm run type-check && npm test
      - run: npm run build

  deploy:
    needs: test                  # ONLY runs if 'test' job succeeded
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'  # ONLY on main
    runs-on: ubuntu-latest
    environment: production      # protected env: scoped secrets + optional manual approval
    steps:
      - uses: actions/checkout@v4
      - run: ./deploy.sh
        env:
          DEPLOY_TOKEN: \${{ secrets.DEPLOY_TOKEN }}   # secret only available in this env
~~~

~~~
PR ─▶ test job runs (lint/type/test/build) ─▶ checks reported, NO deploy
merge to main ─▶ push event ─▶ test passes ─▶ deploy job (needs:test + if main) ─▶ prod
~~~

The mechanisms doing the gating:
1. **\`needs: test\`** — the deploy job **won't start** unless the \`test\` job **succeeds**. If tests fail, deploy is skipped. (Jobs in \`needs\` must all pass.)
2. **\`if: github.ref == 'refs/heads/main'\`** — restricts deploy to the **main branch** (and \`github.event_name == 'push'\` so it's a merge, not a PR). PRs run tests but never deploy.
3. **\`environment: production\`** — a **GitHub Environment** scopes the deploy secrets to this job and can require **manual approval** (reviewers) and **wait timers** before deploying — turning it into Continuous **Delivery** (gated) vs **Deployment** (auto). Secrets like \`DEPLOY_TOKEN\` live in the environment, not exposed to PRs from forks.
4. **Branch protection rules** (repo settings) — require the \`test\` check to pass and the branch to be up to date **before merge** is even allowed, so broken code can't reach main in the first place. Defense-in-depth with the workflow \`if\`.

~~~
layers of safety:
  branch protection: can't MERGE to main unless checks pass
  needs:test:        deploy job won't RUN unless tests pass
  if: main:          deploy only on the main branch (not PRs/other branches)
  environment:       protected secrets + optional manual approval before prod
~~~

Why it matters: "deploy only when green and only from main" is the core CI/CD safety guarantee; knowing the **\`needs\` + \`if\` + environment + branch protection** combination (and that environments give the manual-approval gate distinguishing Delivery from Deployment) shows you can build a safe pipeline. Production angle: the news app deploys to prod only from main after lint/type/test/build pass, using a protected \`production\` GitHub Environment with a manual approval gate (Continuous Delivery) and scoped deploy secrets; PRs get preview deploys but never touch prod. Follow-up: "PRs from forks and secrets?" Environment/secret access is restricted for fork PRs — don't expose deploy secrets to untrusted PRs. "Auto vs manual prod?" Add an environment approval (Delivery) or remove it (Deployment) — same workflow. "Rollback?" Keep previous build/artifact and a one-click revert (or redeploy the prior tag) + monitoring to trigger it.`,
        },
      ],
      tip: "Cache the .next/cache directory in addition to node_modules — Next.js build cache dramatically reduces rebuild time.",
      rajnishAngle:
        "GitHub Actions workflow for NBT/Maharashtra Times — lint, test, build, and deploy to staging on PR.",
    },
    {
      title: "Feature Flags & Progressive Delivery",
      subtopics: [
        "Feature flags pattern",
        "LaunchDarkly / Unleash",
        "Canary deployments",
        "A/B testing via flags",
        "Kill switches",
      ],
      questions: [
        {
          q: "What is a feature flag and what problems does it solve?",
          answer: `A **feature flag** (feature toggle) is a **conditional in your code that turns a feature on/off at runtime without a code deploy** — controlled by configuration (often a remote service). Its core power: it **decouples deployment from release**. You can deploy code to production with a feature **off** ("dark"), then turn it on for chosen users **whenever and for whomever** you want — independent of the deploy.

~~~js
if (flags.isEnabled('new-article-layout', { userId })) {
  return <NewArticleLayout />;   // shipped but OFF until the flag is turned on
} else {
  return <OldArticleLayout />;
}
~~~

~~~
without flags:  deploy == release  (code goes live the moment it deploys)
with flags:     deploy (code present, OFF) ──then──▶ release (flip flag, gradually)
                deploy and release become INDEPENDENT decisions
~~~

**Problems feature flags solve:**
1. **Decouple deploy from release** — merge/deploy incomplete or risky features safely (off), enabling **trunk-based development** + continuous deployment without long-lived branches.
2. **Progressive/gradual rollout** — turn a feature on for **1% -> 10% -> 50% -> 100%** of users, watching metrics/errors at each step; limit blast radius if something breaks.
3. **Kill switch** — instantly **disable** a misbehaving feature (or a problematic third-party integration) **without a rollback/redeploy** — flip the flag off in seconds.
4. **A/B testing & experimentation** — serve variant A vs B via a flag and measure (covered separately).
5. **Targeted rollouts** — enable for internal/beta users, specific regions, subscriber tiers, or a cohort.
6. **Coordinate launches** — deploy ahead of time, flip the flag at the exact launch moment (marketing/editorial coordination).

~~~
release ramp:  internal users -> 1% -> 10% -> 50% -> 100%
   (monitor CWV/errors/conversion at each step; kill-switch off if metrics regress)
~~~

**Costs/trade-offs (the senior nuance):** flags add **complexity** — code paths multiply (both branches must work/be tested), flags must be **cleaned up** (stale flags = tech debt and confusion), there's a **runtime evaluation cost** (and a dependency on the flag service — handle its outage with safe defaults), and config management/governance is needed. Treat flags as **temporary** (release flags) vs **long-lived** (ops/kill switches, entitlements) and remove temporary ones after rollout.

Tools: **LaunchDarkly, Unleash, Split, Statsig, ConfigCat** (managed evaluation, targeting, analytics), or a simple in-house config for basics.

Why it matters: feature flags are foundational to modern delivery (trunk-based dev, continuous deployment, safe rollouts, kill switches); the senior answer leads with **"decouple deploy from release"** and covers **gradual rollout + kill switch + targeting**, plus the **debt/complexity** caveat. Production angle: rolling out a new article-page layout on the news site to **1% then ramping**, watching CWV/engagement, with a kill switch to instantly revert if INP/CLS or revenue regresses — all without redeploying. Follow-up: "Deploy vs release?" Deploy = code goes to prod (off); release = flip the flag to expose the feature. "Downside?" Code-path/test complexity + stale-flag debt + flag-service dependency (use safe defaults on outage). "Flag types?" Release (temporary), experiment (A/B), ops/kill-switch (long-lived), permission/entitlement (long-lived).`,
        },
        {
          q: "How do you implement a feature flag in a Next.js app?",
          answer: `Decide **where** the flag is evaluated — **server (RSC/middleware)** for SEO-safe, flicker-free flags, or **client** for interactive toggles — then read the flag from a config source (env var for simple cases, a flag service like LaunchDarkly/Statsig/Unleash for targeting/rollout). Next.js's RSC + middleware make **server-side evaluation** clean and CWV-friendly.

**1. Server Component (RSC) — evaluate on the server, ship only the chosen variant (no flicker, SEO-correct):**
~~~tsx
// app/article/[slug]/page.tsx (Server Component)
import { getFlag } from '@/lib/flags';

export default async function Page({ params }) {
  const { slug } = await params;
  const newLayout = await getFlag('new-article-layout', { /* user/context */ });
  return newLayout ? <NewArticle slug={slug} /> : <OldArticle slug={slug} />;
}
~~~

**2. Middleware (edge) — assign/route based on a flag, set a cookie for stickiness (great for rollout % / A/B):**
~~~ts
// middleware.ts
export function middleware(req) {
  let bucket = req.cookies.get('ff_new_layout')?.value;
  if (!bucket) bucket = Math.random() < 0.1 ? 'on' : 'off';   // 10% rollout
  const res = NextResponse.next();
  res.cookies.set('ff_new_layout', bucket);  // sticky per user
  res.headers.set('x-ff-new-layout', bucket);
  return res;
}
~~~

**3. Client Component — for interactive/runtime toggles (uses a provider/SDK):**
~~~tsx
'use client';
import { useFlags } from '@/lib/flags-client';   // wraps LaunchDarkly/Statsig SDK
export function Feature() {
  const { newLayout } = useFlags();
  return newLayout ? <New /> : <Old />;
}
~~~

~~~
where to evaluate?
  server (RSC/middleware): no flicker, SEO-correct, secret flags safe -> PREFER for layout/content
  client (SDK):            runtime/interactive toggles, per-session changes
~~~

Key considerations (the senior details):
- **Prefer server-side evaluation** for content/layout flags so the **correct variant is in the initial HTML** — no client-side flicker (FOOC), no **CLS**, and SEO sees the real content. Client-only flag flips that hide/swap content cause flicker and layout shift (the A/B anti-pattern).
- **Stickiness** — bucket users consistently (cookie/user-id hash) so they don't flip between variants on each request.
- **Caching interaction** — if a flagged page is cached (ISR/CDN), you must **vary the cache by the flag/bucket** (cache key / segment) or evaluate at the edge per request; otherwise users get a cached wrong variant. Keep bucket cardinality low (a few groups), not per-user.
- **Safe defaults** — if the flag service is unreachable, default to a known-good state (usually "off").
- **Flag service vs env var** — env vars are fine for simple build-time/global flags; use a **service** (LaunchDarkly/Statsig/Unleash) for runtime targeting, % rollouts, and per-user rules without redeploys. Next.js also has a **\`flags\` SDK / Flags pattern** for typed flag declarations.

~~~
content/layout flag ─▶ evaluate in RSC/middleware ─▶ ship correct variant (no flicker, SEO ok)
   + sticky cookie + cache keyed on bucket + safe default on service outage
~~~

Why it matters: in Next.js the *where* (server vs client) of flag evaluation has real consequences for **flicker, CLS, SEO, and caching** — the senior answer prefers **server/edge evaluation** for content flags and explicitly handles **cache fragmentation and stickiness**, not just "wrap it in an if". Production angle: a new article layout flag evaluated in middleware/RSC on the news site so the right layout is server-rendered (no flicker, SEO-safe), with a sticky cookie for consistent UX, the CDN cache keyed on the bucket (few groups), and a safe "off" default — ramped 1%->100% via the flag service. Follow-up: "Client flag flicker?" Client-only swap shows the old variant then flips -> FOOC/CLS; evaluate server-side instead. "Caching + flags?" Vary cache by bucket (low cardinality) or evaluate per-request at the edge. "Env var vs service?" Env for simple/global; service for runtime targeting and % rollouts without redeploy.`,
        },
        {
          q: "What is a canary deployment and how does it reduce release risk?",
          answer: `A **canary deployment** releases a new version to a **small subset of users/traffic first** (the "canary"), monitors it under **real production load**, and only **progressively rolls it out to everyone** if it's healthy — rolling **back** immediately if metrics degrade. The name comes from "canary in a coal mine": the small group detects danger before it reaches everyone.

~~~
canary rollout:
  v2 to 1% of traffic ─monitor─▶ healthy? ─▶ 10% ─▶ 50% ─▶ 100%
                                  └─ unhealthy (errors/latency/CWV up)? ─▶ ROLL BACK to v1
  v1 (stable) serves the other 99% throughout
~~~

**How it reduces release risk:**
1. **Limits blast radius** — a bug, performance regression, or outage in v2 affects only **1%** of users, not 100%. You catch problems with minimal damage.
2. **Real-world validation** — tests the new version against **actual production traffic, data, and load** (which staging/lab can't fully replicate) before full exposure.
3. **Metric-driven gating** — you advance only if **health signals** stay good: error rate, latency/TTFB, INP/LCP/CLS, business metrics (conversion, revenue, ad fill). Automated canary analysis can **promote or roll back** based on comparing canary vs baseline.
4. **Fast, low-impact rollback** — if the canary is bad, you shift traffic back to the stable version (v1 is still running) — quick and affecting few users, vs a full-fleet rollback.

~~~
                       Canary                         Blue-Green
strategy               gradual % shift to v2           full switch between two identical envs
traffic                1% -> ... -> 100%               100% flip (blue->green), instant rollback
risk exposure          tiny, increasing                all-at-once at the flip
infra                  run v1+v2 simultaneously         two full environments
~~~

**Related strategies to contrast:**
- **Blue-Green** — two complete environments; deploy to the idle one (green), then **switch all traffic** at once (instant rollback by switching back). Less granular exposure than canary but very fast rollback.
- **Rolling** — replace instances gradually (less control over which users hit new).
- **Feature flags** — a *finer*, app-level form: ship code to 100% but **enable the feature** for a % of users (decouples release from deploy; canary is at the *deployment/infra* level). Often combined.

**Requirements (the senior nuance):** canary needs **good observability/monitoring** (to detect regressions on the canary), **traffic-splitting** infra (load balancer/service mesh/Ingress, e.g. Nginx weights, Istio, or platform support), **automated analysis + rollback**, and **backward compatibility** (v1 and v2 run simultaneously, so DB/API changes must be compatible during the overlap).

~~~
risk reduction =  small exposure  +  real-traffic validation  +  metric-gated promotion
                  +  fast rollback (stable version still serving)
~~~

Why it matters: canary is a core progressive-delivery technique; the senior answer explains **limited blast radius + real-traffic + metric-gated promotion + fast rollback**, contrasts it with **blue-green and feature flags**, and notes the **observability + compatibility** prerequisites. Production angle: deploying a new version of the news app as a canary to 1% (e.g. via Nginx upstream weights / platform traffic-split), watching error rate + INP/LCP + ad revenue, auto-rolling back if they regress before ramping to 100% — combined with feature flags for finer per-feature control. Follow-up: "Canary vs blue-green?" Canary = gradual % exposure with real-traffic validation; blue-green = instant full switch with instant rollback — different risk/rollback profiles. "Canary vs feature flag?" Canary at the deploy/infra level (which version); flags at the app level (which feature) — complementary. "What's required?" Traffic splitting + strong monitoring + automated rollback + forward/backward compatibility during overlap.`,
        },
      ],
      tip: "Feature flags decouple deploy from release. Ship code dark, then turn it on for 1% → 10% → 100% of users.",
      rajnishAngle:
        "Rolling out new article page layouts on NBT to a subset of users before full release.",
    },
    {
      title: "Docker & Containerization Basics",
      subtopics: [
        "Dockerfile for Next.js",
        "Multi-stage builds",
        ".dockerignore",
        "Environment variables",
        "Docker vs bare metal for Node",
      ],
      questions: [
        {
          q: "Write a production Dockerfile for a Next.js app.",
          answer: `A production Next.js Dockerfile should use a **multi-stage build** (separate build and runtime stages so the final image is small), Next.js's **\`output: 'standalone'\`** (which traces only the needed dependencies), a **non-root user**, and a minimal base image (\`node:alpine\` or distroless).

~~~dockerfile
# ---- Stage 1: deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci                                  # install ALL deps (build needs devDeps)

# ---- Stage 2: build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build                           # next build (output: 'standalone')

# ---- Stage 3: runtime (small, no source, no devDeps) ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S nextjs  # non-root
# copy only what's needed from the standalone trace:
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]                    # standalone produces server.js
~~~

~~~next.config.js
// enable the standalone output trace (minimal runtime files + node_modules)
module.exports = { output: 'standalone' };
~~~

What each part does and why:
- **Multi-stage** — \`deps\`/\`builder\` stages have the full toolchain + devDependencies + source; the final \`runner\` stage copies **only the build output**, so the image is small and contains **no source code or devDeps** (smaller, faster pulls, less attack surface). See [[what-is-a-multi-stage-docker-build]].
- **\`output: 'standalone'\`** — Next traces the **exact** files + minimal \`node_modules\` the server needs into \`.next/standalone\`, so you don't ship the whole \`node_modules\`. Big size reduction.
- **\`npm ci\`** — deterministic, lockfile-exact install.
- **Layer ordering for cache** — copy \`package*.json\` and install **before** copying source, so dependency layers are cached and only re-run when the lockfile changes (faster rebuilds).
- **Non-root user** (\`nextjs\`) — security best practice (don't run as root in the container).
- **Alpine base** — small; (distroless is even smaller/more secure for some). Pin the Node version.
- **\`.dockerignore\`** — exclude \`node_modules\`, \`.next\`, \`.git\`, etc. so they're not sent to the build context (faster builds, smaller context).

~~~
result: small final image (no source, no devDeps, traced node_modules), non-root, cache-friendly
~~~

**Env vars note:** \`NEXT_PUBLIC_*\` vars are **inlined at build time** (baked into the bundle), so they must be present during \`next build\`; server-only env vars are read at **runtime** (pass via \`docker run -e\` / orchestrator). (Expanded in the env-vars question.)

Why it matters: a correct production Dockerfile (multi-stage + standalone + non-root + cache-friendly layering) is a concrete DevOps competency; many candidates ship bloated, insecure single-stage images. Production angle: the news app's Next.js container uses this multi-stage + standalone pattern for small images on the Kubernetes cluster, with non-root user and lockfile-cached layers for fast CI image builds. Follow-up: "Why standalone?" Ships only traced deps -> much smaller image than copying full node_modules. "Why non-root?" Limits damage if the container is compromised. "Layer cache?" Copy lockfile + install before source so dep layers aren't invalidated by code changes.`,
        },
        {
          q: "What is a multi-stage Docker build and why does it reduce image size?",
          answer: `A **multi-stage build** uses **multiple \`FROM\` statements** in one Dockerfile, each starting a new **stage**. Earlier stages do the heavy work (install toolchain, devDependencies, compile/build); the **final stage** starts from a clean, minimal base and **copies only the build artifacts** it needs from earlier stages — leaving behind all the build-time bloat. The result image contains just the runtime essentials, dramatically smaller.

~~~dockerfile
FROM node:20 AS builder        # STAGE 1: full toolchain + devDeps + source
WORKDIR /app
COPY package*.json ./
RUN npm ci                     # installs ALL deps (incl. devDependencies)
COPY . .
RUN npm run build              # produces .next / dist

FROM node:20-alpine AS runner  # STAGE 2: clean minimal base
WORKDIR /app
COPY --from=builder /app/.next/standalone ./   # copy ONLY the built output
COPY --from=builder /app/.next/static ./.next/static
CMD ["node", "server.js"]      # final image has NO source, NO devDeps, NO build tools
~~~

~~~
single-stage image:  base + source + devDeps + build tools + artifacts   (BIG, ~1GB+)
multi-stage final:   minimal base + artifacts only                        (SMALL, ~100-200MB)
   build junk stays in the discarded builder stage
~~~

**Why it reduces size (the mechanisms):**
1. **Discards build-time dependencies** — devDependencies (TypeScript, ESLint, test libs, bundler), compilers, and build caches exist only in the builder stage and are **not** in the final image. You ship runtime deps only.
2. **No source code** — only the **compiled/built output** is copied forward, not the raw source.
3. **Clean minimal base** — the final stage can use a tiny base (\`alpine\`, distroless) regardless of what the build needed.
4. **Only \`COPY --from\` what you need** — you explicitly copy the few artifacts, so nothing extraneous leaks in.

**Why smaller images matter (beyond aesthetics):**
- **Faster deploys/scaling** — smaller images pull faster to nodes (quicker autoscaling, rollouts, cold starts).
- **Less storage/bandwidth** in the registry and on nodes.
- **Smaller attack surface** — fewer packages/tools in the image = fewer potential vulnerabilities (no build tools, no devDeps) — a **security** benefit.
- **Lower cost** in registry storage and transfer.

~~~
build stage (throwaway): devDeps + toolchain + source ─compile─▶ artifacts
final stage (shipped):   minimal base + COPY --from=build artifacts only
   => small, secure, fast-to-pull image
~~~

Why it matters: multi-stage builds are the standard way to produce lean, secure production images; the senior answer explains it **leaves build-time bloat (devDeps, tools, source) behind** and ties small images to **deploy speed, cost, and security** — not just size. Production angle: the news app's Next.js images use multi-stage (builder + standalone runner) so the deployed image is a fraction of the build size — fast to pull during k8s autoscaling/rollouts and with minimal attack surface (no build tooling in prod). Follow-up: "vs single-stage?" Single-stage ships everything used to build (huge, more vulnerabilities); multi-stage ships only runtime artifacts. "Distroless?" Even smaller/more secure final base (no shell/package manager) — good for production. "Pairs with Next standalone?" Yes — standalone traces minimal deps, multi-stage copies just those + static into a clean runner.`,
        },
        {
          q: "How do you pass environment variables to a Next.js Docker container?",
          answer: `Next.js has **two kinds** of env vars with **different timing**, and this distinction is the crux: **\`NEXT_PUBLIC_*\`** vars are **inlined into the client bundle at BUILD time** (baked in, exposed to the browser), while **server-only** vars are read at **RUNTIME** by Node. How you pass them to a container differs accordingly.

~~~
NEXT_PUBLIC_API_URL   -> embedded in JS bundle at 'next build'  (browser-visible, build-time)
DATABASE_URL / API_SECRET -> read by server code at runtime via process.env  (server-only)
~~~

**1. Server-only vars (runtime) — pass at \`docker run\` / orchestrator:**
~~~bash
docker run -e DATABASE_URL=$DATABASE_URL -e API_SECRET=$API_SECRET myapp
# or --env-file .env.production
~~~
~~~yaml
# Kubernetes — from a Secret/ConfigMap at runtime
env:
  - name: DATABASE_URL
    valueFrom: { secretKeyRef: { name: app-secrets, key: database-url } }
~~~
These are available to server code (\`process.env.DATABASE_URL\`) **at runtime**, so the **same image** can be deployed to staging/prod with **different values** — no rebuild. Keep secrets in the orchestrator's secret store, **not** in the image.

**2. \`NEXT_PUBLIC_*\` vars (build-time) — must be present during \`next build\`:**
~~~dockerfile
# pass as build args so they're available at build:
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build      # value gets INLINED into the client bundle here
~~~
~~~bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com -t myapp .
~~~
Because they're **baked in at build**, setting a \`NEXT_PUBLIC_*\` var only at \`docker run\` has **no effect on already-built client code** — a classic gotcha. If these differ per environment, you must **build a separate image per environment** (or use runtime public-config injection patterns).

~~~
the key gotcha:
  NEXT_PUBLIC_* set at RUN time -> IGNORED by the client bundle (already baked at BUILD)
  -> build-time arg, or build one image per env, or use a runtime-config workaround
~~~

**The "build once, deploy many" tension (senior nuance):** ideally you build **one** image and configure it per environment at runtime — which works for **server-only** vars but **not** for \`NEXT_PUBLIC_*\` (baked at build). Workarounds: keep public config server-side and expose it via an API/RSC at runtime; or inject a runtime config script (e.g. a \`/config.js\` or \`window.__ENV__\` populated by the server) so the browser reads env at runtime instead of build time; or accept per-env builds for the public values. For **secrets**, never use \`NEXT_PUBLIC_\` (it ships to the browser) and never bake them into the image — pass at runtime from a secret manager.

~~~
server vars:        runtime (-e / Secret) -> same image, many envs ✓
NEXT_PUBLIC_ vars:  build-time (ARG) -> baked in; per-env build OR runtime-config workaround
secrets:            runtime only, from secret store; NEVER NEXT_PUBLIC_, NEVER in the image
~~~

Why it matters: the **build-time vs runtime** env distinction in Next.js is a common source of bugs ("my NEXT_PUBLIC var isn't updating") and a security pitfall (baking secrets into images/bundles); the senior answer nails the timing, the **build-once-deploy-many** tension, and secret handling. Production angle: the news app passes server-only config/secrets at runtime via k8s Secrets (one image across staging/prod), while \`NEXT_PUBLIC_*\` public values are handled via build args (or a runtime-config injection) — secrets never in \`NEXT_PUBLIC_\` or the image. Follow-up: "Why doesn't my NEXT_PUBLIC var change at runtime?" It's inlined at build — rebuild with the new value or use a runtime-config pattern. "Secrets in NEXT_PUBLIC?" Never — it's shipped to the browser. "Build once, deploy many?" Works for server vars; public vars need a runtime-config workaround or per-env builds.`,
        },
      ],
      tip: "Multi-stage: stage 1 = build (includes devDeps + source), stage 2 = runtime (only .next + node_modules/prod). Much smaller image.",
      rajnishAngle:
        "Times Internet K8s infrastructure — Next.js containers, how you build and push images in CI.",
    },
    {
      title: "Monitoring, Alerting & Incident Response",
      subtopics: [
        "Sentry error tracking",
        "Uptime monitoring",
        "Alerting thresholds",
        "On-call basics",
        "Post-mortems",
      ],
      questions: [
        {
          q: "How do you configure Sentry for a Next.js App Router project?",
          answer: `Sentry for Next.js App Router needs to capture errors across **three runtimes** — **client (browser), server (Node SSR/RSC), and edge (middleware)** — so it uses **three config files**, plus **source map upload** during build (kept private) and **release tagging**. The official wizard (\`npx @sentry/wizard@latest -i nextjs\`) scaffolds it.

~~~
sentry.client.config.ts   -> browser errors + performance + (optional) session replay
sentry.server.config.ts   -> Node server: SSR/RSC/route handler errors
sentry.edge.config.ts     -> edge runtime (middleware, edge routes)
next.config.js            -> wrapped with withSentryConfig (source maps, release)
instrumentation.ts        -> registers server/edge init (App Router hook)
~~~

~~~ts
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,                 // performance sampling (don't trace 100% at scale)
  replaysSessionSampleRate: 0.0,         // session replay sampling
  replaysOnErrorSampleRate: 1.0,         // always replay sessions that error
  beforeSend(event) { return scrubPII(event); },  // redact PII
});
~~~

~~~js
// next.config.js — upload source maps (privately) + tag releases
const { withSentryConfig } = require('@sentry/nextjs');
module.exports = withSentryConfig(nextConfig, {
  org: 'my-org', project: 'web',
  authToken: process.env.SENTRY_AUTH_TOKEN,   // CI-only secret for map upload
  widenClientFileUpload: true,
  // source maps uploaded to Sentry then NOT served publicly
});
~~~

Key pieces and why:
- **Three runtimes** — App Router code runs on browser, Node server, and edge; you need all three configs to capture errors everywhere (a server-component error vs a client error vs a middleware error land in different runtimes).
- **\`instrumentation.ts\`** — the App Router mechanism to initialize Sentry on the server/edge at startup (and capture nested RSC/route errors); pair with a **\`global-error.tsx\`** and route **\`error.tsx\`** boundaries that report to Sentry.
- **Source maps uploaded privately** — \`withSentryConfig\` uploads maps during the build so Sentry **de-minifies stack traces**, but the maps are **not exposed publicly** (don't deploy \`.map\` to the CDN) — see [[what-are-the-risks-of-exposing-source-maps-in-production]].
- **Release tagging** — tag events with the release/commit SHA so you can see which deploy introduced an error and track regressions per release; integrate with CI.
- **Sampling** — at high traffic, sample performance traces (\`tracesSampleRate\`) and session replays (sample sessions, always-on for errored sessions) to control cost/volume.
- **\`beforeSend\` PII scrubbing** + \`sendDefaultPii: false\` — keep user data out of Sentry (privacy/GDPR) — see [[how-do-you-ensure-pii-is-not-accidentally-sent-to-analytics-or-error-tracking]].
- **User context / tags** — attach an **opaque** user id, route, release, and breadcrumbs for triage (never PII).

~~~
capture (3 runtimes) + error boundaries -> de-minify via private source maps
  -> tag by release/commit -> sample at scale -> scrub PII -> alert on error-rate spikes
~~~

Why it matters: correct Sentry setup for App Router is non-trivial (three runtimes, instrumentation, private maps, release tagging, sampling, PII) — the senior answer covers all of it, not just "add the DSN." Production angle: Sentry on the news properties with client/server/edge configs, source maps uploaded in CI (de-minified traces, not public), release tagging tied to deploys, sampled performance/replay at scale, and \`beforeSend\` PII scrubbing — feeding alerts on error-rate spikes. Follow-up: "Why three configs?" App Router runs across browser/Node/edge runtimes. "Source maps?" Upload privately for de-minified traces; never serve publicly. "At scale?" Sample traces/replays to control volume/cost; always replay errored sessions. "Which deploy caused it?" Release/commit tagging.`,
        },
        {
          q: "What metrics would you monitor for a news portal frontend?",
          answer: `Monitor across four buckets — **availability/errors, performance (incl. CWV), business/UX, and infrastructure** — and alert on what affects **users and revenue**. For a news portal specifically, traffic is **spiky** and **SEO/ad-driven**, so CWV and availability under spikes matter enormously.

~~~
1) Errors & availability
   - JS error rate / count (Sentry), error-affected user %
   - Uptime / synthetic checks (homepage, article, search) — is the site UP?
   - 4xx/5xx rates (Nginx/CDN/origin), SSR error rate
   - Failed API calls, hydration errors, RSC stream errors

2) Performance (lab + FIELD/RUM)
   - Core Web Vitals at p75: LCP (<2.5s), INP (<200ms), CLS (<0.1)  [field/CrUX/RUM]
   - TTFB (origin/SSR latency), FCP, TBT
   - CDN/Nginx cache HIT ratio (low hit ratio -> origin overload risk)
   - Bundle size / First Load JS (regressions)
   - Third-party script cost / long-task count

3) Business & UX
   - Pageviews, sessions, bounce rate, scroll depth, read completion
   - Ad metrics: viewability, fill rate, revenue (ads fund the site!)
   - Subscription/newsletter conversions, search usage
   - Traffic by source (Search, Discover) — Discover spikes drive load

4) Infrastructure
   - Origin/SSR pod CPU/memory, autoscaling behavior, request latency (p95/p99)
   - Error budget / SLO burn rate
~~~

The reasoning behind the choices (news-specific):
- **Field CWV at p75** — Google ranks on it and most readers arrive **cold from Search/Discover**, so LCP/INP/CLS directly affect traffic and experience. Monitor RUM (web-vitals), not just lab.
- **Cache hit ratio** — a sudden drop means the origin is taking load it shouldn't (a caching bug or a misconfigured \`Vary\`/\`Set-Cookie\`), a leading indicator of an impending overload during a traffic spike.
- **5xx + TTFB under load** — news traffic **spikes** (breaking news, IPL); watch origin saturation and error rates so you catch stampede/scaling issues.
- **Ad metrics** — the site is **ad-funded**, so ad viewability/fill/revenue are first-class health metrics; a deploy that breaks ad slots or tanks viewability is an incident.
- **Error-affected-user %**, not just raw error count — a spike in *affected users* is more actionable than absolute counts.

**Alert on rate-of-change/anomaly, not just static thresholds** — a sudden 5x jump in JS errors or a cache-hit-ratio cliff is more meaningful than an absolute number; tie alerts to **SLOs** (e.g. availability, p75 LCP) and **error-budget burn rate**.

~~~
prioritize alerts on:  availability, error-rate spike, 5xx/TTFB under load,
                       CWV (field) regression, cache-hit-ratio drop, ad-revenue drop
   (user- and revenue-impacting, anomaly-based, tied to SLOs)
~~~

Why it matters: a senior engineer monitors **user/revenue impact across errors, field performance, business, and infra** — and for a news portal specifically calls out **field CWV, cache hit ratio under spikes, and ad metrics** — not just "errors and uptime." Production angle: dashboards for the news properties — Sentry error rate + affected users, web-vitals p75 by template (articleshow/home) and device, CDN/Nginx cache hit ratio, 5xx/TTFB under traffic spikes, and ad viewability/revenue — with anomaly-based alerts tied to SLOs. Follow-up: "Most important single metric?" Availability/error-rate affecting users (and for news, field LCP/INP since they drive ranking/traffic). "Why cache hit ratio?" A drop predicts origin overload during the next spike. "Lab or field?" Field (RUM/CrUX) for what users actually experience and what Google ranks; lab for diagnosis.`,
        },
        {
          q: "Walk me through how you'd respond to a sudden spike in JS errors on production.",
          answer: `Treat it as an **incident** and follow a structured response: **detect/acknowledge -> assess impact -> identify the cause -> mitigate fast (stop the bleeding) -> fix properly -> post-mortem.** The priority order is **restore service first, root-cause later.**

~~~
1. DETECT & ACKNOWLEDGE
   - Alert fires (Sentry error-rate spike / on-call page). Acknowledge it, open an incident channel.
   - Establish severity by IMPACT, not error count.

2. ASSESS IMPACT (triage)
   - How many USERS affected? (error-affected-user %, not just raw count)
   - Which pages/flows? (article? checkout? all?)  Which browsers/regions/devices?
   - Is it user-facing/breaking, or noisy-but-harmless?
   - Correlate timing: did it start right after a DEPLOY? a feature-flag flip? a third-party change?

3. IDENTIFY THE CAUSE (use Sentry + release data)
   - Sentry: the new issue's stack trace (de-minified via source maps), affected release/commit,
     breadcrumbs, first-seen timestamp, browser/OS breakdown.
   - Did it start at a release boundary? -> likely our deploy.
   - Only one browser? -> compatibility. A third-party domain in the stack? -> their script.
   - Check recent deploys, flag changes, and third-party status pages.

4. MITIGATE — STOP THE BLEEDING (fast, low-risk)
   - If a recent DEPLOY caused it -> ROLL BACK to the last good version (fastest fix).
   - If behind a FEATURE FLAG -> flip the KILL SWITCH off (instant, no deploy).
   - If a THIRD-PARTY script -> disable/defer it (flag) until they recover.
   - Goal: restore the user experience NOW, even before full root cause.

5. FIX PROPERLY
   - Once stable, develop the real fix, test it, deploy through the pipeline (canary if risky),
     verify error rate returns to baseline in Sentry/RUM, re-enable the feature gradually.

6. POST-MORTEM (blameless)
   - Timeline, impact, root cause, what detected/delayed it, action items to prevent recurrence
     (better tests, alerts, guardrails). No blame — focus on systemic fixes.
~~~

Key senior principles to verbalize:
- **Mitigate before root-causing** — rollback/kill-switch restores users **fast**; you debug the root cause *after* the bleeding stops. Don't make users wait while you investigate.
- **Impact-based severity** — 10,000 errors from a noisy non-breaking log is lower severity than 50 errors blocking checkout. Measure **affected users + critical flows**.
- **Correlate with changes** — most incidents trace to a **recent deploy, flag flip, or third-party change**; checking the release boundary in Sentry is the fastest lead.
- **Communicate** — keep stakeholders updated in the incident channel; assign an incident commander for big ones.
- **Blameless post-mortem** — the goal is systemic prevention (guardrails, tests, alerts), not blame — which keeps people honest and improves reliability over time.

~~~
detect ─▶ assess impact ─▶ find cause (Sentry release/stack) ─▶ MITIGATE (rollback/kill-switch)
       ─▶ proper fix (canary + verify) ─▶ blameless post-mortem (prevent recurrence)
~~~

Why it matters: this tests **incident-response maturity** — the senior answer leads with **"stop the bleeding via rollback/kill-switch, root-cause after,"** uses **Sentry release/stack data** to localize, gauges **impact (affected users/flows)** over raw counts, and closes with a **blameless post-mortem**. Production angle: a deploy on the news app spikes JS errors -> Sentry shows the new release + a de-minified stack on article pages affecting X% of users -> roll back (or flip the feature flag's kill switch) to restore immediately -> develop/canary the real fix -> verify error rate normalizes -> blameless post-mortem adds a regression test + an alert. Follow-up: "First action?" Assess impact + check if a deploy caused it; if so, roll back/kill-switch to mitigate. "How localize fast?" Sentry: release tag, first-seen time, de-minified stack, browser/affected-user breakdown. "Why blameless?" Encourages transparency and targets systemic prevention over individual blame.`,
        },
      ],
      tip: "Monitor: error rate, JS error count, TTFB p95, INP p75, 4xx/5xx rates. Alert on anomaly, not just threshold.",
      rajnishAngle:
        "Sentry on NBT/Maharashtra Times — source map upload, release tracking, alerting on error rate spikes.",
    },
  ],
};
