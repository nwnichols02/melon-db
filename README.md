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
| `@melon/db-devtools` | Devtools event bridge (query/SQL snapshots) |
| `@melon/db-testkit` | Test helpers, fixtures, `withTestDatabase` |

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

### Benchmarks

```bash
bun run bench
```

See [`packages/melon-db-sqlite/README.md`](packages/melon-db-sqlite/README.md) for informal baseline notes.

## v1 limitations

- All mutations must run inside `db.write()`.
- No automatic schema migrations.
- No relation includes in queries (v1).
- Native SQLite `observeQuery` triggers not implemented (engine change emitter used instead).

## Completed vs roadmap

| Done | Deferred |
|------|----------|
| Core engine M0–M2 | Custom JSI/TurboModule SQLite |
| SQLite SQL compiler + Bun adapter | `@melon/sync` |
| Expo SQLite adapter (`@melon/db-sqlite/expo`) | `@melon/db-codemods` |
| `apps/playground-rn` | Docs site |
| Query / Mango / Prisma surfaces | Prisma schema import / codegen CLI |
| React hooks | EAS Build CI |
| Devtools bridge + SQL snapshots | |
| CI (test, typecheck, biome) | |

## Development

Per-package typecheck: `bun run typecheck`. Adapter parity is enforced by shared vectors in `packages/melon-db/__fixtures__/`.
