# Changelog

All notable changes to the `@melon/*` packages are documented here.

## 0.1.0-alpha.0 — 2026-06-02

First public **alpha** release on npm (dist-tag `alpha`). Not recommended for production without your own validation.

### Packages

- `@melon/db` — core engine, schema, AST, in-memory adapter, sync hooks
- `@melon/db-query` — fluent query builder
- `@melon/db-query-mango` — Mango compiler
- `@melon/db-testkit` — test helpers
- `@melon/db-sqlite` — SQLite adapters (Node, Expo, RN entrypoints)
- `@melon/db-sqlite-native` — JSI/TurboModule native module
- `@melon/db-prisma` — Prisma schema import + local client (`melon-prisma` CLI)
- `@melon/db-devtools` — debug bridge + React panel
- `@melon/sync` — pull/push sync client
- `@melon/sync-server` — reference HTTP/Postgres backends
- `@melon/db-react` — hooks and providers
- `@melon/db-codemods` — WatermelonDB migration CLI

### Install

```bash
npm install @melon/db@alpha @melon/db-sqlite@alpha @melon/db-react@alpha
```

See [Getting started](https://github.com/melon/melon/blob/main/apps/docs/content/docs/getting-started.mdx) and [v1 limitations](https://github.com/melon/melon/blob/main/apps/docs/content/docs/roadmap.mdx#v1-limitations).

### Known limitations

- All writes must run inside `db.write()`.
- Relation includes use post-fetch (`belongsTo` + `hasMany`); no SQL JOIN shaping.
- Sliding window / device retention (prd-4) is **not** included.
- Alpha has **no production SLA**; breaking changes may ship in `0.1.x-alpha.*`.
