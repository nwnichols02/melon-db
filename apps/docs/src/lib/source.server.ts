import { docs } from "collections/server";
import { loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { docsRoute } from "./shared";

export const source = loader({
	source: docs.toFumadocsSource(),
	baseUrl: docsRoute,
	plugins: [lucideIconsPlugin()],
});
