# @melon/db-sqlite

SQLite `StorageAdapter` implementations that compile `QueryAst` to parameterized SQL.

## Bun / Node (default)

```ts
import { createDatabase, createMelonSchema } from '@melon/db';
import { createSqliteAdapter } from '@melon/db-sqlite';

const db = createDatabase({
  schema,
  adapter: createSqliteAdapter({ filename: 'app.db' }), // or ':memory:'
});
```

Uses `bun:sqlite` when running under Bun.

## Vanilla Node (`better-sqlite3`)

For migration scripts and server-side tooling outside Bun:

```ts
import { createNodeSqliteAdapter } from '@melon/db-sqlite/node';

const db = createDatabase({
  schema,
  adapter: createNodeSqliteAdapter({ filename: 'app.db' }),
});
```

Install the optional peer dependency: `bun add better-sqlite3`

## React Native / Expo

Use the `./expo` export with `expo-sqlite` (peer dependency):

```ts
import { createDatabase } from '@melon/db';
import { createExpoSqliteAdapter } from '@melon/db-sqlite/expo';
import * as SQLite from 'expo-sqlite';

const expoDb = await SQLite.openDatabaseAsync('app.db');
const db = createDatabase({
  schema,
  adapter: createExpoSqliteAdapter({ database: expoDb }),
});
```

The Expo driver shares the same SQL compiler and adapter core as the Bun driver via a `SqliteDriver` interface. Reactivity uses the engine `ChangeEmitter` (not native SQLite triggers).

## Debug logging

Pass `debug: true` and an `onQueryDebug` callback to capture compiled SQL without using `console.*`:

```ts
createSqliteAdapter({
  filename: ':memory:',
  debug: true,
  onQueryDebug: ({ sql, params }) => {
    // forward to devtools or test assertions
  },
});
```

## Architecture

```
QueryAst → compileQuery → SqliteDriver (Bun | Node | Expo) → SQLite
```

## Benchmarks

Run locally:

```bash
bun run bench              # 10k smoke (default)
bun run bench:full         # 10k + 50k + 100k
```

Flags:

- `--scale=10k|50k|100k|all`
- `--adapter=sqlite|memory|both`
- `--json` — machine-readable output for CI

Informal baselines on a typical dev machine (Bun, `:memory:`):

| Scale | Row insert (sqlite) | Batch insert (sqlite) | Filtered query |
|-------|---------------------|----------------------|----------------|
| 10k   | tens–low hundreds ms | lower than row insert | sub-ms–few ms |
| 50k   | hundreds ms–low s   | significantly faster | few ms |
| 100k  | ~1s+                | n/a at 100k          | few–tens ms |

Numbers vary by hardware; CI runs a 10k smoke job (soft gate, no failure on regression). WatermelonDB comparison deferred.

## Deferred

- Custom JSI/TurboModule adapter (beyond expo-sqlite)
- `observeQuery` via native change notifications
