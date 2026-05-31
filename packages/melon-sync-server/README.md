# @melon/sync-server

HTTP reference backend for Watermelon-compatible Melon sync.

Depends on `@melon/sync` and `@melon/db` — no React or SQLite required.

## Quick start (in-memory)

```bash
# From monorepo root
bun run sync-server
```

Default URL: `http://localhost:8787`

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/sync/pull` | `{ lastPulledAt, schemaVersion }` | `{ changes, timestamp, schemaVersion }` |
| POST | `/sync/push` | `{ changes, lastPulledAt }` | `204` |

CORS is enabled for React Native dev (`Access-Control-Allow-Origin: *`).

## Postgres backend

Persistent storage for integration tests and backend recipes:

```bash
docker compose up -d
bun run sync-server:postgres
```

Set `DATABASE_URL` (see [`.env.example`](../../.env.example)):

```
postgres://melon:melon@localhost:5433/melon_sync
```

Start the database first:

```bash
bun run postgres:up
bun run sync-server:postgres
```

Port **5433** avoids conflicting with a system Postgres on 5432.

### SQL schema

Migration templates in [`sql/`](./sql/):

| Table | Purpose |
|-------|---------|
| `sync_meta` | Monotonic server clock (`clock` key) returned as pull timestamp |
| `sync_tasks` | Reference `tasks` collection with `server_created_at` / `server_updated_at` |
| `sync_tombstones` | Deletion tracking (`collection`, `record_id`, `deleted_at`) |

Run migrations programmatically:

```ts
import { SQL } from 'bun';
import { createPostgresSyncStore, runSyncServerMigrations } from '@melon/sync-server';

const sql = new SQL(process.env.DATABASE_URL!);
await runSyncServerMigrations({ sql });

const store = await createPostgresSyncStore(process.env.DATABASE_URL!);
```

### Backend flow

```
Client → HTTP (/sync/pull, /sync/push) → PostgresSyncStore → Postgres tables
```

Pull uses timestamp-filtered queries (created / updated / deleted since `lastPulledAt`). Push applies changes in a transaction and bumps the server clock per mutation.

## Programmatic usage

```ts
import {
  createSyncHttpServer,
  createPostgresSyncStore,
  InMemorySyncStore,
} from '@melon/sync-server';

// In-memory
const memory = createSyncHttpServer({ port: 8787 });

// Postgres
const store = await createPostgresSyncStore(process.env.DATABASE_URL!);
const postgres = createSyncHttpServer({ port: 8787, store });

// ... run clients against url ...

postgres.stop();
```

HTTP server accepts any `SyncBackend` implementation.

## React Native dev setup

1. Start the reference server on your machine:

```bash
bun run sync-server
# or with Postgres:
bun run sync-server:postgres
```

2. Start the RN app:

```bash
bun run dev:rn
```

3. Use platform-specific base URLs in the app:
   - iOS Simulator: `http://localhost:8787`
   - Android emulator: `http://10.0.2.2:8787`

See [`apps/playground-rn/README.md`](../../apps/playground-rn/README.md).

## Demos

```bash
bun run demo:sync:http       # in-memory HTTP server
bun run demo:sync:postgres   # Postgres-backed HTTP server + restart persistence
```

## v1 limitations

- Reference schema supports `tasks` collection only (extensible via `CollectionSyncConfig`)
- No auth — local dev reference only
- Migration metadata in pull args is accepted but not acted on server-side in v1

## Development

```bash
bun test
bun run typecheck
```

Postgres contract tests run when `DATABASE_URL` is set (CI provides a Postgres service).
