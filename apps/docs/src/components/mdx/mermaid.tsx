"use client";

import {
	Children,
	isValidElement,
	useEffect,
	useId,
	useMemo,
	useState,
	type ReactNode,
} from "react";
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
		return <MermaidFigure />;
	}

	return <MermaidContent chart={chart} />;
}

function MermaidFigure({ children }: { children?: ReactNode }) {
	return (
		<figure className="my-6 not-prose">
			<div className="min-h-48 overflow-x-auto rounded-lg border border-fd-border bg-fd-card p-4">
				{children}
			</div>
		</figure>
	);
}

let mermaidId = 0;

function nextMermaidId(prefix: string): string {
	mermaidId += 1;
	return `${prefix}-${mermaidId}`;
}

function MermaidContent({ chart }: MermaidProps) {
	const reactId = useId();
	const renderId = useMemo(
		() => nextMermaidId(`mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`),
		[reactId],
	);
	const { resolvedTheme } = useTheme();
	const [svg, setSvg] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const normalizedChart = chart.replaceAll("\\n", "\n").trim();
	const themeKey = resolvedTheme === "dark" ? "dark" : "default";

	useEffect(() => {
		let cancelled = false;

		async function render() {
			setSvg(null);
			setError(null);

			try {
				const { default: mermaid } = await import("mermaid");
				mermaid.initialize({
					startOnLoad: false,
					securityLevel: "loose",
					fontFamily: "inherit",
					themeCSS: "margin: 0 auto;",
					theme: themeKey,
				});

				const { svg: rendered, bindFunctions } = await mermaid.render(
					renderId,
					normalizedChart,
				);

				if (cancelled) return;

				setSvg(rendered);

				requestAnimationFrame(() => {
					const container = document.getElementById(renderId);
					if (container) bindFunctions?.(container);
				});
			} catch (cause) {
				if (cancelled) return;
				const message =
					cause instanceof Error ? cause.message : "Failed to render diagram";
				setError(message);
			}
		}

		void render();

		return () => {
			cancelled = true;
			document.getElementById(renderId)?.remove();
		};
	}, [normalizedChart, renderId, themeKey]);

	if (error) {
		return (
			<MermaidFigure>
				<p className="mb-2 text-fd-muted-foreground text-sm">
					Diagram failed to render: {error}
				</p>
				<pre className="overflow-x-auto text-fd-foreground text-xs">
					{normalizedChart}
				</pre>
			</MermaidFigure>
		);
	}

	if (!svg) {
		return <MermaidFigure />;
	}

	return (
		<figure className="my-6 not-prose">
			<div className="overflow-x-auto rounded-lg border border-fd-border bg-fd-card p-4">
				<div
					className="flex justify-center [&_svg]:max-w-full"
					id={renderId}
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Mermaid renders trusted SVG from its own API
					dangerouslySetInnerHTML={{ __html: svg }}
				/>
			</div>
		</figure>
	);
}

/**
 * Fallback when a mermaid fence was not transformed by remarkMdxMermaid.
 */
export function MermaidPre({
	children,
	...props
}: React.ComponentProps<"pre">) {
	const chart = extractMermaidChart(children);
	if (chart) {
		return <Mermaid chart={chart} />;
	}

	return <pre {...props}>{children}</pre>;
}

export function extractMermaidChart(node: ReactNode): string | null {
	if (typeof node === "string") {
		return node.trim() || null;
	}

	if (!isValidElement(node)) {
		return null;
	}

	const { children: child, className } = node.props as {
		children?: ReactNode;
		className?: string;
	};

	if (
		typeof className === "string" &&
		/\blanguage-mermaid\b/.test(className)
	) {
		return collectText(child).trim() || null;
	}

	return extractMermaidChart(child);
}

function collectText(node: ReactNode): string {
	if (typeof node === "string") {
		return node;
	}

	if (Array.isArray(node)) {
		return node.map(collectText).join("");
	}

	if (isValidElement(node)) {
		const { children } = node.props as { children?: ReactNode };
		return collectText(children);
	}

	return Children.toArray(node).map(collectText).join("");
}
