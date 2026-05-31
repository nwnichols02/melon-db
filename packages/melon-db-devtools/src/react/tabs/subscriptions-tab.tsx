import type { ReactElement } from "react";

export interface SubscriptionsTabProps {
	subscriptions: Array<{ collection: string; active: boolean }>;
}

/**
 * Lists subscription activation events.
 */
export function SubscriptionsTab({
	subscriptions,
}: SubscriptionsTabProps): ReactElement {
	const items = [...subscriptions].reverse();

	if (items.length === 0) {
		return <p style={{ margin: 0, color: "#666" }}>No subscriptions yet.</p>;
	}

	return (
		<div>
			{items.map((event, index) => (
				<div
					key={`${index}-${event.collection}-${event.active}`}
					style={{
						borderBottom: "1px solid #eee",
						padding: "8px 0",
					}}
				>
					{event.collection} — {event.active ? "active" : "inactive"}
				</div>
			))}
		</div>
	);
}
