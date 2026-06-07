---
name: melon-dev
description: Work on the Melon monorepo — packages, playgrounds, docs, and PRD compliance. Use when editing @melon-db/db, example apps, or apps/docs.
---

# Melon development

Read `AGENTS.md` at the repo root first.

## Before coding

1. Identify the package boundary (`@melon-db/db` must not import other melon-* except as documented).
2. Check [PRD compliance](apps/docs/content/docs/prd-compliance.mdx) for deferred vs gap items.
3. For docs site work, follow `.cursor/rules/melon-tanstack.mdc`.

## After shipping

- Update package MDX under `apps/docs/content/docs/packages/`.
- Update walkthroughs if example app behavior changed.
- Update `prd-compliance.mdx` if PRD rules changed.

## Typing

- No new `as` casts in `packages/melon-db*` (see `apps/docs/content/docs/contributing/typescript.mdx`).
- Use `isPreparedQuery()` from `@melon-db/db-react` query-deps patterns.

## Tests

```bash
bun test                           # all packages
bun test packages/melon-db-react   # single package
```
