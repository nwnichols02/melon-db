import type { QueryDebugSnapshot } from "@melon-db/db";
import { type ReactElement, useState } from "react";
import { formatJson } from "../format-json.ts";
import {
	formatQueryParams,
	formatQueryPlan,
	hasSqlSection,
} from "../query-snapshot-sections.ts";

export interface QueriesTabProps {
	queries: QueryDebugSnapshot[];
}

/**
 * Lists query debug snapshots with expandable Plan, SQL, params, and AST details.
 */
export function QueriesTab({ queries }: QueriesTabProps): ReactElement {
	const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
	const items = [...queries].reverse();

	if (items.length === 0) {
		return <p style={{ margin: 0, color: "#666" }}>No queries yet.</p>;
	}

	return (
		<div>
			{items.map((query, index) => {
				const isExpanded = expandedIndex === index;
				const label = `${query.ast.collection} (${query.ast.mode})${query.durationMs !== undefined ? ` — ${query.durationMs.toFixed(1)}ms` : ""}`;
				const paramsText = formatQueryParams(query);

				return (
					<div
						key={`${index}-${query.ast.collection}-${query.durationMs ?? 0}`}
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
							<div style={{ marginTop: 8 }}>
								{hasSqlSection(query) ? (
									<>
										<strong>SQL</strong>
										<pre
											style={{
												background: "#f5f5f5",
												fontSize: 12,
												overflow: "auto",
												padding: 8,
											}}
										>
											{query.sql}
										</pre>
									</>
								) : null}
								{paramsText ? (
									<>
										<strong>Params</strong>
										<pre
											style={{
												background: "#f5f5f5",
												fontSize: 12,
												overflow: "auto",
												padding: 8,
											}}
										>
											{paramsText}
										</pre>
									</>
								) : null}
								<strong>Plan</strong>
								<pre
									style={{
										background: "#f5f5f5",
										fontSize: 12,
										overflow: "auto",
										padding: 8,
									}}
								>
									{formatQueryPlan(query)}
								</pre>
								<strong>AST</strong>
								<pre
									style={{
										background: "#f5f5f5",
										fontSize: 12,
										overflow: "auto",
										padding: 8,
									}}
								>
									{formatJson(query.ast)}
								</pre>
							</div>
						) : null}
					</div>
				);
			})}
		</div>
	);
}
