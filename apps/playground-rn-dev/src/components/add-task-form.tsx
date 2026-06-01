import { useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";

interface AddTaskFormProps {
	onAdd: (title: string) => Promise<void>;
}

/**
 * Simple form for adding a new open task.
 */
export function AddTaskForm({ onAdd }: AddTaskFormProps): React.ReactElement {
	const [title, setTitle] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(): Promise<void> {
		const trimmed = title.trim();
		if (!trimmed || isSubmitting) return;

		setIsSubmitting(true);
		try {
			await onAdd(trimmed);
			setTitle("");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			style={styles.container}
		>
			<View style={styles.row}>
				<TextInput
					accessibilityLabel="Task title"
					onChangeText={setTitle}
					onSubmitEditing={() => {
						void handleSubmit();
					}}
					placeholder="New task title"
					returnKeyType="done"
					style={styles.input}
					value={title}
				/>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Add task"
					disabled={isSubmitting || title.trim().length === 0}
					onPress={() => {
						void handleSubmit();
					}}
					style={[
						styles.button,
						(isSubmitting || title.trim().length === 0) &&
							styles.buttonDisabled,
					]}
				>
					<Text style={styles.buttonText}>Add</Text>
				</Pressable>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#ddd",
		backgroundColor: "#fafafa",
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	input: {
		flex: 1,
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16,
		backgroundColor: "#fff",
	},
	button: {
		backgroundColor: "#2563eb",
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 8,
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	buttonText: {
		color: "#fff",
		fontWeight: "600",
	},
});
