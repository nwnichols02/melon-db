import { baseOptions } from "@/lib/layout.shared";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { DefaultNotFound } from "fumadocs-ui/layouts/home/not-found";

/**
 * 404 page for unknown routes.
 */
export function NotFound() {
	return (
		<HomeLayout {...baseOptions()}>
			<DefaultNotFound />
		</HomeLayout>
	);
}
