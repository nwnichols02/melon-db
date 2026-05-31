import { createQueryFactory } from "@melon/db-query";
import { useQuery, useSync, useWriter } from "@melon/db-react";
import { SyncStatusKind } from "@melon/sync";
import { FlashList } from "@shopify/flash-list";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AddTaskForm } from "@/components/add-task-form";
import { TaskRow } from "@/components/task-row";
import { createTaskId } from "@/db/create-task-id";
import { type Task, taskSchema } from "@/db/schema";
import { devNetworkMonitor } from "@/sync/network-monitor";

/**
 * Task list screen backed by reactive Melon queries.
 */
export default function TasksScreen(): React.ReactElement {
	const write = useWriter();
	const { sync, status, isSyncing, isPaused, retryCount, error, cancel } =
		useSync();
	const [offlineSimulated, setOfflineSimulated] = useState(false);

	const openTasksQuery = useMemo(
		() =>
			createQueryFactory(taskSchema)
				.from<Task>("tasks")
				.where("status", "eq", "open")
				.orderBy("priority", "desc")
				.toAst(),
		[],
	);

	const tasks = useQuery<Task>(openTasksQuery);

	const handleAdd = useCallback(
		async (title: string) => {
			await write(async (tx) => {
				await tx.collection("tasks").insert({
					id: createTaskId(),
					title,
					status: "open",
					priority: 1,
					updatedAt: new Date(),
				});
			});
		},
		[write],
	);

	const handleComplete = useCallback(
		async (id: string) => {
			await write(async (tx) => {
				await tx.collection("tasks").update(id, {
					status: "closed",
					updatedAt: new Date(),
				});
			});
		},
		[write],
	);

	const handleSync = useCallback(async () => {
		try {
			await sync();
		} catch {
			// Error surfaced via useSync().error
		}
	}, [sync]);

	const handleToggleOffline = useCallback(() => {
		setOfflineSimulated((current) => {
			const next = !current;
			devNetworkMonitor.setOnline(!next);
			return next;
		});
	}, []);

	const handleConflictDemo = useCallback(async () => {
		await write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "conflict-demo",
				title: "Local conflict version",
				status: "open",
				priority: 99,
				updatedAt: new Date(),
			});
		});
		try {
			await sync();
		} catch {
			// surfaced via error state
		}
	}, [write, sync]);

	const statusLabel = useMemo(() => {
		if (error) {
			return `Failed: ${error.message}`;
		}
		if (isPaused || offlineSimulated) {
			return "Paused (offline)";
		}
		if (status.status === SyncStatusKind.Retrying) {
			return `Retrying (${status.attempt}/3)…`;
		}
		switch (status.status) {
			case SyncStatusKind.Pulling:
			case SyncStatusKind.Pushing:
				return retryCount > 0
					? `Syncing… (retry ${retryCount})`
					: "Syncing…";
			case SyncStatusKind.Complete:
				return "Synced";
			case SyncStatusKind.Failed:
				return "Failed";
			default:
				return "Idle";
		}
	}, [status, error, isPaused, offlineSimulated, retryCount]);

	return (
		<SafeAreaView style={styles.container} edges={["bottom"]}>
			<View style={styles.syncBar}>
				<Text style={styles.syncStatus}>{statusLabel}</Text>
				<Pressable
					disabled={isSyncing}
					onPress={handleSync}
					style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
				>
					<Text style={styles.syncButtonText}>
						{isSyncing ? "Syncing…" : "Sync now"}
					</Text>
				</Pressable>
			</View>
			<View style={styles.devControls}>
				<Pressable onPress={handleToggleOffline} style={styles.devButton}>
					<Text style={styles.devButtonText}>
						{offlineSimulated ? "Go online" : "Simulate offline"}
					</Text>
				</Pressable>
				<Pressable onPress={handleConflictDemo} style={styles.devButton}>
					<Text style={styles.devButtonText}>Conflict demo</Text>
				</Pressable>
				{isSyncing ? (
					<Pressable onPress={cancel} style={styles.devButton}>
						<Text style={styles.devButtonText}>Cancel</Text>
					</Pressable>
				) : null}
			</View>
			<AddTaskForm onAdd={handleAdd} />
			{tasks.length === 0 ? (
				<View style={styles.empty}>
					<Text style={styles.emptyTitle}>No open tasks</Text>
					<Text style={styles.emptyHint}>Add a task above to get started.</Text>
				</View>
			) : (
				<FlashList
					data={tasks}
					keyExtractor={(item) => item.id}
					renderItem={({ item }) => (
						<TaskRow onComplete={handleComplete} task={item} />
					)}
				/>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	syncBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#ddd",
	},
	syncStatus: {
		flex: 1,
		fontSize: 13,
		color: "#666",
		marginRight: 12,
	},
	syncButton: {
		backgroundColor: "#111",
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 8,
	},
	syncButtonDisabled: {
		opacity: 0.5,
	},
	syncButtonText: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600",
	},
	devControls: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#eee",
	},
	devButton: {
		backgroundColor: "#f3f3f3",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 6,
	},
	devButtonText: {
		fontSize: 12,
		color: "#333",
	},
	empty: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 24,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#333",
	},
	emptyHint: {
		marginTop: 8,
		fontSize: 14,
		color: "#666",
		textAlign: "center",
	},
});
