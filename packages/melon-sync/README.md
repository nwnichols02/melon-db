# @melon/sync

Watermelon-compatible pull/push sync orchestrator (depends on `@melon/db` only).

Supports built-in conflict policies plus `conflictPolicy: 'custom'` with a `conflictResolver` hook (see [sync guide](http://localhost:3000/docs/sync)).

**Docs:** [/docs/packages/melon-sync](http://localhost:3000/docs/packages/melon-sync) · [API](http://localhost:3000/docs/api/melon-sync) · [Sync guide](http://localhost:3000/docs/sync)

```bash
bun test
bun run demo:sync   # from monorepo root
```

## Author & license

Copyright (c) 2026 Nate Nichols. See [LICENSE](../../LICENSE) for the full MIT license text.
