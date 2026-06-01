import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { NotFound } from "@/components/not-found";

/**
 * TanStack Router factory required by TanStack Start RC.
 */
export function getRouter() {
	return createTanStackRouter({
		routeTree,
		defaultPreload: "intent",
		scrollRestoration: true,
		defaultNotFoundComponent: NotFound,
	});
}
