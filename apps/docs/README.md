# Melon docs

Documentation site for the Melon monorepo, built with [Fumadocs](https://www.fumadocs.dev/docs) on [TanStack Start](https://tanstack.com/start) (SSR).

**Requires Node.js 22+** for Fumadocs tooling.

## Development

From the monorepo root:

```bash
bun install
bun run dev:docs
```

Open http://localhost:3000 — documentation at `/docs`.

If you see `Cannot find module 'collections/browser'`, run `bun run dev:docs` from the repo root (the dev script runs `fumadocs-mdx` first). Ensure port 3000 is free or set `PORT=3001`.

## Vercel

Deploy from the **monorepo root** (recommended) using the root [`vercel.json`](../../vercel.json), or set the Vercel project root to `apps/docs` and use [`apps/docs/vercel.json`](./vercel.json).

Both configs run `bun install` at the repo root so workspace packages resolve and use the `tanstack-start` framework preset. The Vite config includes `nitro({ preset: "vercel" })`, which emits `.vercel/output` for Vercel Functions (do not set Output Directory to `public` in the dashboard). Workspace `@melon/*` imports are aliased to `packages/*/src` because Rolldown does not resolve workspace `exports` subpaths during `vite build`.

In the Vercel dashboard, set **Framework Preset** to **TanStack Start** and leave **Output Directory** empty so Nitro/Vercel auto-detection applies.

## Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | TanStack Start dev server |
| `bun run build` | Regenerate API docs + production build |
| `bun run docs:api` | TypeDoc → `content/docs/api/<package>/` |
| `bun run typecheck` | `fumadocs-mdx` + `tsc` |

## Content

- `content/docs/` — MDX guides, package pages, API reference, playgrounds
- `meta.json` — sidebar structure per section

See [`.cursor/phases/docs-fumadocs.md`](../../.cursor/phases/docs-fumadocs.md) for the out-of-cycle phase goals.

## Author & license

Copyright (c) 2026 [Nate Nichols](https://github.com/nwnichols02). See [LICENSE](../../LICENSE) for the full MIT license text.
