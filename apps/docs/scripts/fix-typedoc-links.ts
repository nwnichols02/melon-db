/**
 * Normalizes TypeDoc markdown output for Fumadocs routing and frontmatter.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	API_PACKAGES,
	PACKAGE_BLURBS,
	PACKAGE_LABELS,
	type ApiPackageId,
} from "./api-package-meta.ts";

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

function packageIdFromFile(file: string): ApiPackageId | null {
	for (const pkg of API_PACKAGES) {
		if (file.includes(`${path.sep}api${path.sep}${pkg}${path.sep}`)) {
			return pkg;
		}
	}
	return null;
}

function deriveTitle(file: string, body: string): string {
	const heading = body.match(/^#\s+(?:\w+:\s+)?(.+?)\s*$/m);
	if (heading?.[1]) {
		return heading[1].replace(/\(\)$/, "").trim();
	}

	const base = path.basename(file, path.extname(file));
	if (base === "index") {
		const pkg = packageIdFromFile(file);
		if (pkg) {
			return PACKAGE_LABELS[pkg];
		}
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

function normalizeFrontmatter(
	file: string,
	content: string,
	pkg: ApiPackageId | null,
): string {
	const body = content.replace(/^---[\s\S]*?---\s*/u, "");
	const isIndex = path.basename(file, path.extname(file)) === "index";
	const title = sanitizeYamlValue(deriveTitle(file, body));
	const label = pkg ? PACKAGE_LABELS[pkg] : null;
	const description = sanitizeYamlValue(
		isIndex && label
			? `API reference for ${label}`
			: label
				? `${label} — ${title}`
				: `API reference: ${title}`,
	);

	return `---\ntitle: "${title}"\ndescription: "${description}"\n---\n\n${body}`;
}

function rewriteApiLinks(body: string, pkg: ApiPackageId | null): string {
	if (!pkg) {
		return body;
	}

	const base = `/docs/api/${pkg}`;

	return body.replace(/\]\(([^)]+)\)/g, (match, href: string) => {
		if (
			href.startsWith("http://") ||
			href.startsWith("https://") ||
			href.startsWith("#") ||
			href.startsWith("/docs/")
		) {
			return match;
		}

		if (href === "index" || href === "./index") {
			return `](${base})`;
		}

		if (/^(Class|Function|Interface|TypeAlias|Variable)\./.test(href)) {
			return `](${base}/${href})`;
		}

		return match;
	});
}

function normalizeIndexBody(file: string, body: string): string {
	const pkg = packageIdFromFile(file);
	if (!pkg || path.basename(file, path.extname(file)) !== "index") {
		return body;
	}

	const label = PACKAGE_LABELS[pkg];
	const blurb = PACKAGE_BLURBS[pkg];
	let updated = body;

	updated = updated.replace(
		/^#\s+Melon API\s*$/m,
		`# ${label}`,
	);
	updated = updated.replace(
		new RegExp(`^#\\s+${label.replace("/", "\\/")} API Reference\\s*$`, "m"),
		`# ${label}`,
	);

	if (!updated.includes(blurb)) {
		const headingMatch = updated.match(/^#\s+.+\s*$/m);
		if (headingMatch?.index != null) {
			const insertAt = headingMatch.index + headingMatch[0].length;
			updated = `${updated.slice(0, insertAt)}\n\n${blurb}\n${updated.slice(insertAt)}`;
		}
	}

	return updated;
}

const files = await walk(apiRoot);

for (const file of files) {
	let content = await readFile(file, "utf8");
	const pkg = packageIdFromFile(file);

	content = content.replace(/\]\(([^)]+)\.mdx?\)/g, "]($1)");
	content = content.replace(/\]\(([^)]*)\/index\)/g, "]($1)");

	const bodyOnly = content.replace(/^---[\s\S]*?---\s*/u, "");
	let normalizedBody = normalizeIndexBody(file, bodyOnly);
	normalizedBody = rewriteApiLinks(normalizedBody, pkg);
	content = normalizeFrontmatter(file, normalizedBody, pkg);

	if (file.endsWith(".md")) {
		await writeFile(file.replace(/\.md$/, ".mdx"), content);
		const { unlink } = await import("node:fs/promises");
		await unlink(file);
		continue;
	}

	await writeFile(file, content);
}

console.log(`Processed ${files.length} API files`);
