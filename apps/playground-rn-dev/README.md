# Melon Playground Dev (React Native)

Development-build app for dogfooding `@melon/db-sqlite-native` (JSI SQLite). **Not compatible with Expo Go.**

| | |
|---|---|
| SQLite | `@melon/db-sqlite/rn` + `@melon/db-sqlite-native` |
| DB file | `melon-playground-dev.db` |
| Bundle id | `com.nate.nichols.playgroundrn.devbuild` |

For Expo Go, use [`apps/playground-rn`](../playground-rn).

## First-time setup

From repo root:

```bash
bun install
bun run sync-server
bun run dev:rn:dev
```

Or from this directory:

```bash
bun run install:ios
bun run start
```

Open **Melon Playground (Dev)** on the simulator. Do not use Expo Go.

## Daily development

After the native app is installed once:

```bash
bun run start
```

## Troubleshooting

**`pod install` / `melon-sqlite-native` not found** — run from `apps/playground-rn-dev/ios`:

```bash
pod install
```

The native package podspec must use `s.source = { :path => "." }` for monorepo installs (not a remote git tag).

**`No development build … is installed`** — `bun run start` only starts Metro. Run `bun run install:ios` first, then open **Melon Playground (Dev)** on the simulator (not Expo Go).

## Typecheck

```bash
bun run typecheck
```
