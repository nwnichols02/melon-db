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
  pullChanges: async ({ lastPulledAt, schemaVersion }) => {
    // Call your backend — return Watermelon-shaped changes + timestamp
    return { changes: {}, timestamp: Date.now() };
  },
  pushChanges: async ({ changes, lastPulledAt }) => {
    // Send local changes to your backend
  },
  checkpointStore: createMemoryCheckpointStore(),
});
```

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

## Demo

From the monorepo root:

```bash
bun run demo:sync
```

See [`apps/playground-node/src/sync-demo.ts`](../../apps/playground-node/src/sync-demo.ts).

## v1 limitations

- Default conflict policy: server-wins on pull
- Checkpoint store: in-memory only (SQLite persistence in Phase 13)
- No React hooks (`useSync` deferred to Phase 13)
- No reference backend (`@melon/sync-server` deferred to Phase 13)

## Development

```bash
bun test
bun run typecheck
```
