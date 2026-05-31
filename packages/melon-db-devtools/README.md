# @melon/db-devtools

Query, write, subscription, and sync inspector for Melon local databases.

## Bridge

```ts
import { createReactiveDevtoolsBridge } from '@melon/db-devtools';
import { createDatabase, createInMemoryAdapter } from '@melon/db';

const devtools = createReactiveDevtoolsBridge();
const db = createDatabase({ schema, adapter: createInMemoryAdapter(), devtools });
```

`createReactiveDevtoolsBridge()` ring-buffers events and exposes `subscribe()` for React panels.

Other factories:

- `createMemoryDevtoolsBridge()` — append-only log for tests
- `createNoopDevtoolsBridge()` — zero-cost no-op

## React panel

```tsx
import { MelonDevtoolsProvider, MelonDevtoolsPanel } from '@melon/db-devtools/react';

<MelonDbProvider db={db}>
  <MelonDevtoolsProvider bridge={devtools}>
    <YourApp />
    <MelonDevtoolsPanel />
  </MelonDevtoolsProvider>
</MelonDbProvider>
```

Tabs: **Queries** (AST + SQL), **Writes**, **Sync**, **Subs**, **Errors**.

On React Native, the panel renders as a dev-only floating button + modal (`__DEV__` gate).

## Sync events

When `db.devtools.emitSync` is wired and sync runs via `MelonSyncProvider`, the Sync tab records pull → apply → push → checkpoint → complete phases (or `failed` with error metadata).

## Development

```bash
bun test
bun run typecheck
```

See `apps/docs` for a live web playground with the panel embedded.
