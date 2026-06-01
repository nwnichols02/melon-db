import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import mdx from "fumadocs-mdx/vite";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
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
		alias: {
			"@": path.join(rootDir, "src"),
			"collections/server": path.join(rootDir, ".source/server.ts"),
			"collections/browser": path.join(rootDir, ".source/browser.ts"),
			tslib: "tslib/tslib.es6.js",
		},
	},
});
