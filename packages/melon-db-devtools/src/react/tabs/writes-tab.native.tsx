import type { AdapterWriteOperation } from "@melon/db";
import { type ReactElement, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
		return <Text style={styles.empty}>No writes yet.</Text>;
	}

	return (
		<View>
			{items.map((write, index) => {
				const isExpanded = expandedIndex === index;
				const label =
					write.type === "batch"
						? `batch (${write.operations.length} ops)`
						: `${write.type} ${write.collection}`;

				return (
					<View key={`${index}-${write.type}`} style={styles.row}>
						<Pressable
							onPress={() => setExpandedIndex(isExpanded ? null : index)}
						>
							<Text style={styles.label}>{label}</Text>
						</Pressable>
						{isExpanded ? (
							<Text style={styles.code}>{formatJson(write)}</Text>
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
