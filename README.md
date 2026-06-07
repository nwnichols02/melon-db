# Melon

Next-generation offline-first local database for React Native and TypeScript (WatermelonDB successor).

**License:** [MIT](./LICENSE) · **Author:** [Nate Nichols](https://github.com/nwnichols02)

## Packages

| Package | Description |
|---------|-------------|
| `@melon/db` | Core schema, AST, adapter contract, runtime engine |
| `@melon/db-sqlite` | SQLite adapter (Bun `bun:sqlite` + Expo export) |
| `@melon/db-sqlite-native` | Native TurboModule + C++ JSI for RN dev builds |
| `@melon/db-query` | Fluent query builder |
| `@melon/db-query-mango` | Mango-style query compiler |
| `@melon/db-prisma` | Prisma-like local client facade |
| `@melon/db-react` | React hooks and provider |
| `@melon/db-devtools` | Devtools event bridge + React inspector panel |
| `@melon/db-testkit` | Test helpers, fixtures, `withTestDatabase` |
| `@melon/db-codemods` | WatermelonDB migration codemods and query translator |
| `@melon/sync` | Watermelon-compatible pull/push sync orchestrator |
| `@melon/sync-server` | HTTP reference sync backend for dev and integration tests |

## Quick start

### Install from npm (alpha)

```bash
npm install @melon/db@alpha @melon/db-sqlite@alpha @melon/db-react@alpha
```

Or with Bun:

```bash
bun add @melon/db@alpha @melon/db-sqlite@alpha @melon/db-react@alpha
```

### Develop in this monorepo

```bash
bun install
bun test
bun run typecheck
bun run check
```

### In-memory

```ts
import { createDatabase, createInMemoryAdapter, createMelonSchema } from '@melon/db';

const schema = createMelonSchema({
  version: 1,
  collections: {
    tasks: {
      name: 'tasks',
      primaryKey: 'id',
      fields: { id: { kind: 'string' }, title: { kind: 'string' } },
    },
  },
});

const db = createDatabase({ schema, adapter: createInMemoryAdapter() });

await db.write(async (tx) => {
  await tx.collection('tasks').insert({ id: '1', title: 'Hello' });
});

const tasks = await db.collection('tasks').findMany();
```

### SQLite + fluent query (Bun/Node)

```bash
bun run demo
```

See [`apps/playground-node/src/demo.ts`](apps/playground-node/src/demo.ts).

### React Native / Expo playground

```bash
bun run dev:rn              # Expo Go — apps/playground-rn
bun run dev:rn:dev          # Dev build install — apps/playground-rn-dev (prebuild + run:ios)
bun run dev:rn:dev:start    # Metro for dev client (after install)
```

Open the app in iOS Simulator or Android emulator. See [`apps/playground-rn/README.md`](apps/playground-rn/README.md).

### Prisma schema import + codegen

```bash
bun run melon-prisma generate --schema=./schema.prisma --out=./generated/melon
```

See [`packages/melon-db-prisma/README.md`](packages/melon-db-prisma/README.md).

### Benchmarks

```bash
bun run bench
bun run bench:compare    # Melon vs WatermelonDB (better-sqlite3 parity)
```

See [`packages/melon-db-sqlite/README.md`](packages/melon-db-sqlite/README.md), [/docs/performance-comparison](/docs/performance-comparison), and [/docs/performance-comparison/latest-results](/docs/performance-comparison/latest-results) for methodology and latest timings.

### Documentation site

```bash
bun run dev:docs
```

Open http://localhost:3000 — guides at `/docs`, live playgrounds, package reference, and API docs. See [`apps/docs/README.md`](apps/docs/README.md) and the [docs phase](.cursor/phases/docs-fumadocs.md).

### Devtools

Wire the reactive bridge and inspector panel:

```ts
import { createReactiveDevtoolsBridge } from '@melon/db-devtools';
import { MelonDevtoolsProvider, MelonDevtoolsPanel } from '@melon/db-devtools/react';

const devtools = createReactiveDevtoolsBridge();
const db = createDatabase({ schema, adapter, devtools });
```

See [`packages/melon-db-devtools/README.md`](packages/melon-db-devtools/README.md).

### Migrating from WatermelonDB

Use the compatibility matrix and CLI codemods in [`@melon/db-codemods`](packages/melon-db-codemods/README.md):

```bash
bun run melon-codemod migrate-queries --path=./src
bun run melon-codemod migrate-writes --path=./src
bun run melon-codemod migrate-react --path=./src
bun run melon-codemod migrate-schema --path=./src/models/Task.ts
```

The runtime query translator converts serializable Watermelon `Q` clauses to Melon `QueryAst`. Joins (`Q.on`) require manual rewrite — see the [migration guide](/docs/migration#q-on). `migrate-schema` extracts a single Model file to JSON.

### Sync

```bash
bun run postgres:up          # Docker Postgres on localhost:5433
bun run demo:sync
bun run demo:sync:http
bun run demo:sync:postgres
bun run sync-server
bun run sync-server:postgres
```

See [`packages/melon-sync/README.md`](packages/melon-sync/README.md), [`packages/melon-sync-server/README.md`](packages/melon-sync-server/README.md), and [`apps/playground-node/src/sync-demo.ts`](apps/playground-node/src/sync-demo.ts).

```ts
import { synchronize, createMemoryCheckpointStore } from '@melon/sync';

const db = createDatabase({ schema, adapter, sync: {} });

await synchronize({
  db,
  pullChanges: async (args) => /* backend pull */,
  pushChanges: async (args) => /* backend push */,
  checkpointStore: createMemoryCheckpointStore(),
});
```

## v1 limitations

- All mutations must run inside `db.write()`.
- SQLite migrations support add-column and create-table only.
- Relation includes load `belongsTo` and `hasMany` via post-fetch batching (no SQL JOIN shaping).
- SQLite `observeQuery` uses predicate-aware invalidation and cross-collection `relationFilters`, but top-N membership edge cases still exist.

## Completed vs roadmap

Living status: **[`/docs/roadmap`](/docs/roadmap)** on the docs site (run `bun run dev:docs`). Phases **0–34** are shipped; see the docs for full phase history, [architecture ADRs](/docs/architecture/decisions), and [About](/docs/about).

| Done (Phases 0–34) | Deferred (Phase 35+) |
|------|----------|
| Core engine M0–M2 | EAS Build CI |
| SQLite SQL compiler + Bun/Node/Expo adapters | Full multi-file schema codemods |
| `@melon/db-sqlite-native` — iOS + Android TurboModule + C++ JSI | Background sync service |
| Predicate-aware SQLite `observeQuery` + trigger flush / JSI `update_hook` | Per-field timestamps / three-way merge |
| RN on-device benchmark harness (`playground-rn-dev` /benchmark) | SQL SELECT JOIN shaping |
| Dual RN path: Expo Go + dev build (`/rn`, `mode: 'auto'`) | |
| WatermelonDB benchmark comparison (`bench:compare`, CI) | |
| Query / Mango / Prisma surfaces + React/sync hooks | `getChangedCollections` adapter API |
| Schema migrations, relation includes, Q.on filters, devtools + docs site | Sliding window retention (prd-4) |
| Full sync stack (HTTP + Postgres, retry, merge-by-field, custom resolver) | |
| `@melon/db-codemods` v1 + v2 | |
| CI (test, typecheck, biome, bench-smoke, bench-compare, postgres-sync, docs, release-smoke) | |

## Author & license

Copyright (c) 2026 [Nate Nichols](https://github.com/nwnichols02). See [LICENSE](./LICENSE) for the full MIT license text.

Alpha npm packages use dist-tag `alpha` with **no production SLA**. See [Alpha support policy](apps/docs/content/docs/alpha-support.mdx) and [RELEASING.md](./RELEASING.md).

## Development

Per-package typecheck: `bun run typecheck`. Adapter parity is enforced by shared vectors in `packages/melon-db/__fixtures__/`.
