"use client";

import { use, useEffect, useId, useState } from "react";
import { useTheme } from "next-themes";

interface MermaidProps {
	chart: string;
}

/**
 * Renders a Mermaid diagram with theme-aware styling for docs pages.
 */
export function Mermaid({ chart }: MermaidProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<figure className="my-6 not-prose">
				<div className="min-h-48 overflow-x-auto rounded-lg border border-fd-border bg-fd-card p-4" />
			</figure>
		);
	}

	return <MermaidContent chart={chart} />;
}

const cache = new Map<string, Promise<unknown>>();

function cachePromise<T>(key: string, setPromise: () => Promise<T>): Promise<T> {
	const cached = cache.get(key);
	if (cached) return cached as Promise<T>;

	const promise = setPromise();
	cache.set(key, promise);
	return promise;
}

function MermaidContent({ chart }: MermaidProps) {
	const id = useId();
	const { resolvedTheme } = useTheme();
	const { default: mermaid } = use(
		cachePromise("mermaid", () => import("mermaid")),
	);

	mermaid.initialize({
		startOnLoad: false,
		securityLevel: "loose",
		fontFamily: "inherit",
		themeCSS: "margin: 0 auto;",
		theme: resolvedTheme === "dark" ? "dark" : "default",
	});

	const { svg, bindFunctions } = use(
		cachePromise(`${chart}-${resolvedTheme}`, () => {
			return mermaid.render(id, chart.replaceAll("\\n", "\n"));
		}),
	);

	return (
		<figure className="my-6 not-prose">
			<div className="overflow-x-auto rounded-lg border border-fd-border bg-fd-card p-4">
				<div
					className="flex justify-center [&_svg]:max-w-full"
					ref={(container) => {
						if (container) bindFunctions?.(container);
					}}
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Mermaid renders trusted SVG from its own API
					dangerouslySetInnerHTML={{ __html: svg }}
				/>
			</div>
		</figure>
	);
}
