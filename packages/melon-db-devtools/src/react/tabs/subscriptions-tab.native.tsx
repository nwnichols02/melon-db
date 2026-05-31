import type { ReactElement } from "react";
import { StyleSheet, Text, View } from "react-native";

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
		return <Text style={styles.empty}>No subscriptions yet.</Text>;
	}

	return (
		<View>
			{items.map((event, index) => (
				<View key={`${index}-${event.collection}`} style={styles.row}>
					<Text>
						{event.collection} — {event.active ? "active" : "inactive"}
					</Text>
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	empty: {
		color: "#666",
	},
	row: {
		borderBottomColor: "#eee",
		borderBottomWidth: StyleSheet.hairlineWidth,
		paddingVertical: 8,
	},
});
