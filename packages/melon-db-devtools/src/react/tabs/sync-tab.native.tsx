import type { SyncDebugSnapshot } from "@melon-db/db";
import { type ReactElement, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
		return <Text style={styles.empty}>No sync events yet.</Text>;
	}

	return (
		<View>
			{items.map((event, index) => {
				const isExpanded = expandedIndex === index;
				const label = `${event.phase}${event.durationMs !== undefined ? ` — ${event.durationMs.toFixed(1)}ms` : ""}`;

				return (
					<View
						key={`${index}-${event.phase}-${event.timestamp}`}
						style={styles.row}
					>
						<Pressable
							onPress={() => setExpandedIndex(isExpanded ? null : index)}
						>
							<Text style={styles.label}>{label}</Text>
						</Pressable>
						{isExpanded ? (
							<Text style={styles.code}>{formatJson(event)}</Text>
						) : null}
					</View>
				);
			})}
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
	label: {
		fontWeight: "600",
	},
	code: {
		backgroundColor: "#f5f5f5",
		fontFamily: "Menlo",
		fontSize: 11,
		marginTop: 8,
		padding: 8,
	},
});
