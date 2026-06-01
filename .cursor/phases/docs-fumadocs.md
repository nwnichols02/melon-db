# Out-of-cycle phase: Fumadocs + TanStack Start docs

## Goal

Production-quality documentation at `/docs`: guides, per-package reference, API docs, roadmap (built vs remaining), and live playgrounds.

## Non-goals

- Changing runtime package behavior
- Full React Native native-module setup guides (link to playground README only)

## Exit criteria

- [ ] `bun run dev:docs` serves the site at http://localhost:3000
- [ ] All former `.md` guides live as `.mdx` under `apps/docs/content/docs/`
- [ ] Eleven package pages under `content/docs/packages/`
- [ ] API reference section per package (TypeDoc + curated type tables)
- [ ] Full-text search via `/api/search`
- [ ] CRUD and sync playgrounds preserved

## Ongoing rules

When merging features:

1. Update the relevant `content/docs/packages/<name>.mdx` status and examples
2. Update `content/docs/roadmap.mdx` if scope or deferrals change
3. Add JSDoc on new public exports; run `bun run docs:api` before release builds
4. Prefer MDX in `apps/docs/content/docs/` as the canonical docs source (package READMEs stay short with links)

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
