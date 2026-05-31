# @melon/db-react

React hooks and provider for `@melon/db`.

## Hooks

| Hook | Description |
|------|-------------|
| `MelonDbProvider` | Injects `MelonDatabase` via context |
| `useDatabase` | Access the database instance |
| `useCollection` | Access a collection by name |
| `useQuery` | Reactive query from AST or PreparedQuery |
| `useQueryCount` | Reactive count for a query |
| `useFindMany` | Prisma-style reactive findMany |
| `useFindFirst` | Prisma-style reactive findFirst |
| `useMangoQuery` | Mango-style reactive query |
| `useWriter` | Stable `db.write` wrapper |

## Example

```tsx
import { MelonDbProvider, useFindMany, useWriter } from '@melon/db-react';

function TaskList() {
  const tasks = useFindMany('tasks', { where: { status: 'open' } });
  const write = useWriter();

  return (
    <MelonDbProvider db={db}>
      {tasks.map((task) => (
        <Text key={task.id}>{task.title}</Text>
      ))}
    </MelonDbProvider>
  );
}
```

## Development

```bash
bun test
bun run typecheck
```

Hook observe contracts are tested without React DOM in Bun.
