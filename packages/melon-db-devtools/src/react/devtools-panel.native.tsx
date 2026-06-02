import { type ReactElement, useState } from "react";
import {
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useMelonDevtools, useMelonDevtoolsLog } from "./devtools-context.tsx";
import { ErrorsTab } from "./tabs/errors-tab";
import { QueriesTab } from "./tabs/queries-tab";
import { SubscriptionsTab } from "./tabs/subscriptions-tab";
import { SyncTab } from "./tabs/sync-tab";
import { WritesTab } from "./tabs/writes-tab";

const TabKind = {
	Queries: "queries",
	Writes: "writes",
	Sync: "sync",
	Subs: "subs",
	Errors: "errors",
} as const;

type TabKind = (typeof TabKind)[keyof typeof TabKind];

const TABS: Array<{ id: TabKind; label: string }> = [
	{ id: TabKind.Queries, label: "Queries" },
	{ id: TabKind.Writes, label: "Writes" },
	{ id: TabKind.Sync, label: "Sync" },
	{ id: TabKind.Subs, label: "Subs" },
	{ id: TabKind.Errors, label: "Errors" },
];

/**
 * React Native devtools overlay with floating button and modal inspector.
 */
export function MelonDevtoolsPanel(): ReactElement | null {
	const { bridge } = useMelonDevtools();
	const log = useMelonDevtoolsLog();
	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<TabKind>(TabKind.Queries);

	if (!__DEV__) {
		return null;
	}

	return (
		<>
			<Pressable onPress={() => setOpen(true)} style={styles.fab}>
				<Text style={styles.fabText}>DB</Text>
			</Pressable>
			<Modal animationType="slide" visible={open}>
				<View style={styles.container}>
					<View style={styles.header}>
						<Text style={styles.title}>Melon Devtools</Text>
						<View style={styles.headerActions}>
							<Pressable
								onPress={() => bridge.clear()}
								style={styles.clearButton}
							>
								<Text style={styles.clearButtonText}>Clear</Text>
							</Pressable>
							<Pressable onPress={() => setOpen(false)}>
								<Text style={styles.closeButton}>×</Text>
							</Pressable>
						</View>
					</View>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.tabBar}
					>
						{TABS.map((tab) => (
							<Pressable
								key={tab.id}
								onPress={() => setActiveTab(tab.id)}
								style={[styles.tab, activeTab === tab.id && styles.tabActive]}
							>
								<Text
									style={[
										styles.tabText,
										activeTab === tab.id && styles.tabTextActive,
									]}
								>
									{tab.label}
								</Text>
							</Pressable>
						))}
					</ScrollView>
					<ScrollView style={styles.content}>
						{activeTab === TabKind.Queries ? (
							<QueriesTab queries={log.queries} />
						) : null}
						{activeTab === TabKind.Writes ? (
							<WritesTab writes={log.writes} />
						) : null}
						{activeTab === TabKind.Sync ? <SyncTab sync={log.sync} /> : null}
						{activeTab === TabKind.Subs ? (
							<SubscriptionsTab subscriptions={log.subscriptions} />
						) : null}
						{activeTab === TabKind.Errors ? (
							<ErrorsTab errors={log.errors} />
						) : null}
					</ScrollView>
				</View>
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: "#fff",
		flex: 1,
		paddingTop: 48,
	},
	header: {
		alignItems: "center",
		borderBottomColor: "#eee",
		borderBottomWidth: StyleSheet.hairlineWidth,
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	title: {
		fontSize: 18,
		fontWeight: "600",
	},
	headerActions: {
		alignItems: "center",
		flexDirection: "row",
		gap: 12,
	},
	clearButton: {
		backgroundColor: "#f5f5f5",
		borderColor: "#ddd",
		borderRadius: 6,
		borderWidth: 1,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	clearButtonText: {
		fontSize: 13,
	},
	closeButton: {
		fontSize: 28,
		lineHeight: 28,
	},
	tabBar: {
		borderBottomColor: "#eee",
		borderBottomWidth: StyleSheet.hairlineWidth,
		flexGrow: 0,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	tab: {
		backgroundColor: "#f5f5f5",
		borderRadius: 6,
		marginRight: 8,
		paddingHorizontal: 12,
		paddingVertical: 6,
	},
	tabActive: {
		backgroundColor: "#111",
	},
	tabText: {
		color: "#333",
		fontSize: 13,
	},
	tabTextActive: {
		color: "#fff",
	},
	content: {
		flex: 1,
		padding: 16,
	},
	fab: {
		alignItems: "center",
		backgroundColor: "#111",
		borderRadius: 24,
		bottom: 24,
		height: 48,
		justifyContent: "center",
		position: "absolute",
		right: 24,
		width: 48,
		zIndex: 9999,
	},
	fabText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "700",
	},
});
