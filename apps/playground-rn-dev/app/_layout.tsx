import {
	devtoolsBridge,
	getDatabase,
	onDatabaseResumed,
	onDatabaseSuspended,
} from "@/db/bootstrap";
import type { taskSchema } from "@/db/schema";
import { createHttpSyncBackend } from "@/sync/client";
import { devNetworkMonitor } from "@/sync/network-monitor";
import type { MelonDatabase } from "@melon-db/db";
import {
	MelonDevtoolsPanel,
	MelonDevtoolsProvider,
} from "@melon-db/db-devtools/react";
import { MelonDbProvider, MelonSyncProvider } from "@melon-db/db-react";
import { DEFAULT_RETRY_POLICY } from "@melon-db/sync";
import { Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

function DevStack(): React.ReactElement {
	return __DEV__ ? (
		<MelonDevtoolsProvider bridge={devtoolsBridge}>
			<Stack>
				<Stack.Screen name="index" options={{ title: "Open Tasks" }} />
				<Stack.Screen name="benchmark" options={{ title: "Benchmarks" }} />
				<Stack.Screen name="demos" options={{ title: "Query demos" }} />
			</Stack>
			<MelonDevtoolsPanel />
		</MelonDevtoolsProvider>
	) : (
		<Stack>
			<Stack.Screen name="index" options={{ title: "Open Tasks" }} />
		</Stack>
	);
}

export default function RootLayout(): React.ReactElement {
	const [db, setDb] = useState<MelonDatabase<typeof taskSchema> | null>(null);
	const [nativeBenchActive, setNativeBenchActive] = useState(false);
	const [bootError, setBootError] = useState<string | null>(null);
	const syncBackend = useMemo(() => createHttpSyncBackend(), []);

	useEffect(() => {
		let cancelled = false;

		function loadDatabase(options?: { clearNativeBench?: boolean }): void {
			void getDatabase()
				.then((database) => {
					if (!cancelled) {
						setDb(database);
						setBootError(null);
						if (options?.clearNativeBench) {
							setNativeBenchActive(false);
						}
					}
				})
				.catch((error: unknown) => {
					if (!cancelled) {
						setBootError(
							error instanceof Error
								? error.message
								: "Database bootstrap failed",
						);
					}
				});
		}

		loadDatabase();

		const unsubscribeResume = onDatabaseResumed(() => {
			if (!cancelled) {
				loadDatabase({ clearNativeBench: true });
			}
		});

		const unsubscribeSuspend = onDatabaseSuspended(() => {
			if (!cancelled) {
				setNativeBenchActive(true);
			}
		});

		return () => {
			cancelled = true;
			unsubscribeResume();
			unsubscribeSuspend();
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
				<MelonSyncProvider
					autoSyncOnReconnect={!nativeBenchActive}
					conflictPolicy="merge-by-field"
					mergeProtectedFields={["updatedAt"]}
					networkMonitor={devNetworkMonitor}
					pullChanges={syncBackend.pullChanges}
					pushChanges={syncBackend.pushChanges}
					retryPolicy={DEFAULT_RETRY_POLICY}
				>
					<DevStack />
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
