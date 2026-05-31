import type { MelonDatabase } from "@melon/db";
import { MelonDbProvider } from "@melon/db-react";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getDatabase } from "@/db/bootstrap";
import { taskSchema } from "@/db/schema";

/**
 * Root layout: bootstraps Melon DB then provides it to the app tree.
 */
export default function RootLayout(): React.ReactElement {
	const [db, setDb] = useState<MelonDatabase<typeof taskSchema> | null>(null);

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
				<Stack>
					<Stack.Screen name="index" options={{ title: "Open Tasks" }} />
				</Stack>
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
