# Sync

`@melon/sync` implements a Watermelon-compatible pull/push protocol with retry, network awareness, conflict policies, and migration-aware coordination.

## Protocol steps

| Step | Action |
|------|--------|
| Pull | `pullChanges({ lastPulledAt, schemaVersion, migration? })` → `{ changes, timestamp, schemaVersion? }` |
| Apply | `db.applyRemoteChanges(changes, { conflictPolicy })` |
| Push | `pushChanges({ changes: await db.getLocalChanges(), lastPulledAt })` |
| Ack | `db.markLocalChangesPushed()` |
| Checkpoint | `checkpointStore.setLastPulledAt(timestamp)` + `setLastSchemaVersion(version)` |

## Sync status

`synchronize()` emits:

- `idle` → `pulling` → `pushing` → `complete`
- `retrying` with `{ phase, attempt }` when pull/push retries
- `paused` with `{ reason: 'offline' }` when network monitor reports offline
- `failed` with a `SyncError` (checkpoint and outbox preserved for retry)

## Retry and cancellation

```ts
import { DEFAULT_RETRY_POLICY, synchronize } from '@melon/sync';

await synchronize({
  db,
  pullChanges,
  pushChanges,
  retryPolicy: DEFAULT_RETRY_POLICY, // or false to disable
  signal: abortController.signal,
});
```

## Conflict policies

Pass `conflictPolicy` to `synchronize()` or `MelonSyncProvider`:

- `server-wins` (default)
- `skip-existing`
- `client-wins` — skip remote apply when outbox has a pending entry
- `last-write-wins` — compare `syncTimestampField` or `_updated_at`

## Network monitor

```ts
import { createAlwaysOnlineMonitor, createMutableNetworkMonitor } from '@melon/sync';

const monitor = createMutableNetworkMonitor(true);
await synchronize({ db, pullChanges, pushChanges, networkMonitor: monitor });
```

## Migration-aware sync

When the local schema version increases, `synchronize()` sends `migration` metadata on pull and validates `pullResult.schemaVersion`:

- `migrationSyncPolicy: 'strict'` (default) — throws `SYNC_SCHEMA_MISMATCH` if server is behind
- `migrationSyncPolicy: 'lenient'` — applies compatible changes and logs a warning

## React hooks

Use `@melon/db-react`:

- `MelonSyncProvider` — supplies pull/push callbacks, retry policy, network monitor
- `useSync()` — `sync()`, `cancel()`, `isPaused`, `retryCount`, status, error
- `useSyncStatus()` — current sync state only

```tsx
<MelonSyncProvider
  pullChanges={pullChanges}
  pushChanges={pushChanges}
  retryPolicy={DEFAULT_RETRY_POLICY}
  networkMonitor={monitor}
  autoSyncOnReconnect
  conflictPolicy="last-write-wins"
>
  {children}
</MelonSyncProvider>
```

## Reference backend

```bash
bun run sync-server
```

The HTTP server exposes `POST /sync/pull` and `POST /sync/push`. Pull responses include `schemaVersion`.

## Checkpoints

For SQLite apps, use `db.createCheckpointStore()` to persist `sync_last_pulled_at` and `sync_last_schema_version` in `_melon_meta` across app restarts.

Try the **Sync playground** page for conflict policy and flaky-network demos.
