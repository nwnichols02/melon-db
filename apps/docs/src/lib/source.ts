import { docs } from "collections/server";
import { loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { docsRoute } from "./shared";

export const source = loader({
	source: docs.toFumadocsSource(),
	baseUrl: docsRoute,
	plugins: [lucideIconsPlugin()],
});

/**
 * Converts URL slug segments to Fumadocs page slugs.
 */
export function markdownPathToSlugs(segs: string[]): string[] {
	if (segs.length === 0) {
		return [];
	}

	const out = [...segs];
	const last = out[out.length - 1];
	if (last) {
		out[out.length - 1] = last.replace(/\.mdx?$/, "");
	}
	if (out.length === 1 && out[0] === "index") {
		out.pop();
	}
	return out;
}

/**
 * Builds markdown path metadata for a docs slug array.
 */
export function slugsToMarkdownPath(slugs: string[]): {
	segments: string[];
	url: string;
} {
	const segments = [...slugs];
	if (segments.length === 0) {
		segments.push("index.mdx");
	} else {
		segments[segments.length - 1] += ".mdx";
	}

	return {
		segments,
		url: `${docsRoute}/${segments.join("/")}`,
	};
}
