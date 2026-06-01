/**
 * Generates per-package API reference MDX under content/docs/api/.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { API_PACKAGES, PACKAGE_LABELS } from "./api-package-meta.ts";

const root = import.meta.dir;
const docsRoot = path.join(root, "..");
const repoRoot = path.join(docsRoot, "../..");

for (const pkg of API_PACKAGES) {
	const entry = path.join(repoRoot, "packages", pkg, "src/index.ts");
	const outDir = path.join(docsRoot, "content/docs/api", pkg);
	await mkdir(outDir, { recursive: true });

	const pkgTsconfig = path.join(repoRoot, "packages", pkg, "tsconfig.json");
	const label = PACKAGE_LABELS[pkg];

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
			"--name",
			`${label} API Reference`,
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
