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

```bash
# From repo root — starts Metro, then press i / a in the terminal
bun run dev:rn

# Or open iOS Simulator directly
bun run ios:rn
```

Scripts set `EXPO_OFFLINE=1` so Expo skips downloading a different Expo Go build when your simulator already has a compatible 54.x client. Metro and the app still run normally.

If you run `expo start --ios` manually and see **Install the recommended Expo Go version?**, choose **No** — Expo Go 54.0.5 works with this SDK 54 project. Choosing **Yes** can fail with `TypeError: fetch failed` when the CLI cannot reach Expo’s servers.

## What it demonstrates

- `createExpoSqliteAdapter` from `@melon/db-sqlite/expo`
- `MelonDbProvider`, `useQuery`, and `useWriter` from `@melon/db-react`
- Fluent queries via `@melon/db-query`
- Reactive task list (`FlashList`) that updates after add/complete actions

## Manual test checklist

1. App launches and shows seeded open tasks (Learn Melon, Ship playground-rn).
2. Add a task via the form — it appears in the list without refresh.
3. Tap **Done** on a task — it disappears from the open list.
4. Restart the app — persisted tasks remain (Expo SQLite file on device).

## Configuration

- **New Architecture:** enabled in `app.json` (`newArchEnabled: true`)
- **Expo SQLite plugin:** configured in `app.json`
- **Metro monorepo:** see `metro.config.js` for workspace package resolution

## Typecheck

```bash
bun run typecheck
```

(from this directory, or `bun run typecheck` from repo root)
