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
