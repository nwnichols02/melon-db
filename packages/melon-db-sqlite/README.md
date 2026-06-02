# @melon/db-sqlite

SQLite `StorageAdapter` for Bun, Node (`better-sqlite3`), Expo, and optional JSI native.

**Docs:** [/docs/packages/melon-db-sqlite](http://localhost:3000/docs/packages/melon-db-sqlite) · [API](http://localhost:3000/docs/api/melon-db-sqlite)

## Exports

| Entry | Runtime | Expo Go |
|-------|---------|---------|
| `@melon/db-sqlite` | Bun (`bun:sqlite`) | — |
| `@melon/db-sqlite/node` | Node + `better-sqlite3` | — |
| `@melon/db-sqlite/expo` | React Native + `expo-sqlite` | **Yes** |
| `@melon/db-sqlite/rn` | RN + `@melon/db-sqlite-native` | **No** (dev build only) |
| `@melon/db-sqlite/bench` | Shared benchmark scenarios (Node + RN) | — |

## Expo Go (default)

```ts
import { createExpoSqliteAdapter } from '@melon/db-sqlite/expo';
import * as SQLite from 'expo-sqlite';

const database = await SQLite.openDatabaseAsync('app.db');
const adapter = createExpoSqliteAdapter({ database });
```

## JSI native (development build)

```ts
import { createJsiSqliteAdapter, isJsiSqliteAvailable } from '@melon/db-sqlite/rn';

if (isJsiSqliteAvailable()) {
  const adapter = createJsiSqliteAdapter({
    filename: 'app.db',
    basePath: documentDirectory,
  });
}
```

Requires [`@melon/db-sqlite-native`](../melon-db-sqlite-native/README.md) linked via `expo prebuild` / `expo run:ios`.

## Scripts

```bash
bun test
bun run bench           # from monorepo root — Melon-only harness
bun run bench:compare   # Melon vs WatermelonDB parity (dev deps)
```

On-device: `apps/playground-rn-dev` → **Benchmarks** (`/benchmark`, `__DEV__` only) runs `melon-jsi-sync` vs `melon-turbo` using this package’s bench scenarios.

## Reactive queries (`observeQuery`)

All SQLite adapters set `capabilities.reactiveSubscriptions: true` and implement **`observeQuery`**.

- Subscriptions dedupe by compiled query fingerprint.
- After each write, only subscriptions whose WHERE clause can be affected by the changed row are notified (predicate-aware invalidation).
- Queries with `orderBy` / `limit` / `skip` invalidate when WHERE matches (v1 may over-invalidate vs perfect top-N detection).
- Per-table SQLite triggers write to `_melon_observation_events` (foundation for future external-write detection).
- In-memory adapter still uses engine ChangeEmitter (collection-wide invalidation).

## Comparison with WatermelonDB

`bench:compare` runs the same scenarios as `bench` for **melon-node** (`better-sqlite3`) and **WatermelonDB** (`@nozbe/watermelondb` on the Node SQLite adapter), plus optional **melon-bun** (`bun:sqlite`) for reference.

```bash
bun run bench:compare --scale=10k
bun run bench:compare --scale=10k --json
```

Example parity table:

```text
scenario            melon-node  watermelon     ratio      winner
row-insert             4200ms      5100ms      0.82       melon
```

See [/docs/performance-comparison](http://localhost:3000/docs/performance-comparison) (methodology) and [/docs/performance-comparison/latest-results](http://localhost:3000/docs/performance-comparison/latest-results) (committed timings). Compare legs use **better-sqlite3@12.10.0** (workspace devDependency; install with root `bun install` and `trustedDependencies`). The harness starts with **Bun**; melon-node/watermelon run in a **Node** subprocess when Bun cannot load the native addon.
