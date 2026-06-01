/**
 * Normalizes TypeDoc markdown output for Fumadocs routing and frontmatter.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const apiRoot = path.join(import.meta.dir, "../content/docs/api");

async function walk(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await walk(full)));
			continue;
		}
		if (entry.name.endsWith(".mdx") || entry.name.endsWith(".md")) {
			files.push(full);
		}
	}
	return files;
}

function deriveTitle(file: string, body: string): string {
	const heading = body.match(/^#\s+(?:\w+:\s+)?(.+?)\s*$/m);
	if (heading?.[1]) {
		return heading[1].replace(/\(\)$/, "").trim();
	}

	const base = path.basename(file, path.extname(file));
	if (base === "index") {
		return path.basename(path.dirname(file));
	}

	return base.replace(/^(Class|Function|Interface|TypeAlias|Variable)\./, "");
}

function sanitizeYamlValue(value: string): string {
	return value
		.replace(/\\/g, "")
		.replace(/[<>]/g, "")
		.replace(/"/g, "'")
		.trim();
}

function normalizeFrontmatter(file: string, content: string): string {
	const body = content.replace(/^---[\s\S]*?---\s*/u, "");
	const title = sanitizeYamlValue(deriveTitle(file, body));
	const description = sanitizeYamlValue(`API reference: ${title}`);

	return `---\ntitle: "${title}"\ndescription: "${description}"\n---\n\n${body}`;
}

const files = await walk(apiRoot);

for (const file of files) {
	let content = await readFile(file, "utf8");

	content = content.replace(/\]\(([^)]+)\.mdx?\)/g, "]($1)");
	content = content.replace(/\]\(([^)]*)\/index\)/g, "]($1)");

	content = normalizeFrontmatter(file, content);

	if (file.endsWith(".md")) {
		await writeFile(file.replace(/\.md$/, ".mdx"), content);
		const { unlink } = await import("node:fs/promises");
		await unlink(file);
		continue;
	}

	await writeFile(file, content);
}

console.log(`Processed ${files.length} API files`);
