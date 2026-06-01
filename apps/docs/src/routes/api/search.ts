import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";

export const Route = createFileRoute("/api/search")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const { source } = await import("@/lib/source.server");
				const server = createFromSource(source, {
					language: "english",
				});
				return server.GET(request);
			},
		},
	},
});
