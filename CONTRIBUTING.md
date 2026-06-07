# Contributing to Melon

Thank you for helping improve Melon. This monorepo uses [Bun](https://bun.sh/) workspaces.

## Prerequisites

- [Bun](https://bun.sh/) (latest stable)
- For React Native work: Xcode / Android SDK as in [React Native (JSI) walkthrough](https://github.com/nwnichols02/melon/blob/main/apps/docs/content/docs/walkthroughs/react-native-jsi.mdx) (paths may vary once docs are hosted)

## Setup

```bash
git clone https://github.com/nwnichols02/melon.git
cd melon
bun install
```

## Checks before a PR

```bash
bun test
bun run typecheck
bun run check          # Biome lint/format
```

For docs changes:

```bash
bun run build:docs
```

For release-related changes:

```bash
bun run release:sync-metadata
bun run build:packages
bun run pack:packages
bun run release:smoke
```

See [RELEASING.md](./RELEASING.md) for the public alpha checklist.

## Package boundaries

- `@melon/db` must not import other `@melon/*` packages except `@melon/db-query` (collection query bridge).
- Query layers compile to AST; adapters only see `PreparedQuery`.
- See `.cursor/rules/file-layout.mdc` and [PRD compliance](apps/docs/content/docs/prd-compliance.mdx).

## TypeScript

- Strict mode; avoid `as` casts in `packages/melon-db*` — use type guards and generics.
- See `apps/docs/content/docs/contributing/typescript.mdx`.

## Commits and PRs

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(db): add example
fix(sync): prevent duplicate push
docs: update getting started
```

Keep PRs focused. Update docs and `prd-compliance.mdx` when behavior or PRD status changes.

## Code of conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
