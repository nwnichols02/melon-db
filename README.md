# Melon

Next-generation offline-first local database for React Native and TypeScript (WatermelonDB successor).

## Packages

| Package | Description |
|---------|-------------|
| `@melon/db` | Core schema, AST, adapter contract, runtime engine |
| `@melon/db-sqlite` | SQLite adapter (Bun `bun:sqlite` + Expo export) |
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
```

See [`packages/melon-db-sqlite/README.md`](packages/melon-db-sqlite/README.md) for informal baseline notes.

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
- Relation includes support `belongsTo` only (no `hasMany` includes in queries).
- Native SQLite `observeQuery` triggers not implemented (engine change emitter used instead).

## Completed vs roadmap

Living status: **[`/docs/roadmap`](/docs/roadmap)** on the docs site (run `bun run dev:docs`). Summary:

| Done | Deferred (Phase 22+) |
|------|----------|
| Core engine M0–M2 | Native `observeQuery` / SQLite triggers |
| SQLite SQL compiler + Bun adapter | EAS Build CI |
| Expo SQLite adapter (`@melon/db-sqlite/expo`, Expo Go) | WatermelonDB benchmark comparison |
| JSI SQLite (`@melon/db-sqlite/rn`, iOS + Android dev build) | |
| Optional Node driver (`@melon/db-sqlite/node`) | Full multi-file schema codemods |
| `apps/playground-rn` + sync demo | Background sync service |
| Query / Mango / Prisma surfaces | Per-field timestamps / three-way merge |
| React hooks (`useFindMany`, `useMangoQuery`, `useSync`) | |
| Schema migrations | |
| Prisma schema import + codegen CLI | |
| belongsTo relation includes | |
| Reactive devtools bridge + sync event logging | |
| Devtools React inspector panel (web + RN dev overlay) | |
| Fumadocs + TanStack Start docs site | |
| SQL predicate test coverage + debug flag | |
| Benchmark harness (10k/50k/100k) + CI smoke | |
| Adapter stress tests (rollback, write queue) | |
| `@melon/db-codemods` (query translator + CLI) | |
| `@melon/sync` (outbox + orchestrator) | |
| Persistent SQLite checkpoints | |
| `@melon/sync-server` (HTTP reference backend) | |
| Postgres reference backend (`PostgresSyncStore` + SQL migrations) | |
| Sync retry queue + cancellation | |
| Network monitor hooks + auto-resume | |
| Conflict policies (client-wins, last-write-wins) | |
| Merge-by-field conflict resolver | |
| Custom conflict resolver hook | |
| Codemods v2 + Q.on recipes + migrate-schema spike | |
| Migration-aware sync coordination | |
| CI (test, typecheck, biome, bench-smoke, docs typecheck, postgres-sync) | |

## Development

Per-package typecheck: `bun run typecheck`. Adapter parity is enforced by shared vectors in `packages/melon-db/__fixtures__/`.
