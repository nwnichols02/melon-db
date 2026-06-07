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

See [Step 4 — Post-publish verification](#step-4--post-publish-verification) below.

---

## Step 2 — Make GitHub public (security-hardened)

Do these **before** flipping visibility to Public. Order matters: enable protections while the repo is still private so you can test branch rules without surprise lockouts.

### 2a. Pre-public secret hygiene

Run locally from a clean clone:

```bash
# Spot-check history for accidental secrets (API keys, .env, tokens)
git log -p --all -S 'NPM_TOKEN' -- .
git log -p --all -S 'BEGIN PRIVATE KEY' -- .
git log -p --all -S 'sk-' -- .

# Optional: use GitHub’s secret scanning push protection after going public
```

**Never commit:** `.env`, `NPM_TOKEN`, npm tokens, Apple/Google signing keys, `*.p12`, or CI export files with credentials. If anything ever leaked, **rotate immediately** (npm token revoke, GitHub PAT revoke, new secrets in Actions).

### 2b. Organization / account security (GitHub)

If the repo lives under your personal account (`nwnichols02`), apply these at **Settings → Password and authentication** and **Settings → Code security**:

| Setting | Where | Recommended |
|--------|--------|-------------|
| **2FA** | Account → Password and authentication | **Required** (TOTP app or security key; SMS is weaker) |
| **Passkeys / security keys** | Same | Add at least one hardware key or passkey as backup |
| **SSH signing** (optional) | SSH keys → Signing keys | Commits show “Verified” on GitHub |

If you later move to a `melon` GitHub org, repeat at org level: **Require 2FA for all members**.

### 2c. Repository security features

**Settings → Code security and analysis** (enable all that apply on your plan):

| Feature | Purpose (supply-chain relevance) |
|---------|----------------------------------|
| **Secret scanning** | Detects committed tokens; alerts on push |
| **Push protection** | **Blocks** pushes that contain known secret patterns |
| **Dependabot alerts** | CVEs in `bun.lock` / transitive deps |
| **Dependabot security updates** | Auto-PRs for vulnerable deps |
| **Dependabot version updates** (optional) | Keeps Actions (`actions/checkout@v4`, etc.) current |

**Settings → Actions → General:**

| Setting | Recommendation |
|---------|----------------|
| **Actions permissions** | “Allow *this* repository” only (not all repos) |
| **Workflow permissions** | **Read repository contents** by default |
| **Allow GitHub Actions to create PRs** | Off unless you use Dependabot merge bots |
| **Fork PR workflows** | **Require approval for first-time contributors** (prevents secret exfiltration from malicious PRs) |

Your release workflow already uses least privilege on the job:

```yaml
permissions:
  contents: read
  id-token: write   # for npm OIDC trusted publishing (preferred over long-lived tokens)
```

Do **not** add `contents: write` to release unless you add a step that creates GitHub Releases from CI.

### 2d. Branch protection on `main`

**Settings → Branches → Add rule** for `main`:

- [ ] **Require a pull request before merging** (1 approval if you have collaborators)
- [ ] **Require status checks to pass** — select CI jobs: `test`, `release-smoke` (and others you care about)
- [ ] **Require branches to be up to date** before merge
- [ ] **Do not allow bypassing** (including admins, unless you accept that risk)
- [ ] **Block force pushes**
- [ ] **Restrict who can push** — only you (or release bot) if solo

This limits “one compromised laptop pushes malware to main → auto-publish” paths.

### 2e. Release workflow hardening (recommended)

**Settings → Environments → New environment:** `npm-publish`

Add rules:

- [ ] **Required reviewers:** you (manual gate before npm publish)
- [ ] **Deployment branches:** only `main` (or only tags `v*` if you switch to tag-triggered release)

Then in `.github/workflows/release.yml`, set:

```yaml
jobs:
  publish:
    environment: npm-publish
```

That way `dry_run: false` still requires an explicit environment approval click.

### 2f. Go public

**Settings → General → Danger Zone → Change repository visibility → Public**

After public:

- [ ] Confirm **Secret scanning** and **Push protection** show as enabled
- [ ] Open **Security** tab → review any findings
- [ ] Enable **Private vulnerability reporting** (Settings → Security → Private vulnerability reporting) so researchers use advisories instead of public issues

### 2g. What this defends against (2024–2026 supply chain)

| Threat | Your mitigations |
|--------|------------------|
| Stolen long-lived npm tokens | Prefer **npm Trusted Publishing (OIDC)**; no token in GitHub Secrets |
| Malicious PR exfiltrating `secrets.*` | Fork PR approval; default read-only workflow token |
| Typosquat `@melon/db` | Publish all `@melon/*` names **before** announcing; npm org scope ownership |
| Compromised maintainer account | 2FA, branch protection, optional `npm-publish` environment approval |
| Dependency confusion | Scoped packages, `repository` field in every `package.json`, provenance on publish |
| Shai-Hulud-style postinstall worms | You don’t run postinstall scripts in published packages; still run `bun audit` in CI |

---

## Step 3 — npm `@melon` org, tokens, and where secrets live

### 3a. Create the npm organization

1. Log in at [npmjs.com](https://www.npmjs.com/) with the account that will **own** the org.
2. Avatar → **Add an Organization** → name: **`melon`** (creates scope `@melon`).
3. Plan: **Free** is fine for public open-source packages.
4. **Organization settings → Members:**
   - Start with just you as **Owner**
   - Add collaborators later as **Developers** (publish) or **Read-only** (no publish)

### 3b. Require 2FA on npm

**Account → Account settings → Two-Factor Authentication** — enable TOTP or security key.

**Organization → Settings → Require two-factor authentication** — turn **on** for all members before adding anyone else.

npm blocked classic tokens in late 2025; use **granular tokens** (max 90 days) or **OIDC trusted publishing** (preferred).

### 3c. Claim package names (first publish)

Your packages are scoped (`@melon/db`, etc.). The **first** `npm publish` of each name creates it under the org if:

- You are logged in as an org member with publish rights, and
- `package.json` has `"name": "@melon/..."` and `"publishConfig": { "access": "public" }`

Publish order is defined in `tooling/release/packages.ts` (`PUBLISH_ORDER`) — dependencies first.

**Reserve names early:** even unpublished, run first alpha publish (or `npm publish --dry-run` locally) so squatters cannot register `@melon/db`.

### 3d. Where to keep credentials (do / don’t)

| Secret | Store here | Do **not** store here |
|--------|------------|------------------------|
| npm publish (fallback token) | GitHub **Repository secret** `NPM_TOKEN` or password manager | Repo files, `.env` committed, Slack, notes |
| npm login (local dev) | `~/.npmrc` on your machine only (`npm login`) | Shared drives |
| GitHub PAT (if needed) | GitHub **fine-grained PAT** with minimal repos | Classic PAT with `repo` + `write:packages` |
| Apple/Google signing | Expo EAS / platform keychains | Same repo as Melon |

**GitHub Actions secret (fallback path):**

1. Repo → **Settings → Secrets and variables → Actions → New repository secret**
2. Name: **`NPM_TOKEN`**
3. Value: granular token from npm (see 3e) **or** leave empty once OIDC works

Your workflow maps it as:

```yaml
env:
  NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

`tooling/release/publish.ts` accepts either `NPM_TOKEN` or `NODE_AUTH_TOKEN`.

**Local one-off publish:**

```bash
# Terminal only — never commit
export NPM_TOKEN=npm_xxxxxxxx
bun tooling/release/publish.ts --tag alpha
unset NPM_TOKEN
```

Or use `npm login` and publish without exporting a token (uses `~/.npmrc`).

### 3e. npm token options (pick one primary path)

#### Option A — Trusted Publishing / OIDC (recommended)

No long-lived `NPM_TOKEN` in GitHub. Short-lived tokens per workflow run.

**Per package** (after first manual publish creates the package on npm):

1. npm → package **@melon/db** → **Settings → Trusted Publisher**
2. Provider: **GitHub Actions**
3. Repository: `nwnichols02/melon`
4. Workflow filename: **`release.yml`** (exact, case-sensitive)
5. Environment: leave blank unless you add `npm-publish` environment (then set `npm-publish`)

Repeat for each `@melon/*` package, **or** use org-level trusted publisher if npm org plan supports it.

**Workflow requirements** (already partially in place):

- `permissions: id-token: write`
- `actions/setup-node` with `registry-url: https://registry.npmjs.org`
- npm CLI **≥ 11.5.1** before publish — add step: `npm install -g npm@latest`
- For pure OIDC: **omit** `NODE_AUTH_TOKEN` / `NPM_TOKEN` on the publish step once trusted publisher is verified

**Provenance:** add to publish command or `publishConfig`:

```json
"publishConfig": {
  "access": "public",
  "provenance": true
}
```

Consumers see a link on npm verifying the tarball came from your GitHub workflow.

#### Option B — Granular access token (fallback / bootstrap)

Use only to **bootstrap** first publish or if OIDC is not configured yet.

1. npm → **Access Tokens → Generate New Token → Granular Access Token**
2. Permissions: **Read and write** for packages under **`@melon`** only
3. Expiration: **30–90 days** (set calendar reminder to rotate)
4. Copy once → paste into GitHub secret `NPM_TOKEN`
5. **Revoke** when OIDC is working

Do **not** use bypass-2FA tokens. Do **not** share one token across machines and CI.

### 3f. First publish sequence

```bash
# 1. Local gates
bun test && bun run typecheck && bun run release:smoke

# 2. Dry run in GitHub Actions
# Actions → Release → dry_run: true, dist_tag: alpha

# 3. Bootstrap (choose one):
#    A) Local with npm login + granular token
export NPM_TOKEN=...   # or npm login
bun run build:packages
bun tooling/release/publish.ts --tag alpha

#    B) GitHub Actions with NPM_TOKEN secret
#    Actions → Release → dry_run: false

# 4. Configure Trusted Publisher on each package; remove NPM_TOKEN secret when OIDC verified
```

Verify on npm:

```bash
npm view @melon/db versions --json
npm dist-tag ls @melon/db    # should list alpha -> 0.1.0-alpha.0
```

---

## Step 4 — Post-publish verification

### 4a. npm registry checks

For **each** published package (`@melon/db`, `@melon/db-query`, …):

```bash
npm view @melon/db name version license author repository
npm view @melon/db dist-tags
npm pack @melon/db@alpha --dry-run
```

Confirm:

- [ ] `license: MIT`
- [ ] `author` and `repository.url` point to `nwnichols02/melon`
- [ ] dist-tag **`alpha`** resolves to your version
- [ ] Package page shows **public** and under **@melon** org

If using provenance/OIDC, npm package page should show **Provenance** / link to the GitHub workflow run.

### 4b. Clean consumer install (outside monorepo)

Your repo already has a fixture; run it manually in a temp dir to mimic external adopters:

```bash
mkdir /tmp/melon-consumer-test && cd /tmp/melon-consumer-test
npm init -y
npm install @melon/db@alpha @melon/db-sqlite@alpha @melon/db-query@alpha
node -e "import('@melon/db').then(m => console.log('ok', typeof m.createDatabase))"
```

Or from the monorepo:

```bash
bun run release:smoke
```

### 4c. GitHub Release

1. Tag the commit you published (if not already):

   ```bash
   git tag -a v0.1.0-alpha.0 -m "Melon alpha 0.1.0-alpha.0"
   git push origin v0.1.0-alpha.0
   ```

2. GitHub → **Releases → Draft a new release**
   - Choose tag `v0.1.0-alpha.0`
   - Title: `v0.1.0-alpha.0 — First public alpha`
   - Body: paste from `CHANGELOG.md`
   - Mark as **pre-release**

### 4d. Security follow-ups (within 24h)

- [ ] npm org: **Require 2FA** for all members
- [ ] npm: Trusted Publisher on all packages; **revoke** bootstrap `NPM_TOKEN`
- [ ] GitHub: Dependabot alerts reviewed; no open **critical** without a plan
- [ ] GitHub: **Private vulnerability reporting** enabled
- [ ] Document install line in README (already there) and pin alpha in your own apps

### 4e. Ongoing release hygiene

| When | Action |
|------|--------|
| Each release | `dry_run: true` in Actions first; then `dry_run: false` |
| Version bump | Update `MELON_VERSION`, `CHANGELOG.md`, run `bun run release:sync-metadata` |
| Quarterly | Rotate granular token if still used; review Dependabot |
| New maintainer | npm org **Developer** role + GitHub write; never share tokens |

### 4f. If something goes wrong

| Problem | Response |
|---------|----------|
| Wrong version published | `npm deprecate @melon/db@bad-version "reason"`; publish fix with new version |
| Token leaked | Revoke on npm immediately; audit GitHub Actions logs; rotate all secrets |
| Malicious publish | Unpublish within 72h if no dependents (npm policy); otherwise deprecate and publish patch |
| Package squatting | Only org owners can publish `@melon/*`; publish all names before announcement |
