import { devtoolsBridge, getDatabase } from "@/db/bootstrap";
import type { taskSchema } from "@/db/schema";
import { createHttpSyncBackend } from "@/sync/client";
import { devNetworkMonitor } from "@/sync/network-monitor";
import type { MelonDatabase } from "@melon/db";
import {
	MelonDevtoolsPanel,
	MelonDevtoolsProvider,
} from "@melon/db-devtools/react";
import { MelonDbProvider, MelonSyncProvider } from "@melon/db-react";
import { DEFAULT_RETRY_POLICY } from "@melon/sync";
import { Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

/**
 * Root layout: bootstraps Melon DB then provides it to the app tree.
 */
export default function RootLayout(): React.ReactElement {
	const [db, setDb] = useState<MelonDatabase<typeof taskSchema> | null>(null);
	const [bootError, setBootError] = useState<string | null>(null);
	const syncBackend = useMemo(() => createHttpSyncBackend(), []);

	useEffect(() => {
		let cancelled = false;
		void getDatabase()
			.then((database) => {
				if (!cancelled) {
					setDb(database);
				}
			})
			.catch((error: unknown) => {
				if (!cancelled) {
					setBootError(
						error instanceof Error ? error.message : "Database bootstrap failed",
					);
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	if (bootError != null) {
		return (
			<SafeAreaProvider>
				<View style={styles.loading}>
					<Text style={styles.errorText}>{bootError}</Text>
				</View>
			</SafeAreaProvider>
		);
	}

	if (!db) {
		return (
			<SafeAreaProvider>
				<View style={styles.loading}>
					<ActivityIndicator size="large" />
				</View>
			</SafeAreaProvider>
		);
	}

	return (
		<SafeAreaProvider>
			<MelonDbProvider db={db}>
				{/* Default merge-by-field; Phase 18 also supports conflictPolicy="custom" + conflictResolver */}
				<MelonSyncProvider
					autoSyncOnReconnect
					conflictPolicy="merge-by-field"
					mergeProtectedFields={["updatedAt"]}
					networkMonitor={devNetworkMonitor}
					pullChanges={syncBackend.pullChanges}
					pushChanges={syncBackend.pushChanges}
					retryPolicy={DEFAULT_RETRY_POLICY}
				>
					{__DEV__ ? (
						<MelonDevtoolsProvider bridge={devtoolsBridge}>
							<Stack>
								<Stack.Screen name="index" options={{ title: "Open Tasks" }} />
								<Stack.Screen
									name="benchmark"
									options={{ title: "Benchmarks" }}
								/>
							</Stack>
							<MelonDevtoolsPanel />
						</MelonDevtoolsProvider>
					) : (
						<Stack>
							<Stack.Screen name="index" options={{ title: "Open Tasks" }} />
						</Stack>
					)}
				</MelonSyncProvider>
			</MelonDbProvider>
		</SafeAreaProvider>
	);
}

const styles = StyleSheet.create({
	loading: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 24,
	},
	errorText: {
		fontSize: 14,
		color: "#b00020",
		textAlign: "center",
	},
});
