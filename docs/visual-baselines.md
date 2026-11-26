# Visual baselines

## Why the baseline is built in a container

A screenshot is a function of the page **and** the renderer: browser build, font
package, font hinting, OS libraries and device pixel ratio. Comparing a PNG made
on Windows with one made on Ubuntu produces failure reports that say nothing
about the application.

So baselines are generated in `mcr.microsoft.com/playwright:v1.65.1-noble` and
compared in the same image. That is the only place the committed PNGs are valid.

Two consequences, both intentional:

- On macOS and Windows the visual project is **skipped**, not passed. A
  screenshot assertion that compared nothing must never look green.
- `@playwright/test` is pinned to the exact image version. CI fails if the two
  disagree:

  ```
  Container image is v1.65.1 but @playwright/test resolved to 1.66.0.
  Visual baselines would drift.
  ```

## Generating or updating baselines

Baselines are produced by CI, never by a developer machine:

1. Run the **CI** workflow manually with `update_visual_baselines = true`.
2. The `visual` job runs `--update-snapshots` inside the pinned image and uploads
   the `visual-baselines` artifact.
3. Download and commit them:

   ```bash
   gh run download <run-id> -n visual-baselines -D tests/visual/visual.spec.ts-snapshots
   git add tests/visual/visual.spec.ts-snapshots
   git commit -m "test(visual): refresh baselines in the pinned Playwright image"
   ```

4. Push. The next run compares against the committed files.

Local baselines are git-ignored (`*-win32.png`, `*-darwin.png`) so they can never
be committed by accident.

## Tolerance

```ts
toHaveScreenshot: {
  animations: 'disabled',
  caret: 'hide',
  scale: 'css',
  threshold: 0.2,     // per-pixel colour sensitivity
  maxDiffPixels: 100, // absolute allowance per screenshot
}
```

`maxDiffPixels` is absolute rather than a ratio on purpose. The first version used
`maxDiffPixelRatio: 0.01`, and during verification a change to the chart stroke
colour **passed**: the changed pixels were about 0.1–1.7 % of the image depending
on the element, which sat inside the allowance. That is a tolerance bug, not a
threshold nuance — a visible colour change must fail.

100 pixels is far below any real regression (a moved element, a changed colour, a
missing row) and far above raster noise inside a pinned image. If a baseline is
genuinely flaky in CI, the correct fix is to remove the non-determinism from the
page, not to raise the allowance.

## What makes the fixture pages comparable

- No web fonts; the stack is `Arial, Helvetica, sans-serif`.
- No network-loaded images; the hero is an inline SVG file with explicit
  `width`/`height` attributes.
- Every string, number and colour is hardcoded. No dates, no random ids, no
  "last updated" text.
- Fixed viewport `1280×720` and `deviceScaleFactor: 1`, with `scale: 'css'`.
- Animations disabled by Playwright; the only transition-like effect is a hover
  `filter`, captured deliberately in one test.

## Reading a failure

Each failing comparison produces three files under `test-results/<test>/`:

| File                  | Meaning                           |
| --------------------- | --------------------------------- |
| `<name>-expected.png` | the committed baseline            |
| `<name>-actual.png`   | what this run rendered            |
| `<name>-diff.png`     | changed pixels highlighted in red |

The GitHub Actions artifact `test-results-visual` contains all three, plus the
trace. The merged HTML report also embeds the slider view.

## When a change is intentional

1. Confirm the diff is exactly the change you made — open `-diff.png`, do not
   assume.
2. Regenerate with `update_visual_baselines = true`.
3. Mention the reason in the commit message, because the PNG diff itself is not
   reviewable in a pull request.

Never regenerate baselines merely to make a red build green. That converts the
suite into a screenshot recorder.
