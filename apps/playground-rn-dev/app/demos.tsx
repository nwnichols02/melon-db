import { type Task, taskSchema } from "@/db/schema";
import { createQueryFactory } from "@melon/db-query";
import { createMangoCompiler } from "@melon/db-query-mango";
import {
	useDatabase,
	useFindMany,
	useFluentQuery,
	useMangoQuery,
	useQueryCount,
} from "@melon/db-react";
import { useMemo } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const q = createQueryFactory(taskSchema);
const mangoCompiler = createMangoCompiler();

/**
 * Demonstrates Mango, Prisma-style, fluent builder, and relation includes.
 */
export default function DemosScreen(): React.ReactElement {
	const db = useDatabase();

	const mangoOpen = useMangoQuery<Task>("tasks", {
		selector: { status: "open" },
		sort: [{ priority: "desc" }],
		limit: 5,
	});

	const prismaOpen = useFindMany<Task>("tasks", {
		where: { status: "open" },
		orderBy: { priority: "desc" },
		take: 5,
		include: { project: true },
	});

	const fluentWithProject = useFluentQuery<Task>(
		"tasks",
		(b) =>
			b
				.where("status", "eq", "open")
				.include("project")
				.orderBy("priority", "desc")
				.limit(5),
	);

	const openCount = useQueryCount(
		useMemo(
			() =>
				q
					.from<Task>("tasks")
					.where("status", "eq", "open")
					.toAst("count"),
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

	return (
		<SafeAreaView style={styles.container} edges={["bottom"]}>
			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.heading}>Query surface demos</Text>
				<DemoSection title="Mango findMany">
					{mangoOpen.map((task) => (
						<Text key={task.id} style={styles.row}>
							{task.title} (p{task.priority})
						</Text>
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
				<DemoSection title="Builder on collection">
					<Text style={styles.hint}>
						Main list uses{" "}
						<Text style={styles.mono}>collection.query((b) =&gt; …)</Text> with
						project includes.
					</Text>
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
	mono: {
		fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
	},
});
