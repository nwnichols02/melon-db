import { createMiddleware, createStart } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { isMarkdownPreferred } from "fumadocs-core/negotiation";
import { slugsToMarkdownPath } from "@/lib/path-utils";
import { docsRoute } from "@/lib/shared";

const llmMiddleware = createMiddleware().server(({ next, request }) => {
	const url = new URL(request.url);

	if (
		url.pathname.startsWith(docsRoute) &&
		!url.pathname.endsWith(".md") &&
		!url.pathname.endsWith(".mdx") &&
		isMarkdownPreferred(request)
	) {
		const slugs = url.pathname
			.slice(docsRoute.length)
			.split("/")
			.filter((segment) => segment.length > 0);
		url.pathname = slugsToMarkdownPath(slugs).url;
		throw redirect({ href: url.pathname });
	}

	return next();
});

export const startInstance = createStart(() => ({
	requestMiddleware: [llmMiddleware],
}));
