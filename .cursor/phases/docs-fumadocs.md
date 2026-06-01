# Out-of-cycle phase: Fumadocs + TanStack Start docs

## Goal

Production-quality documentation at `/docs`: guides, per-package reference, API docs, roadmap (built vs remaining), and live playgrounds.

## Non-goals

- Changing runtime package behavior
- Full React Native native-module setup guides (link to [architecture/native](/docs/architecture/native) and playground READMEs)

## Exit criteria

- [x] `bun run dev:docs` serves the site at http://localhost:3000
- [x] All former `.md` guides live as `.mdx` under `apps/docs/content/docs/`
- [x] Twelve package pages under `content/docs/packages/` (includes `melon-db-sqlite-native`)
- [x] API reference section per package (TypeDoc + curated type tables)
- [x] Full-text search via `/api/search`
- [x] CRUD and sync playgrounds preserved
- [x] About/vision page, phase history (0–26), architecture ADRs, package-scoped API titles

## Ongoing rules

When merging features:

1. Update the relevant `content/docs/packages/<name>.mdx` status and examples
2. Update `content/docs/roadmap.mdx` if scope or deferrals change (add a phase row when a numbered phase completes)
3. Add or update an ADR in `content/docs/architecture/decisions.mdx` when making a significant architectural choice
4. Add JSDoc on new **public** exports; run `bun run docs:api` before release builds
5. Prefer MDX in `apps/docs/content/docs/` as the canonical docs source (package READMEs stay short with links)

## Stack

- [Fumadocs](https://www.fumadocs.dev/docs) (MDX, UI, search)
- [TanStack Start](https://tanstack.com/start) (SSR)
- Bun workspaces for install and scripts
- Node.js 22+ for local dev and CI

## Commands

```bash
bun run dev:docs      # TanStack Start dev server
bun run build:docs    # production build
bun run docs:api      # regenerate TypeDoc API markdown
```
