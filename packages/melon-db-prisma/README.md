# @melon/db-prisma

Prisma-schema import and Prisma-like local client facade over `@melon/db`.

## Runtime client

```ts
import { createDatabase, createInMemoryAdapter } from '@melon/db';
import { createPrismaLikeClient } from '@melon/db-prisma';

const db = createDatabase({ schema, adapter: createInMemoryAdapter() });
const client = createPrismaLikeClient(db);

await client.tasks.findMany({ where: { status: 'open' } });
```

## CLI

From the repo root:

```bash
# Import schema.prisma → JSON (debug)
bun run melon-prisma import --schema=./schema.prisma

# Generate typed local client
bun run melon-prisma generate --schema=./schema.prisma --out=./generated/melon

# Optional hook re-exports
bun run melon-prisma generate --schema=./schema.prisma --out=./generated/melon --emit-hooks
```

## Supported Prisma subset (v1)

- `datasource db { provider = "sqlite" }` (url lines are stripped for Prisma 7 compatibility)
- Scalar fields: `String`, `Int`, `Float`, `Boolean`, `DateTime`, `Json`, `Bytes`
- `@id`, `@unique`, `@updatedAt`
- Relations: `@relation` one-to-many / many-to-one → `belongsTo` / `hasMany`

Not supported: enums (mapped to string), views, multi-schema, `@db.*` overrides, remote Prisma engine.

## Development

```bash
bun test
bun run typecheck
```

Sample schema: `__fixtures__/sample.schema.prisma`.
