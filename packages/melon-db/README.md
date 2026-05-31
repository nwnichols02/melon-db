# @melon/db

Core storage engine for Melon: schema metadata, query AST, adapter contract, runtime (`MelonDatabase`), and in-memory adapter.

## Architecture

```
Schema (createMelonSchema)
    → QueryAst / PreparedQuery (validate → plan → prepare)
    → StorageAdapter (find / count / write)
    → MelonDatabase + MelonCollection + MelonQueryHandle
```

## v1 limitations

- Writes must run inside `db.write()` — direct `collection.insert()` throws outside a writer.
- No schema migrations yet (version field is metadata only).
- Relation `select.include` is rejected at validate time.
- `getChangedCollections` is not implemented (reserved for `@melon/sync`).

## Development

```bash
bun test
bun run typecheck
```

Shared adapter parity tests live in `__fixtures__/run-adapter-crud-vectors.ts` and are run by both in-memory and `@melon/db-sqlite` tests.
