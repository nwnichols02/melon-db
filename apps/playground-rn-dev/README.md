# Melon Playground Dev (React Native)

Development-build app for dogfooding `@melon/db-sqlite-native` (native SQLite). **Not compatible with Expo Go.**

| | |
|---|---|
| SQLite (default) | `@melon/db-sqlite/rn` + `@melon/db-sqlite-native` |
| SQLite (optional) | `EXPO_PUBLIC_MELON_SQLITE=expo` → `@melon/db-sqlite/expo` |
| Benchmarks | Melon native modes + optional `@nozbe/watermelondb` on-device compare |
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
5. **Benchmarks:** **Run jsi-sync + Watermelon** @ 10k completes → **Share JSON report** includes `melonVsWdb` parity and five scenarios per engine.

### Android

1. App launches without `NOT_IMPLEMENTED` errors.
2. Seeded tasks appear.
3. Add / complete tasks persist across restart.
4. Sync demo works against `bun run sync-server`.
5. **Benchmarks:** same as iOS — **Run jsi-sync + Watermelon** @ 10k, share JSON.

Bench runs use separate `melon-bench-*.db` and `melon-bench-wdb-*.db` files under the app documents directory; the main `melon-playground-dev.db` is untouched.

**WatermelonDB benchmarks** require native linking via `@morrowdigital/watermelondb-expo-plugin`. After adding or updating that plugin, re-run `bun run install:ios` or `install:android` (prebuild) before using **Run WatermelonDB** or **Run jsi-sync + Watermelon**.

## Troubleshooting

**`pod install` / `melon-sqlite-native` not found** — run from `apps/playground-rn-dev/ios`:

```bash
pod install
```

The native package podspec must use `s.source = { :path => "." }` for monorepo installs (not a remote git tag).

**`No development build … is installed`** — `bun run start` only starts Metro. Run `bun run install:ios` or `install:android` first, then open **Melon Playground (Dev)** (not Expo Go).

## Walkthroughs

- [React Native (JSI)](/docs/walkthroughs/react-native-jsi) — query demos, devtools, benchmarks
- [Query surfaces](/docs/walkthroughs/query-surfaces) — fluent, Mango, Prisma-style on the Demos screen

Run the docs site from the repo root: `bun run dev:docs`.

## Typecheck

```bash
bun run typecheck
```

## Author & license

Copyright (c) 2026 [Nate Nichols](https://github.com/nwnichols02). See [LICENSE](../../LICENSE) for the full MIT license text.
