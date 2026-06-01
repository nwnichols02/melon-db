# Playground environments

Two isolated environments — use the matching npm script (never mix env files).

| Environment | Env file | Script | SQLite | Runs in |
|-------------|----------|--------|--------|---------|
| **Expo Go** | `.env.expo-go` | `bun run start:expo-go` | `expo-sqlite` | Expo Go app |
| **Development build** | `.env.development-build` | see below | Melon JSI native | Custom dev client |

From repo root: `bun run dev:rn` (Expo Go) or `bun run dev:rn:dev-build` (full native install).

Do not copy these into `.env` manually unless you know which environment you want.

## Development build workflow (required order)

`start:dev-build` only starts Metro. It does **not** install the native app. Pressing **`i`** before installing fails with:

> No development build (com.nate.nichols.playgroundrn) for this project is installed

That message usually means either the dev client is not installed yet, or `ios/` was generated with the **Expo Go** bundle id. Fix:

From `apps/playground-rn` (you may already be there — do not run `cd apps/playground-rn` again):

```bash
bun install
bun run install:dev-build
bun run start:dev-build
```

Or step by step (one command per line, no trailing comments):

```bash
bun run prebuild:dev
bun run run:ios:dev
bun run start:dev-build
```

Do not put `# comments` on the same line as `bun run` — Bun forwards them to Expo and you get `Invalid project root: .../#`.

After the first install, you can use `start:dev-build` alone and launch the **Melon Playground (Dev)** icon on the simulator.

Metro should show `melon-playground-dev://` in the QR URL. If you see `melon-playground://`, stop Metro and restart with `bun run start:dev-build`.

## Switching from Expo Go to dev build

1. Stop any running Metro (`Ctrl+C`).
2. Run `prebuild:dev` (uses `--clean` so native projects match the dev bundle id).
3. Run `run:ios:dev` once.
4. Then `start:dev-build`.

Expo Go and the dev client are separate apps with separate bundle ids and database files.
