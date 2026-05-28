# Known Issues

A tracked backlog of code-quality issues found during the 2026 modernization.
None are fixed yet — this PR only adds the tooling that surfaces them. Each item
notes which tool detects it so cleanup can be verified later.

## Tooling

- **Linting** — `vp run lint` runs Oxlint with `.oxlintrc.json` (enables the
  `jsx-a11y` and `react` plugins on top of the Vite+ defaults). The blocking
  `vp check` gate uses Vite+'s bundled Oxlint config and does **not** read
  `.oxlintrc.json` (Vite+ recommends against it), so these extra rules are
  surfaced on demand via `vp run lint`, not enforced in CI yet.
- **Dead code / deps** — `vp run knip` reports unused files, exports, and
  dependencies (`knip.json` declares `.github/workflows/ci.main.ts` as an entry
  point so its `yaml` / `@jlarky/gha-ts` deps aren't false-flagged).

Neither tool is wired into the blocking `vp check` yet: doing so would require
fixing the issues below first (they would turn into CI failures).

## Detected by `knip` (dead code / deps)

- **Unused component files** (not imported anywhere; `App.tsx` has its own inline
  versions): `src/components/Card.astro`, `Today.astro`, `Statistic.astro`,
  `Today.tsx`, `ButtonTimer.tsx`, `useClientOnly.tsx`.
- **Unused asset**: `public/fonts/ttnorms/stylesheet.css` (the TTNorms font is
  never wired up — no `@font-face`, and the `font-body` / `--font-body` token is
  unused).
- **Unused public SVGs** (referenced only by the dead components above):
  `public/today.svg`, `public/statistic.svg`. _(knip does not scan `public/`
  assets referenced by URL — found by hand.)_
- **Redundant direct dependency**: `@nivo/core` — only used as a peer of
  `@nivo/bullet`, never imported directly.
- **Unused exported type**: `Props` interface in `src/layouts/Layout.astro`.

## Detected by `vp run lint` (Oxlint, warnings)

- **Unused variables / parameters**: `result`, `loadingAll` (`App.tsx`),
  `arg0` / `arg1` (the dead `getValue` stub in `IndexedDB.tsx`), and an unused
  `catch (error)` binding.
- **`no-unused-expressions`**: the `errorDate && console.log(...)` /
  `errorAll && console.log(...)` side-effect pattern in `App.tsx`.
- **`jsx-a11y/alt-text`**: two `<img>` tags without `alt` (avatar, calendar) in
  `App.tsx`.

## Not detectable by either tool (need human review)

- **Correctness: `Date` mutated during render** — `App.tsx` builds the React
  Query key with `value.setHours(0, 0, 0, 0)`, which mutates the `value` state
  object in place. No lint rule (Oxlint or ESLint) models this pattern. Should be
  rewritten to derive a normalized timestamp without mutating state.
- **Dead stub method** — `IndexedDb.getValue(arg0, arg1)` only
  `throw`s "Method not implemented." (knip doesn't report class members; Oxlint
  only flags its unused params).
- **Unused CSS custom properties** — `--accent` / `--accent-gradient` in
  `Layout.astro` (only referenced by the dead `Card.astro`).
- **Stale package name** — `package.json` `name` is still `@example/basics`.
