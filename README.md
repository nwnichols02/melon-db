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
bun run dev:rn
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

Open http://localhost:3000 for guides and live in-browser playgrounds. See [`apps/docs/README.md`](apps/docs/README.md).

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
```

The runtime query translator converts serializable Watermelon `Q` clauses to Melon `QueryAst` without a WatermelonDB dependency. Join queries (`Q.on`) and model decorator → schema codemods are manual / deferred — see the package README checklist.

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

| Done | Deferred (Phase 17+) |
|------|----------|
| Core engine M0–M2 | Custom JSI/TurboModule SQLite |
| SQLite SQL compiler + Bun adapter | EAS Build CI |
| Expo SQLite adapter (`@melon/db-sqlite/expo`) | WatermelonDB benchmark comparison |
| Optional Node driver (`@melon/db-sqlite/node`) | Model/schema codemods, `Q.on` joins |
| `apps/playground-rn` + sync demo | Merge-by-field conflict resolver |
| Query / Mango / Prisma surfaces | Background sync service |
| React hooks (`useFindMany`, `useMangoQuery`, `useSync`) | |
| Schema migrations | |
| Prisma schema import + codegen CLI | |
| belongsTo relation includes | |
| Reactive devtools bridge + sync event logging | |
| Devtools React inspector panel (web + RN dev overlay) | |
| `apps/docs` site with live playgrounds | |
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
| Migration-aware sync coordination | |
| CI (test, typecheck, biome, bench-smoke, docs typecheck, postgres-sync) | |

## Development

Per-package typecheck: `bun run typecheck`. Adapter parity is enforced by shared vectors in `packages/melon-db/__fixtures__/`.
