# Bored Calendar

> "Sometimes you've just got to be bored, kid!"

Bored Calendar is a playful digital wellbeing app. Its purpose isn't to eliminate
boredom or maximize productivity — it's to help you reclaim boredom as a healthy
mental space: room for reflection, creativity, and intentional choice.

Log or schedule a bored moment, sit with it instead of filling it, reflect on what
surfaced, and watch simple patterns emerge over time. Data is stored locally on your
device by default.

See [AGENTS.md](./AGENTS.md) for the full product intent and direction.

## Tech stack

- [Astro](https://astro.build) with the React integration
- [Tailwind CSS](https://tailwindcss.com)
- [TanStack Query](https://tanstack.com/query) + [`idb`](https://github.com/jakearchibald/idb) for local-first IndexedDB storage
- [Vite+ (`vp`)](https://viteplus.dev) as the command interface (delegates to pnpm)

## Getting started

This project uses [Vite+](https://viteplus.dev) (`vp`) as the command interface for
day-to-day work. `vp` delegates dependency management to the project's package
manager (pnpm), so the lockfile and `packageManager` field remain pnpm.

Node is pinned in `.node-version` (read by mise, vp, and Netlify).

| Command        | Action                                         |
| :------------- | :--------------------------------------------- |
| `vp install`   | Install dependencies (delegates to pnpm)       |
| `vp run dev`   | Start the local dev server at `localhost:4321` |
| `vp check`     | Run format, lint, and type checks              |
| `vp run test`  | Run `astro check`                              |
| `vp run build` | Build the production site to `./dist/`         |
| `vp preview`   | Preview the production build locally           |
| `vp run lint`  | Extended Oxlint pass (jsx-a11y + react rules)  |
| `vp run knip`  | Report unused files, exports, and dependencies |

Prefer plain pnpm? `pnpm install` / `pnpm run dev` work too — `vp` simply wraps them.

See [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) for the backlog `vp run lint` / `vp run knip` currently surface.

## Project structure

```
/
├── public/              # static assets
├── src/
│   ├── components/       # Astro + React components
│   ├── layouts/
│   └── pages/           # file-based routes
├── astro.config.mjs
└── package.json
```

## Deploying

The site deploys to Netlify (`netlify.toml`): it builds with `pnpm run build` and
publishes `dist/`.
