import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import mdx from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.join(rootDir, "../../packages");
const require = createRequire(import.meta.url);
const shikiOnigWasm = require.resolve("shiki/dist/onig.wasm");

/** Vite/Rolldown does not resolve workspace `exports` subpaths reliably; alias to source. */
const melonWorkspaceAliases = [
	{
		find: "@melon-db/sync-server/in-memory",
		replacement: path.join(packagesDir, "melon-sync-server/src/in-memory.ts"),
	},
	{
		find: "@melon-db/db-devtools/react",
		replacement: path.join(packagesDir, "melon-db-devtools/src/react/index.ts"),
	},
	{
		find: "@melon-db/db-devtools",
		replacement: path.join(packagesDir, "melon-db-devtools/src/index.ts"),
	},
	{
		find: "@melon-db/sync-server",
		replacement: path.join(packagesDir, "melon-sync-server/src/index.ts"),
	},
	{
		find: "@melon-db/db-query",
		replacement: path.join(packagesDir, "melon-db-query/src/index.ts"),
	},
	{
		find: "@melon-db/db-query-mango",
		replacement: path.join(packagesDir, "melon-db-query-mango/src/index.ts"),
	},
	{
		find: "@melon-db/db-prisma",
		replacement: path.join(packagesDir, "melon-db-prisma/src/index.ts"),
	},
	{
		find: "@melon-db/db-react",
		replacement: path.join(packagesDir, "melon-db-react/src/index.ts"),
	},
	{
		find: "@melon-db/sync",
		replacement: path.join(packagesDir, "melon-sync/src/index.ts"),
	},
	{
		find: "@melon-db/db",
		replacement: path.join(packagesDir, "melon-db/src/index.ts"),
	},
];

export default defineConfig({
	assetsInclude: ["**/*.wasm"],
	ssr: {
		noExternal: [/^@melon-db\//, "shiki", "fumadocs-core"],
	},
	server: {
		port: Number(process.env.PORT ?? 3000),
	},
	plugins: [
		mdx(),
		tailwindcss(),
		tanstackStart({
			prerender: {
				enabled: false,
			},
		}),
		react(),
		nitro({ preset: "vercel" }),
	],
	resolve: {
		conditions: ["development", "browser", "module", "import", "default"],
		alias: [
			...melonWorkspaceAliases,
			{ find: "shiki/wasm", replacement: shikiOnigWasm },
			{ find: "@", replacement: path.join(rootDir, "src") },
			{
				find: "collections/server",
				replacement: path.join(rootDir, ".source/server.ts"),
			},
			{
				find: "collections/browser",
				replacement: path.join(rootDir, ".source/browser.ts"),
			},
			{ find: "tslib", replacement: "tslib/tslib.es6.js" },
		],
	},
});
