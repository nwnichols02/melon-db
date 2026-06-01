import index from "../index.html";

const contentDir = `${import.meta.dir}/content`;

/**
 * Serves the Melon documentation site and markdown content API.
 */
Bun.serve({
	port: Number(process.env.PORT ?? 3000),
	routes: {
		"/": index,
		"/content/:name": (req) => {
			const name = req.params.name;
			if (!name?.endsWith(".md")) {
				return new Response("Not found", { status: 404 });
			}
			const file = Bun.file(`${contentDir}/${name}`);
			return new Response(file, {
				headers: { "Content-Type": "text/markdown; charset=utf-8" },
			});
		},
	},
	development: {
		hmr: true,
		console: true,
	},
});

console.log(
	`Melon docs running at http://localhost:${process.env.PORT ?? 3000}`,
);
