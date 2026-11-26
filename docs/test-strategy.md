# Test strategy

## Coverage map

| Lab         | Scenario                                                    | Kind                |
| ----------- | ----------------------------------------------------------- | ------------------- |
| Visual      | Dashboard full page vs baseline                             | regression          |
| Visual      | KPI card component vs baseline                              | component           |
| Visual      | Pass-rate chart element vs baseline                         | component           |
| Visual      | Pricing full page vs baseline                               | regression          |
| Visual      | Featured plan in hover state                                | interaction state   |
| Network     | Mocked feed renders in API order                            | happy path          |
| Network     | Empty feed shows empty state                                | boundary            |
| Network     | 503 then retry recovers, exactly two calls                  | error recovery      |
| Network     | Aborted request surfaces an error, not a hang               | failure injection   |
| Network     | Held request keeps the loading state visible                | concurrency         |
| Network     | Checkout posts the exact JSON body, renders confirmation    | contract            |
| Network     | 500 shows the server error and re-enables the form          | error path          |
| Network     | Transport failure preserves the form data                   | resilience          |
| Performance | Baseline page inside LCP/CLS/TTFB/DCL budgets               | budget gate         |
| Performance | Baseline page loads no third-party resources                | isolation           |
| Performance | Injected shift and long task are detected                   | negative control    |
| Security    | CSP, frame-ancestors, nosniff, referrer policy on documents | header contract     |
| Security    | Same hardening on JSON and on 404 responses                 | header contract     |
| Security    | Session cookie is HttpOnly + SameSite=Strict                | cookie contract     |
| Security    | `document.cookie` sees `theme` but not `session`            | browser enforcement |
| Security    | Clearing the session removes both cookies                   | lifecycle           |
| Security    | Inline script blocked, violation reported                   | CSP enforcement     |
| Security    | Reflected markup renders, injected handler never executes   | XSS defence         |
| Security    | Safe sink renders the same payload as text                  | sink contrast       |
| Security    | Storage has no credential-shaped values                     | data hygiene        |
| Security    | HttpOnly cookie is not mirrored into storage                | data hygiene        |

27 tests across five projects, six runs when the two extra security engines are
counted.

## Budgets

| Metric                | Budget   | Source                 | Why this number                                                        |
| --------------------- | -------- | ---------------------- | ---------------------------------------------------------------------- |
| LCP                   | 2 500 ms | Core Web Vitals "good" | Google's published threshold                                           |
| CLS                   | 0.10     | Core Web Vitals "good" | Google's published threshold                                           |
| TTFB                  | 800 ms   | local target           | If a localhost response is slower, the page or the harness is at fault |
| DOMContentLoaded      | 2 000 ms | local target           | A 960×260 image and one stylesheet must not take longer                |
| Long tasks (baseline) | 0        | main-thread health     | Any 50 ms+ block on a static page is a defect                          |

The baseline page additionally has to stay under a 0.01 CLS allowance, which only
absorbs sub-pixel rounding. The 0.10 budget is the gate; 0.01 is the statement
that this page does not move.

All values live in `src/config.ts`. A budget change is one reviewed line, not a
number buried in a spec.

## Negative controls

Two tests assert that something bad is detected:

- `/performance/heavy.html` must report CLS above 0.05 and at least one long task.
- The visual suite must fail when a page changes. This was verified by changing
  the chart stroke colour and observing two failing comparisons, then reverting.

They exist because a suite of only "passing" checks cannot distinguish "healthy
system" from "broken instrument". If the observer or the diff pipeline breaks,
these tests fail first.

## Determinism rules

1. **No fixed sleeps.** Waits are web-first assertions, `waitForFunction` on a
   page-owned flag, or `waitForResponse`.
2. **No shared mutable state.** Each test creates its own context, and the ledger
   proves no test escaped to the internet.
3. **No assertions in page objects.** Failures point at spec lines.
4. **No random data in visual pages.** Every string, number and colour is fixed.
5. **No web fonts, no external images.** The hero is an inline SVG; text uses a
   generic Arial stack. Baselines stay stable across image rebuilds.
6. **No retries.** A flaky pass is a defect.
7. **Pinned browser.** `@playwright/test` is pinned exactly, and CI fails if it
   disagrees with the container image tag.

## Cross-browser scope

| Project     | Engines                                                       |
| ----------- | ------------------------------------------------------------- |
| Visual      | Chromium only — baselines are engine-specific by definition   |
| Network     | Chromium — route interception is engine-independent           |
| Performance | Chromium — LCP/CLS/longtask observers are most complete there |
| Security    | Chromium, Firefox, WebKit — enforcement genuinely differs     |

The security specs avoid engine-specific error strings. For example, the aborted
request test asserts the UI's own message ("Could not load the feed") rather than
Chromium's "Failed to fetch".

Cookie assertions separate the two things that can differ:

- The `Set-Cookie` **header** is asserted as a string on every engine, so
  `SameSite=Strict` and `HttpOnly` are checked everywhere.
- The **browser-side** check asserts what the engine can actually observe:
  HttpOnly is enforced (`document.cookie` cannot see `session`, while it can see
  `theme`). WebKit on Windows reports `sameSite: "None"` for these plain-HTTP
  localhost cookies even though the header carries Strict/Lax, so the test only
  checks the reported value when the engine surfaces one. Pretending WebKit
  enforces a value its cookie API does not expose would be a false assertion.

## What is deliberately not tested

- **Load, stress, soak** — `enterprise-qa-portfolio` (k6).
- **REST contract suites** — `python-pytest-qa-automation` (pytest + pydantic).
- **Accessibility** — `playwright-typescript-framework` (axe-core).
- **`Secure` cookie flag and HSTS** — the lab is served over plain HTTP on
  localhost, where browsers would reject them. Testing them here would assert a
  header string while the browser silently drops the cookie, which is worse than
  saying so. Those belong in a TLS-terminated environment test.
- **AI-assisted generation and triage** — `playwright-ai-mcp-agent`.

## Exit criteria for a change

- `npm run validate` passes (typecheck, lint, formatting).
- `npm test` passes, or visual tests are explicitly skipped with a documented
  reason on non-Linux platforms.
- A new behaviour has a happy path and either a negative, boundary or failure
  case.
- No new sleep, no new hardcoded origin, no new retry.
