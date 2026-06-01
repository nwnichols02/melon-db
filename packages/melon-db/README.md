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

## Sync (Phase 12)

Enable sync when creating the database:

```ts
const db = createDatabase({
  schema,
  adapter: createInMemoryAdapter(),
  sync: {}, // respectLocalOnly defaults to true
});
```

### APIs

| Method | Description |
|--------|-------------|
| `getLocalChanges()` | Returns Watermelon-shaped `{ [collection]: { created, updated, deleted } }` from the internal outbox |
| `applyRemoteChanges(changes)` | Applies remote pull payload (server-wins default); wraps `db.write()` |
| `markLocalChangesPushed()` | Clears outbox after successful push |

Local writes inside `db.write()` are tracked in an engine-managed outbox (`_melon_sync_outbox` table on SQLite). Collections with `localOnly: true` are excluded.

Conflict policies on `applyRemoteChanges()` include `server-wins`, `client-wins`, `last-write-wins`, and `merge-by-field` (pending field patches stored in `pendingFields` on the outbox).

Use `@melon/sync` for pull/push orchestration — see [`packages/melon-sync/README.md`](../melon-sync/README.md).

## v1 limitations

- Writes must run inside `db.write()`.
- SQLite migrations support add-column and create-table only (no drop/rename).
- Sync outbox coalesces create+delete to no-op; delete after push appears as `deleted`.

## Development

```bash
bun test
bun run typecheck
```

Shared adapter parity tests live in `__fixtures__/run-adapter-crud-vectors.ts`.
