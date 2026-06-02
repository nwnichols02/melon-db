import type { Task } from "@/db/schema";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface TaskRowProps {
	task: Task;
	onComplete: (id: string) => void;
	onDelete?: (id: string) => void;
}

/**
 * Renders a single open task row with a complete action.
 */
export function TaskRow({
	task,
	onComplete,
	onDelete,
}: TaskRowProps): React.ReactElement {
	return (
		<View style={styles.row}>
			<View style={styles.content}>
				<Text style={styles.title}>{task.title}</Text>
				<Text style={styles.meta}>
					Priority {task.priority} · {task.id}
					{task.project?.name ? ` · ${task.project.name}` : ""}
				</Text>
			</View>
			<View style={styles.actions}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`Complete ${task.title}`}
					onPress={() => onComplete(task.id)}
					style={[styles.button, styles.doneButton]}
				>
					<Text style={styles.buttonText}>Done</Text>
				</Pressable>
				{onDelete ? (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={`Delete ${task.title}`}
						onPress={() => onDelete(task.id)}
						style={[styles.button, styles.deleteButton]}
					>
						<Text style={styles.buttonText}>Delete</Text>
					</Pressable>
				) : null}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#ddd",
		gap: 12,
	},
	content: {
		flex: 1,
	},
	title: {
		fontSize: 16,
		fontWeight: "600",
		color: "#111",
	},
	meta: {
		marginTop: 4,
		fontSize: 13,
		color: "#666",
	},
	actions: {
		flexDirection: "row",
		gap: 8,
	},
	button: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
	},
	doneButton: {
		backgroundColor: "#16a34a",
	},
	deleteButton: {
		backgroundColor: "#dc2626",
	},
	buttonText: {
		color: "#fff",
		fontWeight: "600",
		fontSize: 14,
	},
});
