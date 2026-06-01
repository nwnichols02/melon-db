# Playground environments

Two isolated environments — use the matching npm script (never mix env files).

| Environment | Env file | Script | SQLite | Runs in |
|-------------|----------|--------|--------|---------|
| **Expo Go** | `.env.expo-go` | `bun run start:expo-go` | `expo-sqlite` | Expo Go app |
| **Development build** | `.env.development-build` | `bun run prebuild:dev` then `bun run run:ios:dev` | Melon JSI native | Custom dev client |

From repo root: `bun run dev:rn` (Expo Go) or `bun run dev:rn:dev-build` (development build).

Do not copy these into `.env` manually unless you know which environment you want.
