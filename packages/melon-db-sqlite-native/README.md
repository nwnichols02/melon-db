# @melon/db-sqlite-native

Melon-owned SQLite native module for React Native **development builds**.

**Not available in Expo Go.** Use [`@melon/db-sqlite/expo`](../melon-db-sqlite/README.md) for Expo Go and managed workflows.

## Platform support

| Platform | Native binding | Status |
|----------|----------------|--------|
| iOS (dev build) | Sync C++ JSI (`global.melonSqliteJsi`) + TurboModule fallback | Supported |
| Android (dev build) | TurboModule codegen (`MelonSQLiteSpec`) | Supported |
| Expo Go | N/A | Not available |

## RN SQLite paths

| Path | Export | Binding |
|------|--------|---------|
| Expo Go (default) | `@melon/db-sqlite/expo` | expo-sqlite async |
| Dev build (fast, iOS) | `@melon/db-sqlite/rn` + `mode: 'auto'` | Sync C++ JSI + dedicated DB queue |
| Dev build (legacy) | `@melon/db-sqlite/rn` + `mode: 'turbo'` | Async TurboModule promises |

## Limitations

- **Sync C++ JSI is iOS-only** today. Android uses async TurboModule (`mode: 'auto'` falls back to turbo on Android).
- Android `exec()` routes `PRAGMA` through `rawQuery` (Android forbids `execSQL` for statements that return rows, e.g. `journal_mode = WAL`).
- **BLOB / `bytes` fields** are not round-tripped on the native path (returned as `null`).
- No native `observeQuery` triggers — the engine uses its change emitter fallback.
- Sync JSI calls block the JS thread until the native DB queue completes (intentional for throughput; keep queries bounded).

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
  mode: 'auto', // prefers sync JSI on iOS when installed
});
```

Inspect binding mode:

```ts
import { getMelonSQLiteNativeMode } from '@melon/db-sqlite-native';
// 'jsi-sync' on iOS when C++ host object installed
// 'turbo' on Android or when forcing async path
// null in Expo Go
```

Force async TurboModule for A/B comparison:

```bash
EXPO_PUBLIC_MELON_SQLITE=turbo bun run dev:rn:dev:start
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
2. Runtime badge shows `native jsi-sync (ios)` (or `native turbo (ios)` when `EXPO_PUBLIC_MELON_SQLITE=turbo`).
3. Seeded tasks appear (same as expo path).
4. Add / complete tasks persist across restart.
5. Sync demo works against `bun run sync-server`.
6. Optional perf: insert 10k tasks and compare jsi-sync vs turbo on the same device.

### Android

After `bun run dev:rn:dev:android` then `bun run dev:rn:dev:start`:

1. App launches without `NOT_IMPLEMENTED` errors.
2. Runtime badge shows `native turbo (android)`.
3. Seeded tasks appear.
4. Add / complete tasks persist across restart.
5. Sync demo works against `bun run sync-server`.

## Architecture

- **iOS (fast path):** `cpp/MelonSQLiteHostObject.cpp` installs `global.melonSqliteJsi` — sync JSI host object with SQLite on a dedicated serial dispatch queue. Installed from `MelonSQLite.mm` during TurboModule init.
- **iOS / Android (fallback):** `MelonSQLite` TurboModule (`MelonSQLiteSpec` codegen) with async promises.
- **Android:** `MelonSQLiteModule` extends `NativeMelonSQLiteSpec` with `SQLiteDatabase`.
- **JS:** `MelonSQLiteJsi.ts` reads sync host object; `MelonSQLiteBridge.ts` reports `jsi-sync` | `turbo` | `bridge`.

**Phase 26+:** Android C++ JSI parity; native `observeQuery` triggers.
