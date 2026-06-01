# Melon Playground (React Native)

Expo app demonstrating `@melon/db` with SQLite, fluent queries, reactive hooks, and sync.

Two **isolated environments** — each has its own env file, scripts, app id, and database file. See [`env/README.md`](env/README.md).

## Environment A: Expo Go (default)

**Purpose:** Fast iteration in Expo Go with `expo-sqlite` only. No custom native code.

| | |
|---|---|
| Env file | [`env/.env.expo-go`](env/.env.expo-go) |
| SQLite | `@melon/db-sqlite/expo` |
| DB file | `melon-playground.db` |
| App name | Melon Playground |

From repo root:

```bash
bun install
bun run sync-server   # optional
bun run dev:rn        # alias for dev:rn:expo-go
```

Or from this directory:

```bash
bun run start:expo-go
```

Do **not** use `env/.env.development-build` or run `prebuild:dev` for this workflow.

## Environment B: Development build (JSI)

**Purpose:** Dogfood `@melon/db-sqlite-native` on a custom iOS/Android binary. **Not compatible with Expo Go.**

| | |
|---|---|
| Env file | [`env/.env.development-build`](env/.env.development-build) |
| SQLite | `@melon/db-sqlite/rn` + native module |
| DB file | `melon-playground-dev.db` |
| App name | Melon Playground (Dev) |
| Bundle id | `com.nate.nichols.playgroundrn.devbuild` |

From repo root:

```bash
bun run dev:rn:dev-build
```

Or one shot (from `apps/playground-rn`):

```bash
bun run install:dev-build
```

After the first native build, Metro only:

```bash
bun run start:dev-build
```

Open the **Melon Playground (Dev)** app on the simulator — do not use Expo Go. Pressing **`i`** in Metro only works after `run:ios:dev` has installed that app.

If you see `No development build … is installed`, run `prebuild:dev` then `run:ios:dev` again (see [`env/README.md`](env/README.md)).

**iOS** is supported for JSI in this spike. On Android, use Environment A until native Android ships.

## Sync

```bash
bun run sync-server
```

## Typecheck

```bash
bun run typecheck
```
