# @melon/db-react

React hooks and provider for `@melon/db`.

## Hooks

| Hook | Description |
|------|-------------|
| `MelonDbProvider` | Injects `MelonDatabase` via context |
| `MelonSyncProvider` | Injects sync backend + checkpoint store |
| `useDatabase` | Access the database instance |
| `useCollection` | Access a collection by name |
| `useQuery` | Reactive query from AST or PreparedQuery |
| `useQueryCount` | Reactive count for a query |
| `useFindMany` | Prisma-style reactive findMany |
| `useFindFirst` | Prisma-style reactive findFirst |
| `useMangoQuery` | Mango-style reactive query |
| `useWriter` | Stable `db.write` wrapper |
| `useSync` | Run sync + expose status, error, lastPulledAt |
| `useSyncStatus` | Current sync status only |

## Example

```tsx
import {
  MelonDbProvider,
  MelonSyncProvider,
  useFindMany,
  useSync,
  useWriter,
} from '@melon/db-react';

function TaskList() {
  const tasks = useFindMany('tasks', { where: { status: 'open' } });
  const write = useWriter();
  const { sync, status, isSyncing } = useSync();

  return (
    <>
      <Button disabled={isSyncing} onPress={() => void sync()} title="Sync" />
      <Text>{status.status}</Text>
      {tasks.map((task) => (
        <Text key={task.id}>{task.title}</Text>
      ))}
    </>
  );
}

export function App({ db, syncBackend }) {
  return (
    <MelonDbProvider db={db}>
      <MelonSyncProvider
        pullChanges={syncBackend.pullChanges}
        pushChanges={syncBackend.pushChanges}
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
