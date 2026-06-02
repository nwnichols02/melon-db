import { BenchCompareResultsTable } from "@/components/bench-compare-results-table";
import { BenchRnMelonWdbResultsTable } from "@/components/bench-rn-melon-wdb-results-table";
import { BenchRnResultsTable } from "@/components/bench-rn-results-table";
import { DocsLink } from "@/components/docs-link";
import {
	extractMermaidChart,
	Mermaid,
	MermaidPre,
} from "@/components/mdx/mermaid";
import { ClientLivePlayground } from "@/components/playgrounds/client-live-playground";
import { ClientSyncPlayground } from "@/components/playgrounds/client-sync-playground";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { AutoTypeTable } from "fumadocs-typescript/ui";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";

/**
 * Renders mermaid fences via {@link Mermaid} when remark did not transform them.
 */
function DocsPre(props: ComponentProps<"pre">) {
	if (extractMermaidChart(props.children)) {
		return <MermaidPre {...props} />;
	}

	return (
		<CodeBlock {...props}>
			<Pre>{props.children}</Pre>
		</CodeBlock>
	);
}

/**
 * MDX component map for docs pages, including Melon playgrounds and type tables.
 */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
	return {
		...defaultMdxComponents,
		a: DocsLink,
		AutoTypeTable,
		BenchCompareResultsTable,
		BenchRnMelonWdbResultsTable,
		BenchRnResultsTable,
		Mermaid,
		pre: DocsPre,
		LivePlayground: ClientLivePlayground,
		SyncPlayground: ClientSyncPlayground,
		...components,
	};
}

export const useMDXComponents = getMDXComponents;

declare global {
	type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
