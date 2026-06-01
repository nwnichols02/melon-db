# Melon Playground (React Native)

Expo app demonstrating `@melon/db` with SQLite, fluent queries, reactive hooks, and sync.

## Requirements

- Bun (monorepo install from repo root)
- **Expo SDK 54** (matches Expo Go 54.x on device/simulator)
- Xcode (iOS Simulator) or Android Studio (emulator), or Expo Go on a device

## Quick start (Expo Go — default)

Uses **`@melon/db-sqlite/expo`** only. No custom native code. Works with Expo Go.

From the repo root:

```bash
bun install
bun run sync-server   # optional, for sync demo
bun run dev:rn
```

Do **not** set `EXPO_PUBLIC_MELON_SQLITE=jsi` for this path.

## JSI development build (optional)

Uses **`@melon/db-sqlite/rn`** + **`@melon/db-sqlite-native`**. **Not supported in Expo Go.**

```bash
cd apps/playground-rn
npx expo prebuild
EXPO_PUBLIC_MELON_SQLITE=jsi npx expo run:ios
```

From repo root: `bun run dev:rn:jsi` (runs prebuild + iOS dev build).

**iOS only** in this spike. On Android, keep the default expo-sqlite path.

If JSI is enabled in Expo Go, the app shows a clear error asking for a dev build or to unset the env flag.

## Sync

Sync requires the reference server in a second terminal:

```bash
bun run sync-server
```

Without the sync server, local CRUD still works; **Sync now** will show a failed status.

## What it demonstrates

- SQLite via expo-sqlite (default) or Melon native module (JSI flag)
- `MelonDbProvider`, `MelonSyncProvider`, `useQuery`, `useWriter`, `useSync`
- Fluent queries via `@melon/db-query`
- Reactive task list (`FlashList`)

## Configuration

- **New Architecture:** `newArchEnabled: true` in `app.config.js`
- **SQLite driver:** `EXPO_PUBLIC_MELON_SQLITE` — unset / `expo` (default) or `jsi` (dev build)
- **Metro:** `metro.config.js` resolves workspace packages

## Typecheck

```bash
bun run typecheck
```

(from this directory, or from repo root)
