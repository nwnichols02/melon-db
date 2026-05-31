import { getDatabase } from "@/db/bootstrap";
import type { taskSchema } from "@/db/schema";
import { createHttpSyncBackend } from "@/sync/client";
import type { MelonDatabase } from "@melon/db";
import { MelonDbProvider, MelonSyncProvider } from "@melon/db-react";
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
					pullChanges={syncBackend.pullChanges}
					pushChanges={syncBackend.pushChanges}
				>
					<Stack>
						<Stack.Screen name="index" options={{ title: "Open Tasks" }} />
					</Stack>
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
