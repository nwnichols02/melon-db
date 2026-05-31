# @melon/db-react

React hooks and provider for `@melon/db`.

## Hooks

| Hook | Description |
|------|-------------|
| `MelonDbProvider` | Injects `MelonDatabase` via context |
| `MelonSyncProvider` | Injects sync backend, retry policy, network monitor |
| `useDatabase` | Access the database instance |
| `useCollection` | Access a collection by name |
| `useQuery` | Reactive query from AST or PreparedQuery |
| `useQueryCount` | Reactive count for a query |
| `useFindMany` | Prisma-style reactive findMany |
| `useFindFirst` | Prisma-style reactive findFirst |
| `useMangoQuery` | Mango-style reactive query |
| `useWriter` | Stable `db.write` wrapper |
| `useSync` | Run sync, cancel, retry count, paused state |
| `useSyncStatus` | Current sync status only |
| `createFetchNetworkMonitor` | Optional fetch-based network monitor |

## Example

```tsx
import {
  MelonDbProvider,
  MelonSyncProvider,
  useFindMany,
  useSync,
  useWriter,
} from '@melon/db-react';
import { DEFAULT_RETRY_POLICY } from '@melon/sync';

function TaskList() {
  const tasks = useFindMany('tasks', { where: { status: 'open' } });
  const write = useWriter();
  const { sync, cancel, status, isSyncing, isPaused, retryCount } = useSync();

  return (
    <>
      <Button disabled={isSyncing} onPress={() => void sync()} title="Sync" />
      <Button disabled={!isSyncing} onPress={cancel} title="Cancel" />
      <Text>
        {isPaused ? 'Paused (offline)' : status.status}
        {retryCount > 0 ? ` retry ${retryCount}` : ''}
      </Text>
      {tasks.map((task) => (
        <Text key={task.id}>{task.title}</Text>
      ))}
    </>
  );
}

export function App({ db, syncBackend, networkMonitor }) {
  return (
    <MelonDbProvider db={db}>
      <MelonSyncProvider
        pullChanges={syncBackend.pullChanges}
        pushChanges={syncBackend.pushChanges}
        retryPolicy={DEFAULT_RETRY_POLICY}
        networkMonitor={networkMonitor}
        autoSyncOnReconnect
        conflictPolicy="last-write-wins"
      >
        <TaskList />
      </MelonSyncProvider>
    </MelonDbProvider>
  );
}
```

`MelonSyncProvider` defaults to `db.createCheckpointStore()` when no `checkpointStore` prop is passed.

## Development

```bash
bun test
bun run typecheck
```

Hook observe contracts are tested without React DOM in Bun.
