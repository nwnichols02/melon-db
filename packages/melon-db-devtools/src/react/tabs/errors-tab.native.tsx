import type { ReactElement } from "react";
import { StyleSheet, Text, View } from "react-native";

export interface ErrorsTabProps {
	errors: Array<Error & { code?: string }>;
}

/**
 * Lists errors captured by the devtools bridge.
 */
export function ErrorsTab({ errors }: ErrorsTabProps): ReactElement {
	const items = [...errors].reverse();

	if (items.length === 0) {
		return <Text style={styles.empty}>No errors.</Text>;
	}

	return (
		<View>
			{items.map((error, index) => (
				<View key={`${index}-${error.message}`} style={styles.row}>
					<Text style={styles.error}>
						{error.code ? `[${error.code}] ` : ""}
						{error.message}
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
	error: {
		color: "#b00020",
	},
});
