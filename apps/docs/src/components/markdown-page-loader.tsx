import { useEffect, useState, type ReactElement } from "react";
import { MarkdownPage } from "./markdown-page.tsx";

export interface MarkdownPageLoaderProps {
	path: string;
}

/**
 * Fetches and renders a markdown content page from the docs server.
 */
export function MarkdownPageLoader({
	path,
}: MarkdownPageLoaderProps): ReactElement {
	const [markdown, setMarkdown] = useState<string>("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setError(null);
		void fetch(`/content/${path}`)
			.then((response) => {
				if (!response.ok) {
					throw new Error(`Failed to load ${path}`);
				}
				return response.text();
			})
			.then((text) => {
				if (!cancelled) {
					setMarkdown(text);
				}
			})
			.catch((loadError: unknown) => {
				if (!cancelled) {
					setError(
						loadError instanceof Error
							? loadError.message
							: "Failed to load page",
					);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [path]);

	if (error) {
		return <p style={{ color: "#b00020" }}>{error}</p>;
	}

	if (!markdown) {
		return <p>Loading…</p>;
	}

	return <MarkdownPage markdown={markdown} />;
}
