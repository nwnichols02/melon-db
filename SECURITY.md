# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| `0.1.x` (npm dist-tag `alpha`) | Security fixes on a best-effort basis |
| `0.0.x` / pre-release | Not supported after a newer alpha is published |

Melon alpha releases have **no production SLA**. Do not use alpha builds for regulated or high-risk data without your own review.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report privately by emailing the maintainers (use the contact on the GitHub organization or repository once public). Include:

- A description of the issue and impact
- Steps to reproduce
- Affected packages and versions (`@melon/db`, `@melon/db-sqlite`, etc.)
- Any suggested fix or mitigation

We aim to acknowledge reports within **5 business days** and will coordinate disclosure after a fix or documented mitigation is available.

## Scope

In scope:

- `@melon/*` packages published from this repository
- Reference sync server (`@melon/sync-server`) when used as documented
- Native SQLite modules (`@melon/db-sqlite-native`) and JSI bindings

Out of scope:

- Your application code, backend APIs, and custom sync backends
- Third-party dependencies (report to the upstream project; we will bump deps when fixes exist)

## Safe defaults

- Keep `@melon/*` updated to the latest alpha you have validated.
- Run `bun audit` / `npm audit` in your app CI.
- Do not commit database files, API keys, or `.env` secrets to version control.
