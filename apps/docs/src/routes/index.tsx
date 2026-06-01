import { baseOptions } from "@/lib/layout.shared";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	return (
		<HomeLayout {...baseOptions()}>
			<div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
				<h1 className="text-4xl font-bold">Melon</h1>
				<p className="max-w-lg text-fd-muted-foreground">
					Offline-first local database for React Native and TypeScript — a
					modern successor to WatermelonDB.
				</p>
				<Link
					className="rounded-lg bg-fd-primary px-4 py-2 text-fd-primary-foreground"
					to="/docs/$"
					params={{ _splat: "" }}
				>
					Open documentation
				</Link>
			</div>
		</HomeLayout>
	);
}
