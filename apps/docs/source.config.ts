import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";
import {
	createFileSystemGeneratorCache,
	createGenerator,
	remarkAutoTypeTable,
} from "fumadocs-typescript";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";

export const docs = defineDocs({
	dir: "content/docs",
	docs: {
		postprocess: {
			includeProcessedMarkdown: true,
		},
	},
});

const typeGenerator = createGenerator({
	cache: createFileSystemGeneratorCache(".source/fumadocs-typescript"),
});

export default defineConfig({
	mdxOptions: {
		remarkPlugins: (plugins) => [
			...plugins,
			remarkMdxMermaid,
			[remarkAutoTypeTable, { generator: typeGenerator }],
		],
	},
});
