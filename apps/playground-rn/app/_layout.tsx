import { getDatabase, devtoolsBridge } from "@/db/bootstrap";
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
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

/**
 * Root layout: bootstraps Melon DB then provides it to the app tree.
 */
export default function RootLayout(): React.ReactElement {
	const [db, setDb] = useState<MelonDatabase<typeof taskSchema> | null>(null);
	const syncBackend = useMemo(() => createHttpSyncBackend(), []);

	useEffect(() => {
		let cancelled = false;
		void getDatabase().then((database) => {
			if (!cancelled) {
				setDb(database);
			}
		});
		return () => {
			cancelled = true;
		};
	}, []);

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
					autoSyncOnReconnect
					conflictPolicy="last-write-wins"
					networkMonitor={devNetworkMonitor}
					pullChanges={syncBackend.pullChanges}
					pushChanges={syncBackend.pushChanges}
					retryPolicy={DEFAULT_RETRY_POLICY}
					syncTimestampField="updatedAt"
				>
					{__DEV__ ? (
						<MelonDevtoolsProvider bridge={devtoolsBridge}>
							<Stack>
								<Stack.Screen name="index" options={{ title: "Open Tasks" }} />
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
	},
});
