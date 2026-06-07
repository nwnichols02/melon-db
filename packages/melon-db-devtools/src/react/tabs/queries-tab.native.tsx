import type { QueryDebugSnapshot } from "@melon-db/db";
import { type ReactElement, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
		return <Text style={styles.empty}>No queries yet.</Text>;
	}

	return (
		<View>
			{items.map((query, index) => {
				const isExpanded = expandedIndex === index;
				const label = `${query.ast.collection} (${query.ast.mode})${query.durationMs !== undefined ? ` — ${query.durationMs.toFixed(1)}ms` : ""}`;
				const paramsText = formatQueryParams(query);

				return (
					<View key={`${index}-${query.ast.collection}`} style={styles.row}>
						<Pressable
							onPress={() => setExpandedIndex(isExpanded ? null : index)}
						>
							<Text style={styles.label}>{label}</Text>
						</Pressable>
						{isExpanded ? (
							<ScrollView style={styles.details}>
								{hasSqlSection(query) ? (
									<>
										<Text style={styles.sectionTitle}>SQL</Text>
										<Text style={styles.code}>{query.sql}</Text>
									</>
								) : null}
								{paramsText ? (
									<>
										<Text style={styles.sectionTitle}>Params</Text>
										<Text style={styles.code}>{paramsText}</Text>
									</>
								) : null}
								<Text style={styles.sectionTitle}>Plan</Text>
								<Text style={styles.code}>{formatQueryPlan(query)}</Text>
								<Text style={styles.sectionTitle}>AST</Text>
								<Text style={styles.code}>{formatJson(query.ast)}</Text>
							</ScrollView>
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
	details: {
		marginTop: 8,
		maxHeight: 280,
	},
	sectionTitle: {
		fontWeight: "600",
		marginTop: 8,
	},
	code: {
		backgroundColor: "#f5f5f5",
		fontFamily: "Menlo",
		fontSize: 11,
		marginTop: 4,
		padding: 8,
	},
});
