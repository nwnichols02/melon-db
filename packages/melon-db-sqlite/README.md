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
bun run bench   # from monorepo root
```
