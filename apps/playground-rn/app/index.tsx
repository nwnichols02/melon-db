import { createQueryFactory } from "@melon/db-query";
import { useQuery, useSync, useWriter } from "@melon/db-react";
import { SyncStatusKind } from "@melon/sync";
import { FlashList } from "@shopify/flash-list";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AddTaskForm } from "@/components/add-task-form";
import { TaskRow } from "@/components/task-row";
import { type Task, taskSchema } from "@/db/schema";

/**
 * Task list screen backed by reactive Melon queries.
 */
export default function TasksScreen(): React.ReactElement {
	const write = useWriter();
	const { sync, status, isSyncing, error } = useSync();
	const [nextId, setNextId] = useState(100);

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
			const id = String(nextId);
			setNextId((value) => value + 1);
			await write(async (tx) => {
				await tx.collection("tasks").insert({
					id,
					title,
					status: "open",
					priority: 1,
					updatedAt: new Date(),
				});
			});
		},
		[write, nextId],
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

	const statusLabel = useMemo(() => {
		if (error) {
			return `Failed: ${error.message}`;
		}
		switch (status.status) {
			case SyncStatusKind.Pulling:
			case SyncStatusKind.Pushing:
				return "Syncing…";
			case SyncStatusKind.Complete:
				return "Synced";
			case SyncStatusKind.Failed:
				return "Failed";
			default:
				return "Idle";
		}
	}, [status.status, error]);

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
