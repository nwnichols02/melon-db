/** @type {import('expo/config').ExpoConfig} */
const baseExpo = {
	name: "Melon Playground",
	slug: "playground-rn",
	version: "1.0.0",
	scheme: "melon-playground",
	orientation: "portrait",
	newArchEnabled: true,
	ios: {
		bundleIdentifier: "com.nate.nichols.playgroundrn",
	},
	android: {
		package: "com.nate.nichols.playgroundrn",
	},
	plugins: ["expo-router", "expo-sqlite", "expo-asset"],
	experiments: {
		typedRoutes: true,
	},
};

/**
 * Expo config: default supports Expo Go (expo-sqlite only).
 * JSI native SQLite (@melon/db-sqlite-native) links on prebuild when using a dev build.
 */
module.exports = () => ({
	expo: {
		...baseExpo,
	},
});
