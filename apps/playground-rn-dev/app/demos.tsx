import { type Task, taskSchema } from "@/db/schema";
import { type QueryBuilder, createQueryFactory } from "@melon/db-query";
import { createMangoCompiler } from "@melon/db-query-mango";
import {
	useDatabase,
	useFindMany,
	useFluentQuery,
	useMangoQuery,
	useQueryCount,
	useRecordState,
} from "@melon/db-react";
import { useCallback, useMemo, useState } from "react";
import { Pressable } from "react-native";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const q = createQueryFactory(taskSchema);
const mangoCompiler = createMangoCompiler();

/**
 * Demonstrates Mango, Prisma-style, fluent builder, and relation includes.
 */
export default function DemosScreen(): React.ReactElement {
	const db = useDatabase();
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const mangoQuery = useMemo(
		() => ({
			selector: { status: "open" },
			sort: [{ priority: "desc" as const }],
			limit: 5,
		}),
		[],
	);
	const mangoOpen = useMangoQuery<Task>("tasks", mangoQuery);

	const prismaArgs = useMemo(
		() => ({
			where: { status: "open" },
			orderBy: { priority: "desc" as const },
			take: 5,
			include: { project: true },
		}),
		[],
	);
	const prismaOpen = useFindMany<Task>("tasks", prismaArgs);

	const fluentWithProjectBuilder = useCallback(
		(b: QueryBuilder<Task>) =>
			b
				.where("status", "eq", "open")
				.include("project")
				.orderBy("priority", "desc")
				.limit(5),
		[],
	);
	const fluentWithProject = useFluentQuery<Task>(
		"tasks",
		fluentWithProjectBuilder,
	);

	const collectionFluentBuilder = useCallback(
		(b: QueryBuilder<Task>) =>
			b
				.where("status", "eq", "open")
				.not((inner) => inner.where("status", "eq", "done"))
				.orderBy("priority", "desc")
				.limit(3),
		[],
	);

	const openCount = useQueryCount(
		useMemo(
			() => q.from<Task>("tasks").where("status", "eq", "open").toAst("count"),
			[],
		),
	);

	const mangoCountQuery = useMemo(
		() =>
			mangoCompiler.compile(
				{ selector: { status: "open" }, mode: "count" },
				"tasks",
				db.schema,
			),
		[db.schema],
	);
	const mangoOpenCount = useQueryCount(mangoCountQuery);

	const selectedState = useRecordState<Task>("tasks", selectedId, {
		enabled: selectedId != null,
	});
	const selectedTask =
		selectedState.status === "ready" ? selectedState.data : null;

	const collectionFluent = useFluentQuery<Task>(
		"tasks",
		collectionFluentBuilder,
	);

	return (
		<SafeAreaView style={styles.container} edges={["bottom"]}>
			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.heading}>Query surface demos</Text>
				<DemoSection title="Mango findMany">
					{mangoOpen.map((task) => (
						<Pressable
							key={task.id}
							onPress={() => setSelectedId(String(task.id))}
						>
							<Text style={styles.row}>
								{task.title} (p{task.priority})
								{selectedId === String(task.id) ? " · selected" : ""}
							</Text>
						</Pressable>
					))}
				</DemoSection>
				<DemoSection title="Prisma-style useFindMany + include">
					{prismaOpen.map((task) => (
						<Text key={task.id} style={styles.row}>
							{task.title}
							{task.project?.name ? ` · ${task.project.name}` : ""}
						</Text>
					))}
				</DemoSection>
				<DemoSection title="Fluent useFluentQuery + include">
					{fluentWithProject.map((task) => (
						<Text key={task.id} style={styles.row}>
							{task.title}
							{task.project?.name ? ` · ${task.project.name}` : ""}
						</Text>
					))}
				</DemoSection>
				<DemoSection title="Counts">
					<Text style={styles.row}>Fluent count: {openCount}</Text>
					<Text style={styles.row}>Mango count: {mangoOpenCount}</Text>
				</DemoSection>
				<DemoSection title="useRecord">
					<Text style={styles.hint}>
						Tap a Mango row above. Status: {selectedState.status}
						{selectedId != null ? ` · id=${selectedId}` : ""}
					</Text>
					{selectedState.status === "error" ? (
						<Text style={styles.error}>
							{selectedState.error.message}
						</Text>
					) : null}
					{selectedTask != null ? (
						<Text style={styles.row}>
							{selectedTask.title} — {selectedTask.status}
						</Text>
					) : (
						<Text style={styles.row}>No task selected</Text>
					)}
				</DemoSection>
				<DemoSection title="Fluent .not() (open, not done)">
					{collectionFluent.map((task) => (
						<Text key={task.id} style={styles.row}>
							{task.title}
						</Text>
					))}
				</DemoSection>
			</ScrollView>
		</SafeAreaView>
	);
}

function DemoSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}): React.ReactElement {
	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>{title}</Text>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	content: {
		padding: 16,
		gap: 16,
	},
	heading: {
		fontSize: 20,
		fontWeight: "700",
		color: "#111",
	},
	section: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: "#f8f8f8",
		gap: 6,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: "#333",
	},
	row: {
		fontSize: 14,
		color: "#444",
	},
	hint: {
		fontSize: 13,
		color: "#666",
	},
	error: {
		fontSize: 13,
		color: "#b00020",
	},
	mono: {
		fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
	},
});
