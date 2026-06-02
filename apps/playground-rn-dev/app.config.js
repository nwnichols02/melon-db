/**
 * @returns {import('expo/config').ExpoConfig}
 */
module.exports = () => ({
	expo: {
		name: "Melon Playground (Dev)",
		slug: "playground-rn-dev",
		version: "1.0.0",
		scheme: "melon-playground-dev",
		orientation: "portrait",
		newArchEnabled: true,
		ios: {
			bundleIdentifier: "com.nate.nichols.playgroundrn.devbuild",
		},
		android: {
			package: "com.nate.nichols.playgroundrn.devbuild",
		},
		plugins: [
			"expo-dev-client",
			"expo-router",
			"expo-sqlite",
			"expo-asset",
			["@morrowdigital/watermelondb-expo-plugin", { disableJsi: false }],
		],
		experiments: {
			typedRoutes: true,
		},
	},
});
