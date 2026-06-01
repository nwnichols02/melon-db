# Melon Playground (React Native — Expo Go)

Expo Go app demonstrating `@melon/db` with `expo-sqlite`, fluent queries, reactive hooks, and sync.

| | |
|---|---|
| SQLite | `@melon/db-sqlite/expo` |
| DB file | `melon-playground.db` |
| Runs in | **Expo Go only** (no custom native code) |

For JSI / development builds, use [`apps/playground-rn-dev`](../playground-rn-dev).

## Run

From repo root:

```bash
bun install
bun run sync-server
bun run dev:rn
```

Or from this directory:

```bash
bun run start
```

Scan the QR code with **Expo Go** on your device or simulator.

## Typecheck

```bash
bun run typecheck
```
