# playground-node

Node/Bun examples for Melon SQLite and sync backends.

## Prerequisites

```bash
bun install   # from monorepo root
```

## Demos

| Command | Script | What it does |
|---------|--------|----------------|
| `bun run demo` | `src/demo.ts` | SQLite CRUD on local file |
| `bun run demo:sync` | `src/sync-demo.ts` | In-process sync smoke test |
| `bun run demo:sync:http` | `src/sync-http-demo.ts` | Embedded HTTP sync server + client |
| `bun run demo:sync:postgres` | `src/sync-postgres-demo.ts` | Postgres via `@melon-db/sync-server` |

From the **monorepo root**:

```bash
bun run demo
bun run demo:sync
bun run demo:sync:http
```

### Postgres

```bash
bun run postgres:up
bun run sync-server:postgres   # terminal 1
bun run demo:sync:postgres     # terminal 2
```

## Expected output (demo)

`bun run demo` should print inserted tasks and query results without throwing. You should see log lines for `findMany` / `count` style operations.

## Expected output (sync:http)

`bun run demo:sync:http` runs pull and push against an in-process server. Exit code `0` and a log showing applied changes means success.

## Docs

- [Node and Bun walkthrough](http://localhost:3000/docs/walkthroughs/node-and-bun) — run `bun run dev:docs` for the site
- [Full-stack sync](http://localhost:3000/docs/walkthroughs/full-stack-sync)
- [Sync backend contract](http://localhost:3000/docs/sync/backend)

## Author & license

Copyright (c) 2026 [Nate Nichols](https://github.com/nwnichols02). See [LICENSE](../../LICENSE) for the full MIT license text.
