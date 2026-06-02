import {
	type DeviceBenchMode,
	type DeviceBenchScale,
	runDeviceBenchmark,
} from "@/bench/run-device-benchmark";
import type {
	BenchResult,
	RnMelonVsWdbReport,
	RnParityReport,
} from "@melon/db-sqlite/bench";
import { getMelonSQLiteNativeMode } from "@melon/db-sqlite-native";
import { Paths } from "expo-file-system";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Platform,
	Pressable,
	ScrollView,
	Share,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function toFilesystemPath(uri: string): string {
	if (!uri.startsWith("file://")) {
		return uri;
	}
	return decodeURIComponent(uri.replace(/^file:\/\//, ""));
}

/**
 * Dev-only on-device benchmark screen (Melon native vs WatermelonDB).
 */
export default function BenchmarkScreen(): React.ReactElement {
	const router = useRouter();
	const [scale, setScale] = useState<DeviceBenchScale>(10_000);
	const [running, setRunning] = useState(false);
	const [progress, setProgress] = useState<string | null>(null);
	const [results, setResults] = useState<BenchResult[]>([]);
	const [report, setReport] = useState<RnParityReport | null>(null);
	const [melonVsWdb, setMelonVsWdb] = useState<RnMelonVsWdbReport | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [lastRunAt, setLastRunAt] = useState<string | null>(null);

	const nativeMode = getMelonSQLiteNativeMode();
	const currentModeLabel = useMemo(() => {
		if (process.env.EXPO_PUBLIC_MELON_SQLITE === "expo") {
			return "expo";
		}
		if (process.env.EXPO_PUBLIC_MELON_SQLITE === "turbo") {
			return "turbo";
		}
		return nativeMode ?? "native";
	}, [nativeMode]);

	const runBenchmark = useCallback(
		async (modes: DeviceBenchMode[]) => {
			setRunning(true);
			setError(null);
			setProgress("Starting…");
			try {
				const basePath = toFilesystemPath(Paths.document.uri);
				const output = await runDeviceBenchmark({
					modes,
					scale,
					basePath,
					onProgress: setProgress,
				});
				setResults(output.results);
				setReport(output.report);
				setMelonVsWdb(output.melonVsWdb);
				setLastRunAt(new Date().toLocaleTimeString());
			} catch (err) {
				setError(err instanceof Error ? err.message : "Benchmark failed");
			} finally {
				setRunning(false);
				setProgress(null);
			}
		},
		[scale],
	);

	const handleShare = useCallback(async () => {
		if (!report && !melonVsWdb) {
			return;
		}
		const payload = {
			...(melonVsWdb ? { melonVsWdb } : {}),
			...(report ? { report } : {}),
			raw: results,
		};
		await Share.share({
			message: JSON.stringify(payload, null, 2),
		});
	}, [report, melonVsWdb, results]);

	const canShare = report != null || melonVsWdb != null;

	if (!__DEV__) {
		return <Redirect href="/" />;
	}

	return (
		<SafeAreaView style={styles.container} edges={["bottom"]}>
			<View style={styles.header}>
				<Pressable
					disabled={running}
					onPress={() => router.back()}
					style={styles.backButton}
				>
					<Text style={[styles.backButtonText, running && styles.textMuted]}>
						← Tasks
					</Text>
				</Pressable>
				<Text style={styles.title}>On-device benchmarks</Text>
				<Text style={styles.subtitle}>
					Platform: {Platform.OS} · App mode: {currentModeLabel}
				</Text>
				<Text style={styles.hint}>
					jsi-sync runs briefly close the Melon task-list database (one native
					SQLite file at a time). WatermelonDB uses a separate native stack and
					its own bench files. Rebuild the dev client after adding the WDB Expo
					plugin.
				</Text>
			</View>

			<View style={styles.scaleRow}>
				<Text style={styles.label}>Scale</Text>
				<Pressable
					disabled={running}
					onPress={() => setScale(1_000)}
					style={[styles.chip, scale === 1_000 && styles.chipActive]}
				>
					<Text
						style={[
							styles.chipText,
							scale === 1_000 && styles.chipTextActive,
						]}
					>
						1k
					</Text>
				</Pressable>
				<Pressable
					disabled={running}
					onPress={() => setScale(10_000)}
					style={[styles.chip, scale === 10_000 && styles.chipActive]}
				>
					<Text
						style={[
							styles.chipText,
							scale === 10_000 && styles.chipTextActive,
						]}
					>
						10k
					</Text>
				</Pressable>
			</View>

			<View style={styles.actions}>
				<Pressable
					disabled={running}
					onPress={() => runBenchmark(["jsi-sync", "watermelon"])}
					style={[styles.primaryButton, running && styles.buttonDisabled]}
				>
					<Text style={styles.primaryButtonText}>
						Run jsi-sync + Watermelon
					</Text>
				</Pressable>
				<Pressable
					disabled={running}
					onPress={() => runBenchmark(["watermelon"])}
					style={[styles.secondaryButton, running && styles.buttonDisabled]}
				>
					<Text style={styles.secondaryButtonText}>Run WatermelonDB</Text>
				</Pressable>
				<Pressable
					disabled={running}
					onPress={() => runBenchmark(["jsi-sync", "turbo"])}
					style={[styles.secondaryButton, running && styles.buttonDisabled]}
				>
					<Text style={styles.secondaryButtonText}>Run jsi-sync + turbo</Text>
				</Pressable>
				<Pressable
					disabled={running}
					onPress={() => {
						const mode: DeviceBenchMode =
							process.env.EXPO_PUBLIC_MELON_SQLITE === "turbo"
								? "turbo"
								: "jsi-sync";
						void runBenchmark([mode]);
					}}
					style={[styles.secondaryButton, running && styles.buttonDisabled]}
				>
					<Text style={styles.secondaryButtonText}>
						Run current mode ({currentModeLabel})
					</Text>
				</Pressable>
				<Pressable
					disabled={running}
					onPress={() => runBenchmark(["expo"])}
					style={[styles.secondaryButton, running && styles.buttonDisabled]}
				>
					<Text style={styles.secondaryButtonText}>Run expo-sqlite</Text>
				</Pressable>
			</View>

			{running ? (
				<View style={styles.statusRow}>
					<ActivityIndicator size="small" />
					<Text style={styles.progress}>{progress ?? "Running…"}</Text>
				</View>
			) : null}

			{error ? <Text style={styles.error}>{error}</Text> : null}

			{lastRunAt ? (
				<Text style={styles.lastRun}>Last run: {lastRunAt}</Text>
			) : null}

			{melonVsWdb && melonVsWdb.comparisons.length > 0 ? (
				<View style={styles.paritySection}>
					<Text style={styles.sectionTitle}>jsi-sync vs WatermelonDB</Text>
					{melonVsWdb.comparisons.map((row) => (
						<View key={`wdb-${row.scenario}`} style={styles.parityRow}>
							<Text style={styles.scenarioName}>{row.scenario}</Text>
							<Text
								style={[
									styles.winner,
									row.winner === "melon" && styles.winnerMelon,
									row.winner === "watermelon" && styles.winnerWdb,
								]}
							>
								{row.melonMs.toFixed(1)}ms / {row.watermelonMs.toFixed(1)}ms ·{" "}
								{row.winner}
							</Text>
						</View>
					))}
				</View>
			) : null}

			{report && report.comparisons.length > 0 ? (
				<View style={styles.paritySection}>
					<Text style={styles.sectionTitle}>jsi-sync vs turbo</Text>
					{report.comparisons.map((row) => (
						<View key={row.scenario} style={styles.parityRow}>
							<Text style={styles.scenarioName}>{row.scenario}</Text>
							<Text
								style={[
									styles.winner,
									row.winner === "jsi-sync" && styles.winnerJsi,
									row.winner === "turbo" && styles.winnerTurbo,
								]}
							>
								{row.jsiSyncMs.toFixed(1)}ms / {row.turboMs.toFixed(1)}ms ·{" "}
								{row.winner}
							</Text>
						</View>
					))}
				</View>
			) : null}

			{canShare ? (
				<View style={styles.paritySection}>
					<Pressable onPress={handleShare} style={styles.shareButton}>
						<Text style={styles.shareButtonText}>Share JSON report</Text>
					</Pressable>
				</View>
			) : null}

			<ScrollView style={styles.resultsScroll}>
				<Text style={styles.sectionTitle}>All timings</Text>
				{results.map((row) => (
					<View
						key={`${row.engine}-${row.scenario}-${row.scale}`}
						style={styles.resultRow}
					>
						<Text style={styles.resultEngine}>{row.engine}</Text>
						<Text style={styles.resultDetail}>
							{row.scenario} · {row.durationMs.toFixed(2)}ms
						</Text>
					</View>
				))}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	header: {
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#ddd",
	},
	backButton: {
		marginBottom: 8,
	},
	backButtonText: {
		fontSize: 15,
		color: "#1a5fb4",
	},
	textMuted: {
		color: "#999",
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
	},
	subtitle: {
		fontSize: 13,
		color: "#666",
		marginTop: 4,
	},
	hint: {
		fontSize: 12,
		color: "#666",
		marginTop: 8,
		lineHeight: 17,
	},
	scaleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	label: {
		fontSize: 14,
		fontWeight: "600",
		marginRight: 4,
	},
	chip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		backgroundColor: "#f0f0f0",
	},
	chipActive: {
		backgroundColor: "#1a5fb4",
	},
	chipText: {
		fontSize: 13,
		fontWeight: "600",
		color: "#333",
	},
	chipTextActive: {
		color: "#fff",
	},
	actions: {
		paddingHorizontal: 16,
		gap: 8,
	},
	primaryButton: {
		backgroundColor: "#1a5fb4",
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: "center",
	},
	primaryButtonText: {
		color: "#fff",
		fontWeight: "600",
		fontSize: 15,
	},
	secondaryButton: {
		backgroundColor: "#eef6ff",
		paddingVertical: 10,
		borderRadius: 8,
		alignItems: "center",
	},
	secondaryButtonText: {
		color: "#1a5fb4",
		fontWeight: "600",
		fontSize: 14,
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	statusRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 16,
		paddingTop: 12,
	},
	progress: {
		fontSize: 13,
		color: "#444",
	},
	error: {
		color: "#b00020",
		paddingHorizontal: 16,
		paddingTop: 8,
		fontSize: 13,
	},
	lastRun: {
		paddingHorizontal: 16,
		paddingTop: 8,
		fontSize: 12,
		color: "#666",
	},
	paritySection: {
		paddingHorizontal: 16,
		paddingTop: 12,
	},
	sectionTitle: {
		fontSize: 15,
		fontWeight: "700",
		marginBottom: 8,
	},
	parityRow: {
		marginBottom: 6,
	},
	scenarioName: {
		fontSize: 13,
		fontWeight: "600",
	},
	winner: {
		fontSize: 12,
		color: "#444",
	},
	winnerJsi: {
		color: "#1a5fb4",
	},
	winnerTurbo: {
		color: "#2e7d32",
	},
	winnerMelon: {
		color: "#1a5fb4",
	},
	winnerWdb: {
		color: "#c2410c",
	},
	shareButton: {
		marginTop: 8,
		paddingVertical: 10,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#1a5fb4",
		borderRadius: 8,
	},
	shareButtonText: {
		color: "#1a5fb4",
		fontWeight: "600",
	},
	resultsScroll: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 12,
	},
	resultRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 4,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#eee",
	},
	resultEngine: {
		fontSize: 12,
		fontWeight: "600",
		flex: 1,
	},
	resultDetail: {
		fontSize: 12,
		color: "#444",
	},
});
