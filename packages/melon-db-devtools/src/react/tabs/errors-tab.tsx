import type { ReactElement } from "react";

export interface ErrorsTabProps {
	errors: Array<Error & { code?: string }>;
}

/**
 * Lists errors captured by the devtools bridge.
 */
export function ErrorsTab({ errors }: ErrorsTabProps): ReactElement {
	const items = [...errors].reverse();

	if (items.length === 0) {
		return <p style={{ margin: 0, color: "#666" }}>No errors.</p>;
	}

	return (
		<div>
			{items.map((error, index) => (
				<div
					key={`${index}-${error.message}`}
					style={{
						borderBottom: "1px solid #eee",
						color: "#b00020",
						padding: "8px 0",
					}}
				>
					{error.code ? `[${error.code}] ` : ""}
					{error.message}
				</div>
			))}
		</div>
	);
}
