# @melon/db-sqlite

SQLite `StorageAdapter` for Bun/Node using `bun:sqlite`. Compiles `QueryAst` to parameterized SQL.

## Usage

```ts
import { createDatabase, createMelonSchema } from '@melon/db';
import { createSqliteAdapter } from '@melon/db-sqlite';

const db = createDatabase({
  schema,
  adapter: createSqliteAdapter({ filename: 'app.db' }), // or ':memory:'
});
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

- React Native JSI/TurboModule adapter (M2)
- `observeQuery` via native change notifications
