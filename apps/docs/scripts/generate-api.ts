/**
 * Generates per-package API reference MDX under content/docs/api/.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";

const root = import.meta.dir;
const docsRoot = path.join(root, "..");
const repoRoot = path.join(docsRoot, "../..");

const API_PACKAGES = [
	"melon-db",
	"melon-db-sqlite",
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

for (const pkg of API_PACKAGES) {
	const entry = path.join(repoRoot, "packages", pkg, "src/index.ts");
	const outDir = path.join(docsRoot, "content/docs/api", pkg);
	await mkdir(outDir, { recursive: true });

	const pkgTsconfig = path.join(repoRoot, "packages", pkg, "tsconfig.json");

	const proc = Bun.spawn(
		[
			"bunx",
			"typedoc",
			"--options",
			path.join(docsRoot, "typedoc.json"),
			"--tsconfig",
			pkgTsconfig,
			"--entryPoints",
			entry,
			"--out",
			outDir,
		],
		{
			cwd: docsRoot,
			stdout: "inherit",
			stderr: "inherit",
		},
	);

	const code = await proc.exited;
	if (code !== 0) {
		console.error(`typedoc failed for ${pkg} (exit ${code})`);
		process.exit(code);
	}
}

console.log("API reference generated for", API_PACKAGES.length, "packages");
