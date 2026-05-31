# @melon/sync

Watermelon-compatible sync orchestrator for Melon local databases.

Depends only on `@melon/db` — no React, SQLite, or query packages required.

## Quick start

```ts
import { createDatabase, createInMemoryAdapter, createMelonSchema } from '@melon/db';
import { createMemoryCheckpointStore, synchronize } from '@melon/sync';

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
});
```

## Persistent checkpoints

For SQLite-backed apps, use the meta-table checkpoint store:

```ts
import { createMetaCheckpointStore, SYNC_LAST_PULLED_AT_KEY } from '@melon/sync';

// After db is initialized with sync enabled:
const checkpointStore = db.createCheckpointStore();
// Uses adapter.meta (_melon_meta) when available, else in-memory fallback
```

Or wire manually:

```ts
import { createMetaCheckpointStore } from '@melon/sync';

const checkpointStore = createMetaCheckpointStore(adapter.meta!);
```

Checkpoint key: `sync_last_pulled_at` in `_melon_meta`.

## Protocol

`@melon/sync` follows the WatermelonDB sync contract:

| Step | Action |
|------|--------|
| Pull | `pullChanges({ lastPulledAt, schemaVersion })` → `{ changes, timestamp }` |
| Apply | `db.applyRemoteChanges(changes)` (server-wins by default) |
| Push | `pushChanges({ changes: await db.getLocalChanges(), lastPulledAt })` |
| Ack | `db.markLocalChangesPushed()` |
| Checkpoint | `checkpointStore.setLastPulledAt(timestamp)` |

## Sync status

`synchronize()` emits status transitions via `onStatusChange`:

- `idle` → `pulling` → `pushing` → `complete`
- On failure: `failed` with a `SyncError` (checkpoint and outbox preserved for retry)

## Reference HTTP backend

Use `@melon/sync-server` for local dev and integration tests:

```bash
bun run sync-server
```

See [`packages/melon-sync-server/README.md`](../melon-sync-server/README.md).

## Demos

From the monorepo root:

```bash
bun run demo:sync        # in-process mock server
bun run demo:sync:http   # HTTP reference server
```

## React hooks

Use `@melon/db-react` for `MelonSyncProvider`, `useSync`, and `useSyncStatus`.

## v1 limitations

- Default conflict policy: server-wins on pull
- No migration-aware sync (Phase 14)
- No retry queue / network hooks (Phase 14)

## Development

```bash
bun test
bun run typecheck
```
