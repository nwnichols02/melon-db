import type { SyncDebugSnapshot } from "@melon-db/db";
import { type ReactElement, useState } from "react";
import { formatJson } from "../format-json.ts";

export interface SyncTabProps {
	sync: SyncDebugSnapshot[];
}

/**
 * Lists sync phase events captured during synchronize().
 */
export function SyncTab({ sync }: SyncTabProps): ReactElement {
	const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
	const items = [...sync].reverse();

	if (items.length === 0) {
		return <p style={{ margin: 0, color: "#666" }}>No sync events yet.</p>;
	}

	return (
		<div>
			{items.map((event, index) => {
				const isExpanded = expandedIndex === index;
				const label = `${event.phase}${event.durationMs !== undefined ? ` — ${event.durationMs.toFixed(1)}ms` : ""}`;

				return (
					<div
						key={`${index}-${event.phase}-${event.timestamp}`}
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
								{formatJson(event)}
							</pre>
						) : null}
					</div>
				);
			})}
		</div>
	);
}
