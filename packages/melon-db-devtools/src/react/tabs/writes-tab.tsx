import type { AdapterWriteOperation } from "@melon-db/db";
import { type ReactElement, useState } from "react";
import { formatJson } from "../format-json.ts";

export interface WritesTabProps {
	writes: AdapterWriteOperation[];
}

/**
 * Lists write operations captured by the devtools bridge.
 */
export function WritesTab({ writes }: WritesTabProps): ReactElement {
	const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
	const items = [...writes].reverse();

	if (items.length === 0) {
		return <p style={{ margin: 0, color: "#666" }}>No writes yet.</p>;
	}

	return (
		<div>
			{items.map((write, index) => {
				const isExpanded = expandedIndex === index;
				const label =
					write.type === "batch"
						? `batch (${write.operations.length} ops)`
						: `${write.type} ${write.collection}`;

				return (
					<div
						key={`${index}-${write.type}`}
						style={{
							borderBottom: "1px solid #eee",
							padding: "8px 0",
						}}
					>
						<button
							type="button"
							onClick={() => setExpandedIndex(isExpanded ? null : index)}
							style={{
								background: "none",
								border: "none",
								cursor: "pointer",
								fontWeight: 600,
								padding: 0,
								textAlign: "left",
								width: "100%",
							}}
						>
							{label}
						</button>
						{isExpanded ? (
							<pre
								style={{
									background: "#f5f5f5",
									fontSize: 12,
									marginTop: 8,
									overflow: "auto",
									padding: 8,
								}}
							>
								{formatJson(write)}
							</pre>
						) : null}
					</div>
				);
			})}
		</div>
	);
}
