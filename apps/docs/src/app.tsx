import { type ReactElement, useState } from "react";
import { LivePlayground } from "./components/live-playground.tsx";
import { MarkdownPageLoader } from "./components/markdown-page-loader.tsx";
import { SyncPlayground } from "./components/sync-playground.tsx";

const PageKind = {
	Home: "home",
	GettingStarted: "getting-started",
	Architecture: "architecture",
	Sync: "sync",
	Migration: "migration",
	Playground: "playground",
	SyncPlayground: "sync-playground",
} as const;

type PageKind = (typeof PageKind)[keyof typeof PageKind];

const NAV: Array<{ id: PageKind; label: string }> = [
	{ id: PageKind.Home, label: "Home" },
	{ id: PageKind.GettingStarted, label: "Getting started" },
	{ id: PageKind.Architecture, label: "Architecture" },
	{ id: PageKind.Sync, label: "Sync" },
	{ id: PageKind.Migration, label: "Migration" },
	{ id: PageKind.Playground, label: "Playground" },
	{ id: PageKind.SyncPlayground, label: "Sync playground" },
];

/**
 * Root docs application shell with sidebar navigation.
 */
export function App(): ReactElement {
	const [page, setPage] = useState<PageKind>(PageKind.Home);

	return (
		<div style={{ display: "flex", minHeight: "100vh" }}>
			<nav
				style={{
					background: "#111",
					color: "#fff",
					minWidth: 220,
					padding: "24px 16px",
				}}
			>
				<h1 style={{ fontSize: 20, margin: "0 0 24px" }}>Melon</h1>
				<ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
					{NAV.map((item) => (
						<li key={item.id} style={{ marginBottom: 8 }}>
							<button
								onClick={() => setPage(item.id)}
								style={{
									background: page === item.id ? "#333" : "transparent",
									border: "none",
									borderRadius: 6,
									color: "#fff",
									cursor: "pointer",
									padding: "8px 12px",
									textAlign: "left",
									width: "100%",
								}}
								type="button"
							>
								{item.label}
							</button>
						</li>
					))}
				</ul>
			</nav>
			<main style={{ flex: 1, padding: "32px 40px" }}>
				{page === PageKind.Home ? (
					<div>
						<h1>Melon documentation</h1>
						<p>
							Offline-first local database for React Native and TypeScript.
							Browse guides or try the live playgrounds.
						</p>
						<ul>
							<li>
								<button
									onClick={() => setPage(PageKind.GettingStarted)}
									style={{
										background: "none",
										border: "none",
										color: "#0066cc",
										cursor: "pointer",
										padding: 0,
										textDecoration: "underline",
									}}
									type="button"
								>
									Getting started
								</button>
							</li>
							<li>
								<button
									onClick={() => setPage(PageKind.Playground)}
									style={{
										background: "none",
										border: "none",
										color: "#0066cc",
										cursor: "pointer",
										padding: 0,
										textDecoration: "underline",
									}}
									type="button"
								>
									Live CRUD playground
								</button>
							</li>
						</ul>
					</div>
				) : null}
				{page === PageKind.GettingStarted ? (
					<MarkdownPageLoader path="getting-started.md" />
				) : null}
				{page === PageKind.Architecture ? (
					<MarkdownPageLoader path="architecture.md" />
				) : null}
				{page === PageKind.Sync ? <MarkdownPageLoader path="sync.md" /> : null}
				{page === PageKind.Migration ? (
					<MarkdownPageLoader path="migration.md" />
				) : null}
				{page === PageKind.Playground ? <LivePlayground /> : null}
				{page === PageKind.SyncPlayground ? <SyncPlayground /> : null}
			</main>
		</div>
	);
}
