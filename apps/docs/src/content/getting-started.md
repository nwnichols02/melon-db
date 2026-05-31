# Getting started

Melon is an offline-first local database for React Native and TypeScript — a modern successor to WatermelonDB.

## Install

From the monorepo root:

```bash
bun install
bun test
```

## In-memory quick start

```ts
import { createDatabase, createInMemoryAdapter, createMelonSchema } from '@melon/db';

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

const db = createDatabase({ schema, adapter: createInMemoryAdapter() });

await db.write(async (tx) => {
  await tx.collection('tasks').insert({ id: '1', title: 'Hello' });
});
```

## SQLite (Bun / Node)

```bash
bun run demo
```

See `apps/playground-node/src/demo.ts`.

## React Native / Expo

```bash
bun run dev:rn
```

See `apps/playground-rn/README.md`.

## Sync

```bash
bun run demo:sync
bun run sync-server
```

See `@melon/sync` README for the Watermelon-compatible pull/push protocol.

## Devtools

Wire a reactive bridge and inspector panel:

```ts
import { createReactiveDevtoolsBridge } from '@melon/db-devtools';

const devtools = createReactiveDevtoolsBridge();
const db = createDatabase({ schema, adapter, devtools });
```

See the **Playground** page in this docs site for a live demo.
