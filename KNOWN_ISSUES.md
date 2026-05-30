# Known Issues

A tracked backlog of code-quality issues found during the 2026 modernization.
Each item notes which tool detects it so cleanup can be verified later.

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

- **Unused asset**: `public/fonts/ttnorms/stylesheet.css` (the TTNorms font is
  never wired up — no `@font-face`, and the `font-body` / `--font-body` token is
  unused).
- **Redundant direct dependency**: `@nivo/core` — only used as a peer of
  `@nivo/bullet`, never imported directly.
- **Unlisted binary**: `vp` is used in `package.json` scripts but is provided by
  the developer environment, not listed as a project dependency.
- **Unused exported type**: `Props` interface in `src/layouts/Layout.astro`.

## Detected by `vp run lint` (Oxlint, warnings)

- **Unused variables / parameters**: `result`, `loadingAll` (`App.tsx`),
  `arg0` / `arg1` (the dead `getValue` stub in `IndexedDB.tsx`), and an unused
  `catch (error)` binding.
- **`no-unused-expressions`**: the `errorDate && console.log(...)` /
  `errorAll && console.log(...)` side-effect pattern in `App.tsx`.
- **`jsx-a11y/alt-text`**: two `<img>` tags without `alt` (avatar, calendar) in
  `App.tsx`.
- **Clickable non-interactive element**: the timer uses a clickable `<div>`
  without keyboard handling or an interactive role in `App.tsx`.

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
