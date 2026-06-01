import { BenchCompareResultsTable } from "@/components/bench-compare-results-table";
import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { DocsLink } from "@/components/docs-link";
import { ClientLivePlayground } from "@/components/playgrounds/client-live-playground";
import { ClientSyncPlayground } from "@/components/playgrounds/client-sync-playground";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { AutoTypeTable } from "fumadocs-typescript/ui";
import type { MDXComponents } from "mdx/types";

/**
 * MDX component map for docs pages, including Melon playgrounds and type tables.
 */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
	return {
		...defaultMdxComponents,
		a: DocsLink,
		AutoTypeTable,
		ArchitectureDiagram,
		BenchCompareResultsTable,
		LivePlayground: ClientLivePlayground,
		SyncPlayground: ClientSyncPlayground,
		...components,
	};
}

export const useMDXComponents = getMDXComponents;

declare global {
	type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
