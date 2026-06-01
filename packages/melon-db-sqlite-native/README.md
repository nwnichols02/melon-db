# @melon/db-sqlite-native

Melon-owned SQLite native module for React Native **development builds**.

**Not available in Expo Go.** Use [`@melon/db-sqlite/expo`](../melon-db-sqlite/README.md) for Expo Go and managed workflows.

## Platform support

| Platform | Native binding | Status |
|----------|----------------|--------|
| iOS (dev build) | TurboModule codegen (`MelonSQLiteSpec`) | Supported |
| Android (dev build) | TurboModule codegen (`MelonSQLiteSpec`) | Supported |
| Expo Go | N/A | Not available |

## Limitations

- **iOS / Android:** TurboModule with async promises — not synchronous C++ JSI host objects yet.
- Android `exec()` routes `PRAGMA` through `rawQuery` (Android forbids `execSQL` for statements that return rows, e.g. `journal_mode = WAL`).
- **BLOB / `bytes` fields** are not round-tripped on the native path (returned as `null`).
- No native `observeQuery` triggers — the engine uses its change emitter fallback.

## Requirements

- React Native 0.76+ with New Architecture enabled
- `expo prebuild` or bare React Native with autolinking

## Codegen (TurboModule)

Spec: [`src/NativeMelonSQLite.ts`](src/NativeMelonSQLite.ts). Regenerate artifacts after spec changes:

```bash
cd apps/playground-rn-dev

# iOS
node node_modules/react-native/scripts/generate-codegen-artifacts.js \
  -p ../../packages/melon-db-sqlite-native \
  -t ios \
  -o ../../packages/melon-db-sqlite-native/ios/generated \
  -s library

# Android (updates android/src/main/java/com/facebook/fbreact/specs/NativeMelonSQLiteSpec.java)
node node_modules/react-native/scripts/generate-codegen-artifacts.js \
  -p ../../packages/melon-db-sqlite-native \
  -t android \
  -o ../../packages/melon-db-sqlite-native/android/build \
  -s library
```

Then run `expo prebuild --clean` in `apps/playground-rn-dev` before native builds.

Gradle also generates `android/build/generated/source/codegen/java` when `newArchEnabled=true` during app builds.

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

Inspect binding mode (turbo vs bridge):

```ts
import { getMelonSQLiteNativeMode } from '@melon/db-sqlite-native';
// 'turbo' on iOS/Android dev builds with New Architecture, 'bridge' if turbo unavailable, null in Expo Go
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
2. Runtime badge shows `native turbo (ios)`.
3. Seeded tasks appear (same as expo path).
4. Add / complete tasks persist across restart.
5. Sync demo works against `bun run sync-server`.

### Android

After `bun run dev:rn:dev:android` then `bun run dev:rn:dev:start`:

1. App launches without `NOT_IMPLEMENTED` errors.
2. Runtime badge shows `native turbo (android)`.
3. Seeded tasks appear.
4. Add / complete tasks persist across restart.
5. Sync demo works against `bun run sync-server`.

## Architecture

- **iOS:** `MelonSQLite` implements `NativeMelonSQLiteSpec` (`ios/MelonSQLite.mm`) with `NativeMelonSQLiteSpecJSI` and system `sqlite3`.
- **Android:** `MelonSQLiteModule` extends `NativeMelonSQLiteSpec` (`android/.../MelonSQLiteModule.kt`) with `SQLiteDatabase`, registered via `BaseReactPackage` + `isTurboModule`.
- **JS:** `src/MelonSQLiteBridge.ts` resolves TurboModule first, then `NativeModules` fallback.

**Phase 24+:** Optional pure C++ JSI, dedicated native DB thread.
