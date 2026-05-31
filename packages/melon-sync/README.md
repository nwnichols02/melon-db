# @melon/sync

Watermelon-compatible sync orchestrator for Melon local databases.

Depends only on `@melon/db` — no React, SQLite, or query packages required.

## Quick start

```ts
import { createDatabase, createInMemoryAdapter, createMelonSchema } from '@melon/db';
import {
  createMemoryCheckpointStore,
  DEFAULT_RETRY_POLICY,
  synchronize,
} from '@melon/sync';

const schema = createMelonSchema({
  version: 1,
  collections: {
    tasks: {
      name: 'tasks',
      primaryKey: 'id',
      fields: { id: { kind: 'string' }, title: { kind: 'string' } },
    },
  },
});

const db = createDatabase({
  schema,
  adapter: createInMemoryAdapter(),
  sync: {}, // enables getLocalChanges / applyRemoteChanges
});

await synchronize({
  db,
  pullChanges: async (args) => /* backend pull */,
  pushChanges: async (args) => /* backend push */,
  checkpointStore: createMemoryCheckpointStore(),
  retryPolicy: DEFAULT_RETRY_POLICY,
});
```

## Retry and cancellation

```ts
await synchronize({
  db,
  pullChanges,
  pushChanges,
  retryPolicy: DEFAULT_RETRY_POLICY, // maxAttempts: 3, exponential backoff
  signal: abortController.signal,
});
```

Set `retryPolicy: false` to disable automatic retries.

## Network monitor

```ts
import { createMutableNetworkMonitor } from '@melon/sync';

const monitor = createMutableNetworkMonitor(true);
await synchronize({ db, pullChanges, pushChanges, networkMonitor: monitor });
```

When offline, sync emits `paused` and throws `SYNC_OFFLINE` (retryable).

## Conflict policies

Pass `conflictPolicy` to `synchronize()`:

- `server-wins` (default)
- `skip-existing`
- `client-wins`
- `last-write-wins` (optional `syncTimestampField`)

## Migration-aware sync

```ts
await synchronize({
  db,
  pullChanges,
  pushChanges,
  migrations: dbMigrations,
  migrationSyncPolicy: 'strict', // or 'lenient'
});
```

Checkpoint store also persists `sync_last_schema_version` when using meta storage.

## Persistent checkpoints

For SQLite-backed apps, use the meta-table checkpoint store:

```ts
const checkpointStore = db.createCheckpointStore();
```

Keys in `_melon_meta`: `sync_last_pulled_at`, `sync_last_schema_version`.

## Protocol

| Step | Action |
|------|--------|
| Pull | `pullChanges({ lastPulledAt, schemaVersion, migration? })` → `{ changes, timestamp, schemaVersion? }` |
| Apply | `db.applyRemoteChanges(changes, { conflictPolicy })` |
| Push | `pushChanges({ changes, lastPulledAt })` |
| Ack | `db.markLocalChangesPushed()` |
| Checkpoint | `setLastPulledAt` + `setLastSchemaVersion` |

## Sync status

- `idle` → `pulling` → `pushing` → `complete`
- `retrying` with `{ phase, attempt }` on pull/push retries
- `paused` when offline
- `failed` with `SyncError` (checkpoint and outbox preserved)

## Reference HTTP backend

```bash
bun run sync-server
```

See [`packages/melon-sync-server/README.md`](../melon-sync-server/README.md).

## React hooks

Use `@melon/db-react` for `MelonSyncProvider`, `useSync`, and `useSyncStatus`.

## v1 limitations

- No Postgres reference backend (Phase 16)
- No merge-by-field conflict resolver
- No background sync service

## Development

```bash
bun test
bun run typecheck
```
