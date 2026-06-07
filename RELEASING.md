# Releasing Melon (alpha)

Runbook for publishing `@melon/*` packages to npm and making the GitHub repository public.

## Author & license

- **Author:** Nate Nichols (`nwnichols02@gmail.com`)
- **License:** [MIT](./LICENSE)
- **Repository:** https://github.com/nwnichols02/melon

Publish metadata is centralized in [`tooling/release/metadata.ts`](./tooling/release/metadata.ts). Run `bun tooling/release/sync-package-json.ts` after changing version or repository fields.

## Pre-flight checklist (GitHub public alpha)

### Repository hygiene

- [ ] Confirm no secrets in git history (`git log -p` spot-check, secret scanning enabled on GitHub)
- [ ] `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md` present at repo root
- [ ] Root and package READMEs include **Author & license** sections
- [ ] All `@melon/*` `package.json` files have `author`, `license`, `repository`, `homepage`, `bugs`, and `"publishConfig": { "access": "public" }`
- [ ] Repository visibility set to **public**
- [ ] Default branch protected (require CI, no force-push to `main`)

### npm

- [ ] npm org `@melon` exists; maintainers use 2FA
- [ ] `NPM_TOKEN` stored in GitHub Actions secrets (Automation token or trusted publish token)
- [ ] Packages not yet published: run first publish manually or via workflow with `dry_run: false`

### CI / quality gates

From repo root:

```bash
bun install
bun test
bun run typecheck
bun run check
bun run build:packages
bun tooling/release/validate-exports.ts
bun run release:smoke
bun audit --audit-level=high
```

### Metadata sync

```bash
bun tooling/release/sync-package-json.ts
bun tooling/release/sync-readme-footers.ts
bun tooling/release/sync-docs-footers.ts
```

Commit any generated `package.json` / README updates before publishing.

## Publish workflow

### Local (maintainers)

```bash
export NPM_TOKEN=...
bun run build:packages
bun tooling/release/sync-package-json.ts
bun run release:smoke
bun tooling/release/publish.ts --tag alpha
```

### GitHub Actions

1. Open **Actions → Release → Run workflow**
2. Set `dist_tag` to `alpha`
3. Run with `dry_run: true` first (pack + smoke only)
4. Re-run with `dry_run: false` to publish

The workflow runs tests, typecheck, audit (high/critical), build, export validation, smoke consumer install, then `publish.ts`.

## Version bumps

1. Update `MELON_VERSION` in [`tooling/release/packages.ts`](./tooling/release/packages.ts)
2. Run `bun tooling/release/sync-package-json.ts`
3. Add a section to [`CHANGELOG.md`](./CHANGELOG.md)
4. Tag git (optional): `v0.1.0-alpha.1`
5. Publish with `--tag alpha`

## Install docs (consumers)

```bash
npm install @melon/db@alpha @melon/db-sqlite@alpha @melon/db-react@alpha
```

Pin exact versions in production apps during alpha. See [Alpha support policy](apps/docs/content/docs/alpha-support.mdx).

## After first public release

- [ ] Create GitHub Release from tag with notes from `CHANGELOG.md`
- [ ] Verify clean install from npm tarballs (not workspace links): `bun run release:smoke`
- [ ] Enable GitHub Dependabot / secret scanning if not already on
- [ ] Link docs site when hosted (update `homepage` if moving off GitHub README)
