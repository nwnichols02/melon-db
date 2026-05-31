# Migrating from WatermelonDB

Use `@melon/db-codemods` for automated migration helpers.

## CLI codemods

```bash
bun run melon-codemod migrate-queries --path=./src
bun run melon-codemod migrate-writes --path=./src
bun run melon-codemod migrate-react --path=./src
```

## Runtime query translator

The compatibility layer converts serializable Watermelon `Q` clauses to Melon `QueryAst` without a WatermelonDB dependency.

## Manual migration

These patterns still require manual work:

- Join queries (`Q.on`)
- Model decorator → schema codemods
- `withObservables` HOC patterns

See the full compatibility matrix in `packages/melon-db-codemods/README.md`.

## Concept mapping

| WatermelonDB | Melon |
|--------------|-------|
| `database.get('tasks')` | `db.collection('tasks')` |
| `database.write()` | `db.write()` |
| `collection.query()` | `collection.query(ast)` or fluent builder |
| `withDatabase` / provider | `MelonDbProvider` |
| Sync pull/push | `@melon/sync` `synchronize()` |
