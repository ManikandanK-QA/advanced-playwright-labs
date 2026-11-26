# CI/CD

## Pipeline

```
push / pull_request / manual
        │
   quality  ── npm ci, typecheck, lint, format check
        │
   labs (matrix, 6 jobs, each in the pinned Playwright image)
   ├─ visual
   ├─ network
   ├─ performance
   ├─ security
   ├─ security-firefox
   └─ security-webkit
        │            each uploads blob-report/ as blob-<project>
        │
   report ── flatten shard blobs → merge-reports → HTML
        └─ artifact: playwright-report
        └─ main only: publish to gh-pages
```

Design points:

- **The container is the environment.** Every lab job runs in
  `mcr.microsoft.com/playwright:v1.65.1-noble`, so browser, fonts and OS
  libraries are identical to the ones that produced the visual baselines.
- **Quality gate first.** Labs do not start when types, lint or formatting fail.
- **One job per lab.** A visual failure does not hide a security failure, and
  each job's artifacts are attributable.
- **No retries.** `retries: 0`; a red job is a real signal.
- **Least privilege.** Default `contents: read`; only the report job can write.
- **Superseded runs cancel.** Same-ref pushes do not queue up.

## Blob reports and merging

Each matrix job runs with `--reporter=blob`, producing one `report.zip` per
project. The report job flattens them into a single directory with unique names
and calls:

```bash
npx playwright merge-reports --reporter=html ./all-blobs
```

This is why a failed lab still produces a usable merged report: the merge job runs
with `if: always()` as long as the lab jobs were not skipped.

## The version guard

```yaml
- name: Verify the image and the client agree on the Playwright version
  run: |
    installed="$(npx playwright --version | awk '{print $NF}')"
    if [ "$installed" != "${PLAYWRIGHT_VERSION}" ]; then
      echo "::error::Container image is v${PLAYWRIGHT_VERSION} but ..."
      exit 1
    fi
```

`@playwright/test` is pinned to an exact version, and `PLAYWRIGHT_VERSION` plus
the image tag in `ci.yml` must match it. Without this guard, a Dependabot bump of
the test runner would silently change screenshot rendering and every visual test
would fail for a reason nobody would enjoy debugging.

When upgrading Playwright, change all three in one commit:

1. `package.json` → `@playwright/test`
2. `.github/workflows/ci.yml` → `PLAYWRIGHT_VERSION`
3. `.github/workflows/ci.yml` → `container.image` tag

Then regenerate the visual baselines, because the renderer changed.

## Regenerating visual baselines

Run **Actions → CI → Run workflow** with `update_visual_baselines` enabled. The
visual job writes new PNGs and uploads the `visual-baselines` artifact; download
and commit them (see [visual-baselines.md](visual-baselines.md)).

Nothing else needs to change, and the workflow is the same one that compares, so
the generation path cannot rot independently.

## Artifacts

| Artifact                 | Contents                                | Retention |
| ------------------------ | --------------------------------------- | --------- |
| `blob-<project>`         | raw Playwright blob report              | 7 days    |
| `playwright-report`      | merged HTML report                      | 14 days   |
| `visual-baselines`       | regenerated snapshots (manual run only) | 7 days    |
| `test-results-<project>` | traces, screenshots, diffs on failure   | 7 days    |

## Publishing the report

The report job pushes `playwright-report` to the `gh-pages` branch. One-time
repository setup:

1. **Settings → Pages → Deploy from a branch**
2. Branch `gh-pages`, folder `/ (root)`
3. Report URL: `https://<user>.github.io/<repo>/`

The branch is created by the first successful report job. Later runs replace the
report; the merged history lives in git, not in the published bundle.

## Local parity

```bash
npm run validate                  # typecheck + lint + format check
npm test                          # all projects (visual skipped off Linux)
npm run test:network              # route interception lab
npm run test:performance          # budgets + negative control
npm run test:security             # headers, cookies, CSP, storage
npm run site                      # serve the lab on http://127.0.0.1:4173
```

To compare screenshots locally on Linux, run `npm run test:visual`. On other
platforms set `PW_VISUAL_FORCE=1` only when you intend to generate a throwaway
local baseline — never commit it.

## Troubleshooting

| Symptom                                                       | Cause                                | Fix                                             |
| ------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------- |
| `Executable doesn't exist`                                    | browsers not installed               | `npx playwright install chromium`               |
| Visual tests all skipped                                      | not on Linux                         | expected; baselines are Linux-only              |
| `A snapshot doesn't exist` in CI                              | baselines were never committed       | run the workflow with `update_visual_baselines` |
| Every visual test fails after a dependency bump               | Playwright version changed           | bump the container tag and regenerate baselines |
| `Hermetic network check failed: requests left the lab origin` | a page or test reached a third party | mock it, or remove the dependency               |
| `API calls were not mocked`                                   | a network test hit the real endpoint | register the mock through `ledger.route`        |
| EPIPE / port in use                                           | another lab server is running        | stop it, or set `LAB_SITE_URL` to a free port   |
| Report job fails with "No blob reports"                       | lab jobs failed before running tests | fix the failing job; the message is intentional |
