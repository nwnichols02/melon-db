# @melon/db

Core storage engine for Melon: schema metadata, query AST, adapter contract, runtime (`MelonDatabase`), migrations, and in-memory adapter.

## Architecture

```
Schema (createMelonSchema)
    → QueryAst / PreparedQuery (validate → plan → prepare)
    → StorageAdapter (find / count / write)
    → MelonDatabase + MelonCollection + MelonQueryHandle
```

## Migrations

Pass a `migrations` array to `createDatabase`:

```ts
const db = createDatabase({
  schema: createMelonSchema({ version: 2, collections: { /* ... */ } }),
  adapter: createSqliteAdapter({ filename: 'app.db' }),
  migrations: [
    {
      toVersion: 2,
      steps: [
        {
          type: 'addColumns',
          collection: 'tasks',
          fields: { dueDate: { kind: 'date', nullable: true } },
        },
      ],
    },
  ],
});
```

Supported steps: `createTable`, `addColumns`, `addIndexes`, `sql`.

Schema version is stored in the `_melon_meta` table.

## Relation includes (v1)

`belongsTo` includes are supported via `select.include` on queries. `hasMany` includes are rejected at validate time.

## v1 limitations

- Writes must run inside `db.write()`.
- SQLite migrations support add-column and create-table only (no drop/rename).
- `getChangedCollections` is not implemented (reserved for `@melon/sync`).

## Development

```bash
bun test
bun run typecheck
```

Shared adapter parity tests live in `__fixtures__/run-adapter-crud-vectors.ts`.
