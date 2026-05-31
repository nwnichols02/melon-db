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
bun run dev:rn
```

Then press `i` for iOS Simulator or `a` for Android emulator in the Expo CLI.

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
