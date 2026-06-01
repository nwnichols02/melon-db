# @melon/db-sqlite-native

Melon-owned SQLite native module for React Native **development builds** (JSI/TurboModule spike).

**Not available in Expo Go.** Use [`@melon/db-sqlite/expo`](../melon-db-sqlite/README.md) for Expo Go and managed workflows.

## Requirements

- React Native 0.76+ with New Architecture enabled
- `expo prebuild` or bare React Native with autolinking
- **iOS:** supported in this spike (system `sqlite3`)
- **Android:** stub only — calls reject with `NOT_IMPLEMENTED`; use expo-sqlite on Android

## Usage

Apps should not import this package directly. Use [`@melon/db-sqlite/rn`](../melon-db-sqlite/README.md):

```ts
import { createJsiSqliteAdapter, isJsiSqliteAvailable } from '@melon/db-sqlite/rn';

if (!isJsiSqliteAvailable()) {
  throw new Error('Use a development build or switch to @melon/db-sqlite/expo');
}

const adapter = createJsiSqliteAdapter({
  filename: 'app.db', // relative names resolve to iOS Documents on native open
});
```

## Development build (playground-rn-dev)

```bash
bun run dev:rn:dev
bun run dev:rn:dev:start
```

Expo Go demo: `apps/playground-rn` (`bun run dev:rn`).

## Manual iOS verification checklist

After `bun run dev:rn:dev` (or `bun run install:ios` in `apps/playground-rn-dev`):

1. App launches without native module errors.
2. Seeded tasks appear (same as expo path).
3. Add / complete tasks persist across restart.
4. Sync demo works against `bun run sync-server`.
5. Compare behavior with default expo path on the same device.

## Architecture

- iOS: `MelonSQLite` RCT native module (`ios/MelonSQLite.mm`) using `sqlite3`
- Android: `MelonSQLiteModule` stub
- JS: TurboModule spec in `src/NativeMelonSQLite.ts`
