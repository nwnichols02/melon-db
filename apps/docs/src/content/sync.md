# Sync

`@melon/sync` implements a Watermelon-compatible pull/push protocol.

## Protocol steps

| Step | Action |
|------|--------|
| Pull | `pullChanges({ lastPulledAt, schemaVersion })` → `{ changes, timestamp }` |
| Apply | `db.applyRemoteChanges(changes)` |
| Push | `pushChanges({ changes: await db.getLocalChanges(), lastPulledAt })` |
| Ack | `db.markLocalChangesPushed()` |
| Checkpoint | `checkpointStore.setLastPulledAt(timestamp)` |

## React hooks

Use `@melon/db-react`:

- `MelonSyncProvider` — supplies pull/push callbacks
- `useSync()` — runs `synchronize()` and exposes status
- `useSyncStatus()` — current sync state

## Reference backend

```bash
bun run sync-server
```

The HTTP server exposes `POST /sync/pull` and `POST /sync/push` for local development and integration tests.

## Checkpoints

For SQLite apps, use `db.createCheckpointStore()` to persist `sync_last_pulled_at` in `_melon_meta` across app restarts.

Try the **Sync playground** page for a live in-browser demo.
