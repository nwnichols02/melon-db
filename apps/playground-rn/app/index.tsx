import { createQueryFactory } from "@melon/db-query";
import { useQuery, useWriter } from "@melon/db-react";
import { FlashList } from "@shopify/flash-list";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AddTaskForm } from "@/components/add-task-form";
import { TaskRow } from "@/components/task-row";
import { type Task, taskSchema } from "@/db/schema";

/**
 * Task list screen backed by reactive Melon queries.
 */
export default function TasksScreen(): React.ReactElement {
	const write = useWriter();
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

	return (
		<SafeAreaView style={styles.container} edges={["bottom"]}>
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
