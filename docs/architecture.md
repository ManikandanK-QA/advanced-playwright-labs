# Architecture

## What this repository is

Four independent testing disciplines over one deterministic target, sharing a
thin amount of framework code:

| Lab         | What it proves                                                      |
| ----------- | ------------------------------------------------------------------- |
| Visual      | Pixels are diffed against a baseline built in a reproducible image  |
| Network     | Async UI states are driven by controlled responses, never by timing |
| Performance | Core Web Vitals are measured in the browser and gated by budgets    |
| Security    | CSP, cookie flags and headers are enforced, not merely declared     |

The target is a small site in `apps/lab-site`, served by a zero-dependency Node
server. That is a deliberate choice: a third-party demo cannot give the suite a
policy it can assert, nor a page with a known regression baked in.

## Layer map

```
apps/lab-site/
  server.mjs               headers, cookies, JSON endpoints with delay/failure
  public/                  deterministic HTML, CSS, classic scripts, inline SVG

src/
  config.ts                target URL, budgets, baseline platform policy
  fixtures.ts              project test object: hermetic ledger, options
  api/lab-api.ts           typed mock payloads and route helpers
  pages/                   page objects (locators + intent, no assertions)
  support/hermetic.ts      request ledger: origin + mock coverage checks
  support/vitals.ts        browser-side PerformanceObserver collectors
  support/collect-vitals.ts navigation + settle + read orchestration

tests/
  visual/                  screenshot comparisons
  network/                 route interception, retry, gating, failure injection
  performance/             budgets and a negative control
  security/                headers, cookies, CSP, storage
```

Dependencies point one way: `tests → pages/support/api → config`. Nothing in
`src` imports a spec, and the lab site is never imported by test code — the only
contract between them is HTTP.

## Why a custom server instead of a static host

A static host cannot set `Content-Security-Policy`, `Set-Cookie` attributes, or
answer `/api/feed` with a 503 on demand. Running `serve` would force the suite to
mock the very headers it claims to test, which would make the security lab
circular.

`server.mjs` is ~300 lines of `node:http` with no dependencies:

- **Headers** are a single exported constant, so the contract has one home.
- **Cookies**: an HttpOnly `session` and a readable `theme`. The readable one is
  a positive control — without it, "the session cookie is unreadable" could
  simply mean cookies are broken.
- **Latency and failure** (`?delay=`, `?fail=1`) exist for manual exploration;
  the automated suite uses `page.route` instead so it can control timing exactly.
- **No caching** (`Cache-Control: no-store`), so a screenshot run can never use a
  stale asset from a previous run.

## The hermetic ledger

Every test gets `ledger` from `src/fixtures.ts`, automatically. It records each
request and, at teardown, fails the test if either rule is broken:

1. **No request leaves the lab origin.** A suite that silently depends on a CDN
   is not reproducible and not offline-safe.
2. **When `requireApiMocks` is on, every `/api/` call was answered by a mock.**
   This is what stops a "network mocking" test from quietly hitting the real
   endpoint and passing for the wrong reason.

The network suite turns rule 2 on with `test.use({ requireApiMocks: true })`.
Tests register mocks through `ledger.route(...)` rather than `page.route(...)`,
so the bookkeeping cannot drift from reality.

## Page objects

Page objects model intent — `feed.reload()`, `checkout.fillOrder(...)` — and
expose locators (`checkout.confirmation`). They contain no `expect` calls. A
failure is therefore reported at the spec line, not inside a helper, which is the
difference between "confirmation was not visible" and "something in the page
object was wrong".

Readiness uses the page's own signals (`__cspReady`, `__labSettled`) instead of
timeouts. Fixed sleeps are absent from the repository.

## Project model

```
visual              chromium · 1280×720 · DPR 1 · baselines from Linux image
network             chromium
performance         chromium · LCP/CLS/longtask APIs
security            chromium
security-firefox    firefox
security-webkit     webkit
```

One project per discipline, and extra engines only where engine behaviour is
the subject. Running visual or performance tests three times would add minutes
and no signal. Running security once would miss real differences in CSP and
cookie handling, which is exactly where engines diverge.

## Data flow: network lab

```
test
 └─ ledger.route('**/api/feed', handler)     registers mock + records pattern
     └─ page.goto('/network/feed.html')
         └─ feed.js: fetch('/api/feed')
             ├─ mocked 200 → render rows
             ├─ mocked 503 → error state, retry enabled
             ├─ route.abort() → transport error state
             └─ handler awaits a gate → loading state observable
 teardown → ledger.assertClean()
```

The gate pattern is the important one: the test holds the response open, asserts
the loading state, then releases it. The test is deterministic on a fast or a
slow machine.

## Data flow: performance lab

```
collectVitals(page, path)
 ├─ page.addInitScript(installVitalsObserver)   LCP / CLS / longtask observers
 ├─ page.goto(path)
 ├─ waitForFunction(__labSettled)               page decides when it is done
 ├─ two requestAnimationFrames                  flush pending paints
 └─ page.evaluate(readVitals)                   nav timing + resource timing
```

`/performance/heavy.html` injects one layout shift and one 80 ms long task after
load. The suite asserts those are **detected**. A measurement harness that has
never failed is not evidence of anything.

## Extension points

| Need                     | Where                                                             |
| ------------------------ | ----------------------------------------------------------------- |
| New page under test      | `apps/lab-site/public/` + a page object in `src/pages/`           |
| New endpoint             | `apps/lab-site/server.mjs` + typed helper in `src/api/lab-api.ts` |
| New budget               | `src/config.ts` (single reviewed constant)                        |
| New browser for security | one project entry in `playwright.config.ts`                       |
| New visual page          | spec in `tests/visual/` + regenerate baselines via CI             |
| New lab discipline       | new `tests/<lab>/` directory and project                          |

## Deliberate boundaries

- **No retries.** `retries: 0` everywhere. A visual or performance test that only
  passes on the second attempt is a finding, not a pass.
- **No accessibility checks.** Repo #1 (`playwright-typescript-framework`) covers
  axe-core; duplicating it here would add runtime without adding coverage.
- **No API-only suite.** Repo #2 (`python-pytest-qa-automation`) covers REST
  contracts; this repository's API endpoints exist to serve browser behaviour.
- **No load testing.** That belongs to `enterprise-qa-portfolio` (k6).
