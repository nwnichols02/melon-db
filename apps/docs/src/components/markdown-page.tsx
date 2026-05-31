import type { ReactElement } from "react";

export interface MarkdownPageProps {
	markdown: string;
}

/**
 * Renders a minimal subset of markdown as HTML-safe React elements.
 */
export function MarkdownPage({ markdown }: MarkdownPageProps): ReactElement {
	const blocks = parseMarkdown(markdown);

	return (
		<article style={{ lineHeight: 1.6, maxWidth: 720 }}>
			{blocks}
		</article>
	);
}

function parseMarkdown(markdown: string): ReactElement[] {
	const lines = markdown.split("\n");
	const elements: ReactElement[] = [];
	let index = 0;
	let key = 0;

	while (index < lines.length) {
		const line = lines[index] ?? "";

		if (line.startsWith("# ")) {
			elements.push(<h1 key={key++}>{line.slice(2)}</h1>);
			index += 1;
			continue;
		}

		if (line.startsWith("## ")) {
			elements.push(<h2 key={key++}>{line.slice(3)}</h2>);
			index += 1;
			continue;
		}

		if (line.startsWith("```")) {
			const codeLines: string[] = [];
			index += 1;
			while (index < lines.length && !(lines[index] ?? "").startsWith("```")) {
				codeLines.push(lines[index] ?? "");
				index += 1;
			}
			index += 1;
			elements.push(
				<pre
					key={key++}
					style={{
						background: "#f5f5f5",
						borderRadius: 8,
						fontSize: 13,
						overflow: "auto",
						padding: 16,
					}}
				>
					<code>{codeLines.join("\n")}</code>
				</pre>,
			);
			continue;
		}

		if (line.startsWith("|")) {
			const tableLines: string[] = [];
			while (index < lines.length && (lines[index] ?? "").startsWith("|")) {
				tableLines.push(lines[index] ?? "");
				index += 1;
			}
			const rows = tableLines.filter((row) => !row.includes("---"));
			elements.push(
				<table
					key={key++}
					style={{
						borderCollapse: "collapse",
						marginBottom: 16,
						width: "100%",
					}}
				>
					<tbody>
						{rows.map((row, rowIndex) => {
							const cells = row
								.split("|")
								.map((cell) => cell.trim())
								.filter(Boolean);
							const CellTag = rowIndex === 0 ? "th" : "td";
							return (
								<tr key={rowIndex}>
									{cells.map((cell, cellIndex) => (
										<CellTag
											key={cellIndex}
											style={{
												border: "1px solid #ddd",
												padding: "8px 12px",
												textAlign: "left",
											}}
										>
											{cell}
										</CellTag>
									))}
								</tr>
							);
						})}
					</tbody>
				</table>,
			);
			continue;
		}

		if (line.trim() === "") {
			index += 1;
			continue;
		}

		elements.push(<p key={key++}>{line}</p>);
		index += 1;
	}

	return elements;
}
