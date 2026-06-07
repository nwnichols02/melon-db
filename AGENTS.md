# Melon monorepo — agent guide

Offline-first local database for React Native and TypeScript (`@melon-db/db` family).

## Quick commands

```bash
bun install
bun test                    # all packages
bun run typecheck           # packages + apps
bun run check               # biome
bun run release:smoke        # packed-tarball consumer smoke
```

## Which app for what

| Goal | Command / app |
|------|----------------|
| In-memory / docs UI | `bun run dev:docs` → [CRUD playground](http://localhost:3000/docs/playgrounds/crud) |
| Web Vite example | `bun run dev:web` → `apps/playground-web` |
| Expo Go | `bun run dev:rn` → `apps/playground-rn` |
| Native JSI + devtools + query demos | `bun run dev:rn:dev:start` → `apps/playground-rn-dev` |
| Node SQLite | `bun run demo` → `apps/playground-node` |
| Sync HTTP / Postgres | `bun run demo:sync:http`, `bun run demo:sync:postgres` |

## Package map

- `@melon-db/db` — schema, AST, engine, in-memory adapter
- `@melon-db/db-sqlite` — SQLite (Node, Expo, native JSI)
- `@melon-db/db-query`, `@melon-db/db-query-mango`, `@melon-db/db-prisma` — query surfaces → AST
- `@melon-db/db-react` — hooks and providers
- `@melon-db/db-devtools` — bridge + inspector panel
- `@melon-db/sync`, `@melon-db/sync-server` — pull/push sync

## Docs and compliance

- Walkthroughs: `apps/docs/content/docs/walkthroughs/`
- PRD matrix: `apps/docs/content/docs/prd-compliance.mdx`
- Cursor rules: `.cursor/rules/` (including `prd-4.mdc` sliding window — **future**)
- TanStack docs editing: `.cursor/rules/melon-tanstack.mdc`
- License: [MIT](./LICENSE) · Author: Nate Nichols · Release runbook: [RELEASING.md](./RELEASING.md)

## TypeScript

- Strict mode; avoid `as` casts in package code — use type guards and generics.
- See `apps/docs/content/docs/contributing/typescript.mdx`.

## Devtools

Pass `createReactiveDevtoolsBridge()` to `createDatabase({ devtools })`. Panel shows Plan, SQL, params (SQLite), AST. Use `useMelonDevtoolsLog` only inside the panel.
