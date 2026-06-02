import { MelonLogo } from "@/components/melon-logo";
import { baseOptions } from "@/lib/layout.shared";
import { gitConfig } from "@/lib/shared";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	return (
		<HomeLayout
			{...baseOptions()}
			className="relative items-center justify-center overflow-hidden"
		>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(28_92%_52%/0.12),transparent_60%)]"
			/>
			<div className="relative flex w-full max-w-2xl flex-col items-center gap-6 px-6 text-center">
				<MelonLogo showWordmark={false} size="lg" />
				<h1 className="text-4xl font-bold tracking-tight md:text-5xl">Melon</h1>
				<p className="max-w-lg text-fd-muted-foreground text-lg">
					Offline-first local database for React Native and TypeScript — a
					modern successor to WatermelonDB.{" "}
					<Link
						className="text-fd-primary underline-offset-4 hover:underline"
						params={{ _splat: "about" }}
						to="/docs/$"
					>
						About Melon
					</Link>
				</p>
				<div className="flex flex-wrap items-center justify-center gap-3">
					<Link
						className="rounded-lg bg-fd-primary px-5 py-2.5 font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
						params={{ _splat: "" }}
						to="/docs/$"
					>
						Open documentation
					</Link>
					<a
						className="rounded-lg border border-fd-border px-5 py-2.5 font-medium text-fd-accent-foreground transition-colors hover:bg-fd-accent"
						href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
						rel="noreferrer"
						target="_blank"
					>
						View on GitHub
					</a>
				</div>
			</div>
		</HomeLayout>
	);
}
