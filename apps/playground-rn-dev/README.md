# Melon Playground Dev (React Native)

Development-build app for dogfooding `@melon/db-sqlite-native` (native SQLite). **Not compatible with Expo Go.**

| | |
|---|---|
| SQLite (default) | `@melon/db-sqlite/rn` + `@melon/db-sqlite-native` |
| SQLite (optional) | `EXPO_PUBLIC_MELON_SQLITE=expo` → `@melon/db-sqlite/expo` |
| DB file | `melon-playground-dev.db` |
| Bundle id | `com.nate.nichols.playgroundrn.devbuild` |

For Expo Go, use [`apps/playground-rn`](../playground-rn).

## First-time setup

### iOS

From repo root:

```bash
bun install
bun run sync-server
bun run dev:rn:dev
bun run dev:rn:dev:start
```

Or from this directory:

```bash
bun run install:ios
bun run start
```

### Android

From repo root:

```bash
bun install
bun run sync-server
bun run dev:rn:dev:android
bun run dev:rn:dev:start
```

Or from this directory:

```bash
bun run install:android
bun run start
```

Open **Melon Playground (Dev)** on the simulator or emulator. Do not use Expo Go.

## Daily development

After the native app is installed once:

```bash
bun run start
```

## Manual verification

### iOS

1. App launches without native module errors.
2. Seeded tasks appear.
3. Add / complete tasks persist across restart.
4. Sync demo works against `bun run sync-server`.

### Android

1. App launches without `NOT_IMPLEMENTED` errors.
2. Seeded tasks appear.
3. Add / complete tasks persist across restart.
4. Sync demo works against `bun run sync-server`.

## Troubleshooting

**`pod install` / `melon-sqlite-native` not found** — run from `apps/playground-rn-dev/ios`:

```bash
pod install
```

The native package podspec must use `s.source = { :path => "." }` for monorepo installs (not a remote git tag).

**`No development build … is installed`** — `bun run start` only starts Metro. Run `bun run install:ios` or `install:android` first, then open **Melon Playground (Dev)** (not Expo Go).

## Typecheck

```bash
bun run typecheck
```
