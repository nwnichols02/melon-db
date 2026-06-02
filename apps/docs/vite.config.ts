import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import mdx from "fumadocs-mdx/vite";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.join(rootDir, "../../packages");

/** Vite/Rolldown does not resolve workspace `exports` subpaths reliably; alias to source. */
const melonWorkspaceAliases = [
	{
		find: "@melon/sync-server/in-memory",
		replacement: path.join(packagesDir, "melon-sync-server/src/in-memory.ts"),
	},
	{
		find: "@melon/db-devtools/react",
		replacement: path.join(packagesDir, "melon-db-devtools/src/react/index.ts"),
	},
	{
		find: "@melon/db-devtools",
		replacement: path.join(packagesDir, "melon-db-devtools/src/index.ts"),
	},
	{
		find: "@melon/sync-server",
		replacement: path.join(packagesDir, "melon-sync-server/src/index.ts"),
	},
	{
		find: "@melon/db-query",
		replacement: path.join(packagesDir, "melon-db-query/src/index.ts"),
	},
	{
		find: "@melon/db-react",
		replacement: path.join(packagesDir, "melon-db-react/src/index.ts"),
	},
	{
		find: "@melon/sync",
		replacement: path.join(packagesDir, "melon-sync/src/index.ts"),
	},
	{
		find: "@melon/db",
		replacement: path.join(packagesDir, "melon-db/src/index.ts"),
	},
];

export default defineConfig({
	ssr: {
		noExternal: [/^@melon\//],
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
	],
	resolve: {
		conditions: ["development", "browser", "module", "import", "default"],
		alias: [
			...melonWorkspaceAliases,
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
