# @melon/db-codemods

WatermelonDB → Melon migration helpers: compatibility matrix, query translator, and CLI codemods.

## Compatibility matrix

### API mapping

| WatermelonDB | Melon |
|---|---|
| `database.get('tasks')` | `db.collection('tasks')` |
| `collection.query(Q.where(...))` | `collection.findMany(ast)` or `collection.query(ast)` |
| `collection.find(id)` | `collection.findById(id)` |
| `collection.create(fn)` / `record.update(fn)` | `db.write(tx => tx.collection(...).insert/update(...))` |
| `database.write(async () => ...)` | `db.write(async (tx) => ...)` |
| `database.batch(...)` | `tx.batch([...])` inside `db.write` |
| `DatabaseProvider` | `MelonDbProvider` |
| `useDatabase()` from `@nozbe/watermelondb/react` | `useDatabase()` from `@melon/db-react` |
| `appSchema({ version, tables: [...] })` | `createMelonSchema({ version, collections: {...} })` |

### Query operator parity

| Watermelon `Q.*` | Melon `QueryOperator` | v1 translator |
|---|---|---|
| `Q.eq` | `eq` | yes |
| `Q.notEq` | `neq` | yes |
| `Q.gt` / `Q.gte` / `Q.lt` / `Q.lte` | `gt` / `gte` / `lt` / `lte` | yes |
| `Q.like` | `like` | yes |
| `Q.oneOf` | `in` | yes |
| `Q.notIn` | `notIn` | yes |
| `Q.and` / `Q.or` | `and` / `or` nodes | yes (runtime translator) |
| `Q.sortBy(f, Q.desc)` | `orderBy: [{ field, direction }]` | yes |
| `Q.skip` / `Q.take` | `skip` / `limit` | yes |
| `Q.where(field, Q.notEq(null))` | `neq null` | yes |
| `Q.on(...)` (joins) | N/A | **unsupported** |
| `Q.experimentalJoinTables` | N/A | **unsupported** |

### Manual migration checklist (unsupported in v1)

- Model decorators (`@field`, `@relation`) → `createMelonSchema` collections
- `Q.on` / join queries → belongsTo includes or app-level filtering
- `withObservables` HOCs → `@melon/db-react` hooks (`useQuery`, `useFindMany`)
- Complex `@writer` / `prepareCreate` batch flows → explicit `tx.batch([...])`
- Sync setup → deferred to `@melon/sync` (Phase 12+)

## Runtime query translator

Translate serializable Watermelon Q clauses to Melon `QueryAst` (no WatermelonDB runtime dependency):

```ts
import { translateWatermelonQuery } from '@melon/db-codemods';

const ast = translateWatermelonQuery('tasks', [
  { type: 'where', field: 'status', value: 'open' },
  { type: 'sortBy', field: 'priority', direction: 'desc' },
  { type: 'take', count: 20 },
]);

const rows = await db.collection('tasks').findMany(ast);
```

## CLI codemods

From the monorepo root:

```bash
bun run melon-codemod migrate-queries --path=./src
bun run melon-codemod migrate-writes --path=./src
bun run melon-codemod migrate-react --path=./src
```

Options:

- `--dry-run` — report changes without writing files
- `--db-var=db` — target Melon database variable name (default `db`)
- `--source-var=database` — Watermelon database variable to replace (default `database`)

Skip a file by adding `@melon-codemod-ignore` anywhere in the file.

### migrate-queries

Transforms `database.get('tasks').query(Q.where(...))` into fluent builder `findMany` calls.

### migrate-writes

Transforms `database.write(async () => ...)` and simple `create`/`update` callbacks.

Complex create/update callbacks receive a `// TODO(melon-codemod): manual migration` warning instead of broken output.

### migrate-react

Swaps `@nozbe/watermelondb/react` imports and `DatabaseProvider` → `MelonDbProvider`.

## Deferred

- Model/schema codemods
- `withObservables` → hooks codemod
- `Q.on` join translation
