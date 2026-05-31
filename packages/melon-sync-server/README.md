# @melon/sync-server

HTTP reference backend for Watermelon-compatible Melon sync.

Depends on `@melon/sync` and `@melon/db` — no React or SQLite required.

## Quick start

```bash
# From monorepo root
bun run sync-server
```

Default URL: `http://localhost:8787`

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/sync/pull` | `{ lastPulledAt, schemaVersion }` | `{ changes, timestamp }` |
| POST | `/sync/push` | `{ changes, lastPulledAt }` | `204` |

CORS is enabled for React Native dev (`Access-Control-Allow-Origin: *`).

## Programmatic usage

```ts
import { createSyncHttpServer, InMemorySyncStore } from '@melon/sync-server';

const { url, store, stop } = createSyncHttpServer({ port: 8787 });

// ... run clients against url ...

stop();
```

## React Native dev setup

1. Start the reference server on your machine:

```bash
bun run sync-server
```

2. Start the RN app:

```bash
bun run dev:rn
```

3. Use platform-specific base URLs in the app:
   - iOS Simulator: `http://localhost:8787`
   - Android emulator: `http://10.0.2.2:8787`

See [`apps/playground-rn/README.md`](../../apps/playground-rn/README.md).

## v1 limitations

- In-memory store only (Postgres backend deferred to Phase 14)
- Single collection name configurable (`tasks` by default)
- No auth — local dev reference only

## Development

```bash
bun test
bun run typecheck
```
