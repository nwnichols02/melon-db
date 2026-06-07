# @melon-db/db-codemods

WatermelonDB → Melon codemods and runtime query translator.

**Docs:** [/docs/packages/melon-db-codemods](http://localhost:3000/docs/packages/melon-db-codemods) · [Migration guide](http://localhost:3000/docs/migration)

## CLI

```bash
bun run melon-codemod migrate-queries --path=./src
bun run melon-codemod migrate-writes --path=./src
bun run melon-codemod migrate-react --path=./src
bun run melon-codemod migrate-schema --path=./src/models/Task.ts
```

Add `--dry-run` to preview without writing files. `migrate-schema` prints JSON to stdout (read-only).

## Compatibility matrix (v2)

| WatermelonDB | Melon codemod | Notes |
|--------------|---------------|-------|
| `database.get('x').query(Q.*)` | `db.collection('x').findMany(q.from(...))` | Shipped |
| `Q.and` / `Q.or` | `.and(q2 => …)` / `.or(q2 => …)` | Shipped (Phase 19) |
| `.query(...).fetch()` / `.observe()` | `.query(q.from(...).toAst()).fetch()` | Shipped (Phase 19) |
| `Q.on` (joins) | `relationFilters` when schema passed to translator | Codemod recipe if schema unknown |
| `database.write` + create/update | `db.write(tx => …)` | Shipped |
| `record.destroyPermanently` | `tx.collection(...).delete(id)` | Shipped (Phase 19) |
| `database.batch` inside write | `tx.batch(...)` | Partial — verify ops |
| `DatabaseProvider` | `MelonDbProvider` | Shipped |
| `withObservables` | Hook migration comment | Shipped (Phase 19) |
| `@field` Model class | `migrate-schema` JSON spike | Single-file extraction |

Runtime `translateWatermelonQuery(collection, clauses, schema?)` converts serializable `Q` clauses to `QueryAst`. Pass `MelonSchema` to compile `Q.on` into `relationFilters` (belongsTo only). Experimental Watermelon join tables are unsupported.

## Author & license

Copyright (c) 2026 Nate Nichols. See [LICENSE](../../LICENSE) for the full MIT license text.
