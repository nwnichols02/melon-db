/**
 * Verifies Fumadocs search index ids are unique across all docs pages.
 */
import { createServer } from "vite";

interface SearchPageIndex {
	id: string;
	structuredData: {
		headings: Array<{ id: string; content: string }>;
		contents: Array<{ content: string; heading?: string }>;
	};
	description?: string;
}

async function buildPageIndex(page: {
	url: string;
	path: string;
	data: {
		title?: string;
		description?: string;
		structuredData?: unknown;
		load?: () => Promise<{ structuredData: SearchPageIndex["structuredData"] }>;
	};
}): Promise<SearchPageIndex> {
	let structuredData = page.data.structuredData as
		| SearchPageIndex["structuredData"]
		| (() => Promise<SearchPageIndex["structuredData"]>)
		| undefined;

	if (typeof structuredData === "function") {
		structuredData = await structuredData();
	}

	if (!structuredData && typeof page.data.load === "function") {
		structuredData = (await page.data.load()).structuredData;
	}

	if (!structuredData) {
		throw new Error(`Missing structuredData for ${page.url}`);
	}

	return {
		id: page.url,
		description: page.data.description,
		structuredData,
	};
}

function collectSearchDocumentIds(page: SearchPageIndex): Map<string, string[]> {
	const docs = new Map<string, string[]>();
	const add = (docId: string, label: string) => {
		const existing = docs.get(docId);
		if (existing) {
			existing.push(label);
			return;
		}
		docs.set(docId, [label]);
	};

	let counter = 0;
	const nextId = () => `${page.id}-${counter++}`;

	add(page.id, `${page.id} (page)`);
	if (page.description) {
		add(nextId(), `${page.id} (description)`);
	}

	for (const heading of page.structuredData.headings) {
		add(nextId(), `${page.id}#${heading.id} (heading)`);
	}

	for (const _content of page.structuredData.contents) {
		add(nextId(), `${page.id} (content)`);
	}

	return docs;
}

const server = await createServer({
	configFile: new URL("../vite.config.ts", import.meta.url).pathname,
});
await server.pluginContainer.buildStart({});

try {
	const mod = await server.ssrLoadModule("/src/lib/source.server.ts");
	const pages = mod.source.getPages();

	const collisions = new Map<string, string[]>();

	for (const page of pages) {
		const pageIndex = await buildPageIndex(page);
		const docIds = collectSearchDocumentIds(pageIndex);

		for (const [docId, labels] of docIds) {
			const existing = collisions.get(docId) ?? [];
			collisions.set(docId, existing.concat(labels));
		}
	}

	const duplicates = [...collisions.entries()].filter(
		([, labels]) => labels.length > 1,
	);

	if (duplicates.length > 0) {
		console.error("Search index id collisions detected:");
		for (const [docId, labels] of duplicates) {
			console.error(`  ${docId}`);
			for (const label of labels) {
				console.error(`    - ${label}`);
			}
		}
		process.exit(1);
	}

	console.log(
		`Search index verified: ${pages.length} pages, ${collisions.size} unique document ids`,
	);
} finally {
	await server.close();
}
