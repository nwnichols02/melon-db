# playground-web

Browser example for Melon using the **in-memory** adapter (no web SQLite in v1).

## Run

From the monorepo root:

```bash
bun install
bun run dev:web
```

Open http://localhost:5174

## Features

- CRUD inside `db.write()`
- Fluent query via `useFluentQuery`
- `@melon-db/db-devtools` panel (Plan, AST; SQL when using SQLite adapters)

See [Web walkthrough](/docs/walkthroughs/web-local) on the docs site (`bun run dev:docs`).

## Author & license

Copyright (c) 2026 [Nate Nichols](https://github.com/nwnichols02). See [LICENSE](../../LICENSE) for the full MIT license text.
