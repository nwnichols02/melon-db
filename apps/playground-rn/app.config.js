/**
 * @returns {import('expo/config').ExpoConfig}
 */
module.exports = () => ({
	expo: {
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
	},
});
