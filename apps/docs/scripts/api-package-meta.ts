import path from "node:path";

/** Package display names and one-line roles for TypeDoc API index pages. */
export const API_PACKAGES = [
	"melon-db",
	"melon-db-sqlite",
	"melon-db-sqlite-native",
	"melon-db-query",
	"melon-db-query-mango",
	"melon-db-prisma",
	"melon-db-react",
	"melon-db-devtools",
	"melon-db-testkit",
	"melon-db-codemods",
	"melon-sync",
	"melon-sync-server",
] as const;

export type ApiPackageId = (typeof API_PACKAGES)[number];

export const PACKAGE_LABELS: Record<ApiPackageId, string> = {
	"melon-db": "@melon/db",
	"melon-db-sqlite": "@melon/db-sqlite",
	"melon-db-sqlite-native": "@melon/db-sqlite-native",
	"melon-db-query": "@melon/db-query",
	"melon-db-query-mango": "@melon/db-query-mango",
	"melon-db-prisma": "@melon/db-prisma",
	"melon-db-react": "@melon/db-react",
	"melon-db-devtools": "@melon/db-devtools",
	"melon-db-testkit": "@melon/db-testkit",
	"melon-db-codemods": "@melon/db-codemods",
	"melon-sync": "@melon/sync",
	"melon-sync-server": "@melon/sync-server",
};

export const PACKAGE_BLURBS: Record<ApiPackageId, string> = {
	"melon-db":
		"Core schema, query AST, adapter contract, runtime engine, migrations, and sync primitives.",
	"melon-db-sqlite":
		"SQLite StorageAdapter for Bun, Node, Expo Go, and React Native dev builds.",
	"melon-db-sqlite-native":
		"Melon-owned native SQLite module (TurboModule + C++ JSI) for RN dev builds.",
	"melon-db-query": "Fluent type-safe query builder that compiles to QueryAst.",
	"melon-db-query-mango":
		"Mango-style JSON query compiler (RxDB/CouchDB subset) to QueryAst.",
	"melon-db-prisma":
		"Prisma schema import, codegen CLI, and Prisma-like local client facade.",
	"melon-db-react":
		"React provider, query hooks, writer hook, and sync hooks.",
	"melon-db-devtools":
		"Devtools event bridge and optional React inspector panel.",
	"melon-db-testkit":
		"Test helpers, fixtures, and adapter CRUD vectors for unit tests.",
	"melon-db-codemods":
		"WatermelonDB migration codemods and runtime query translator.",
	"melon-sync": "Watermelon-compatible pull/push sync orchestrator.",
	"melon-sync-server":
		"HTTP reference sync backend with in-memory and Postgres stores.",
};

export function packageIdFromPath(file: string): ApiPackageId | null {
	for (const pkg of API_PACKAGES) {
		if (file.includes(`${path.sep}api${path.sep}${pkg}${path.sep}`)) {
			return pkg;
		}
	}
	return null;
}
