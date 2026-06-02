import type { ReactElement } from "react";
import { StyleSheet, Text, View } from "react-native";

/**
 * Placeholder for prd-4 sliding-window retention diagnostics (Phase 31+).
 */
export function RetentionTab(): ReactElement {
	return (
		<View>
			<Text style={styles.text}>
				Sliding window retention (local prune ledger, window policies, pressure
				modes) is planned in prd-4. Sync pull/push remains the source of scope;
				pruning is a separate client subsystem.
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	text: {
		color: "#666",
	},
});
