# Melon Playground (React Native)

Expo app demonstrating `@melon/db` with the Expo SQLite adapter, fluent queries, and reactive hooks.

## Requirements

- Bun (monorepo install from repo root)
- **Expo SDK 54** (matches Expo Go 54.x on device/simulator)
- Xcode (iOS Simulator) or Android Studio (emulator), or Expo Go on a device

## Setup

From the repo root:

```bash
bun install
```

Dependencies are aligned to **Expo SDK 54** via `bunx expo install --fix`. Core packages: `expo-asset`, `expo-constants`, `expo-linking`, and `react-native-gesture-handler`.

## Run

Sync requires the reference server in a second terminal:

```bash
# Terminal 1 — reference sync backend
bun run sync-server

# Terminal 2 — Expo app
bun run dev:rn

# Or open iOS Simulator directly
bun run ios:rn
```

Without the sync server, local CRUD still works; **Sync now** will show a failed status until the server is running.

Scripts set `EXPO_OFFLINE=1` so Expo skips downloading a different Expo Go build when your simulator already has a compatible 54.x client. Metro and the app still run normally.

If you run `expo start --ios` manually and see **Install the recommended Expo Go version?**, choose **No** — Expo Go 54.0.5 works with this SDK 54 project. Choosing **Yes** can fail with `TypeError: fetch failed` when the CLI cannot reach Expo’s servers.

## What it demonstrates

- `createExpoSqliteAdapter` from `@melon/db-sqlite/expo`
- `MelonDbProvider`, `MelonSyncProvider`, `useQuery`, `useWriter`, and `useSync` from `@melon/db-react`
- Manual sync against `@melon/sync-server` (`bun run sync-server`)
- Fluent queries via `@melon/db-query`
- Reactive task list (`FlashList`) that updates after add/complete actions

## Manual test checklist

1. App launches and shows seeded open tasks (Learn Melon, Ship playground-rn).
2. Add a task via the form — it appears in the list without refresh.
3. Tap **Done** on a task — it disappears from the open list.
4. Restart the app — persisted tasks remain (Expo SQLite file on device).
5. With `bun run sync-server` running, tap **Sync now** — status shows Synced; tasks sync to the reference server.
6. On a second simulator/device, tap **Sync now** after server has data — pulled tasks appear locally.

## Sync URLs

| Platform | Server URL |
|----------|------------|
| iOS Simulator | `http://localhost:8787` |
| Android emulator | `http://10.0.2.2:8787` |

## Configuration

- **New Architecture:** enabled in `app.json` (`newArchEnabled: true`)
- **Expo SQLite plugin:** configured in `app.json`
- **Metro monorepo:** see `metro.config.js` for workspace package resolution

## Typecheck

```bash
bun run typecheck
```

(from this directory, or `bun run typecheck` from repo root)
