# @melon/db-sqlite-native

Melon-owned SQLite native module for React Native **development builds**.

**Not available in Expo Go.** Use [`@melon/db-sqlite/expo`](../melon-db-sqlite/README.md) for Expo Go and managed workflows.

## Platform support

| Platform | Status |
|----------|--------|
| iOS (dev build) | Supported (system `sqlite3`) |
| Android (dev build) | Supported (`SQLiteDatabase`) |
| Expo Go | Not available |

## Limitations

- Bridge modules (RCT / `ReactContextBaseJavaModule`), not synchronous JSI codegen yet.
- **BLOB / `bytes` fields** are not round-tripped on the native path (returned as `null`).
- No native `observeQuery` triggers — the engine uses its change emitter fallback.

## Requirements

- React Native 0.76+ with New Architecture enabled
- `expo prebuild` or bare React Native with autolinking

## Usage

Apps should not import this package directly. Use [`@melon/db-sqlite/rn`](../melon-db-sqlite/README.md):

```ts
import { Paths } from 'expo-file-system';
import { createJsiSqliteAdapter, isJsiSqliteAvailable } from '@melon/db-sqlite/rn';

if (!isJsiSqliteAvailable()) {
  throw new Error('Use a development build or switch to @melon/db-sqlite/expo');
}

const adapter = createJsiSqliteAdapter({
  filename: 'app.db',
  basePath: Paths.document.uri.replace(/^file:\/\//, ''),
});
```

## Development build (playground-rn-dev)

```bash
# iOS
bun run dev:rn:dev
bun run dev:rn:dev:start

# Android
bun run dev:rn:dev:android
bun run dev:rn:dev:start
```

Expo Go demo: `apps/playground-rn` (`bun run dev:rn`).

Optional: `EXPO_PUBLIC_MELON_SQLITE=expo` in the dev app uses expo-sqlite instead of native.

## Manual verification checklist

### iOS

After `bun run dev:rn:dev` (or `install:ios` in `apps/playground-rn-dev`):

1. App launches without native module errors.
2. Seeded tasks appear (same as expo path).
3. Add / complete tasks persist across restart.
4. Sync demo works against `bun run sync-server`.
5. Compare behavior with `apps/playground-rn` on the same device.

### Android

After `bun run dev:rn:dev:android` then `bun run dev:rn:dev:start`:

1. App launches without `NOT_IMPLEMENTED` errors.
2. Seeded tasks appear.
3. Add / complete tasks persist across restart.
4. Sync demo works against `bun run sync-server`.

## Architecture

- iOS: `MelonSQLite` RCT module (`ios/MelonSQLite.mm`) using `sqlite3` with `sqlite3_busy_timeout`
- Android: `MelonSQLiteModule` (`android/.../MelonSQLiteModule.kt`) using `SQLiteDatabase`
- JS: bridge accessor in `src/MelonSQLiteBridge.ts` (no TurboModule JNI codegen)
