# @melon/db-sqlite

SQLite `StorageAdapter` implementations that compile `QueryAst` to parameterized SQL.

## Bun / Node

```ts
import { createDatabase, createMelonSchema } from '@melon/db';
import { createSqliteAdapter } from '@melon/db-sqlite';

const db = createDatabase({
  schema,
  adapter: createSqliteAdapter({ filename: 'app.db' }), // or ':memory:'
});
```

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

## Architecture

```
QueryAst → compileQuery → SqliteDriver (Bun or Expo) → SQLite
```

## Benchmarks (informal baselines)

On a typical dev machine (Bun, `:memory:`), expect roughly:

| Operation | ~10k rows |
|-----------|-----------|
| Bulk insert | tens–low hundreds ms |
| Filtered query + limit 20 | sub-ms–few ms |

Run locally:

```bash
bun run bench
```

Numbers vary by hardware; not enforced in CI.

## Deferred

- Custom JSI/TurboModule adapter (beyond expo-sqlite)
- `observeQuery` via native change notifications
