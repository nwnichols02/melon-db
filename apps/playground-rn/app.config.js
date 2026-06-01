/**
 * @param {import('expo/config').ConfigContext} context
 * @returns {import('expo/config').ExpoConfig}
 */
module.exports = () => {
	const melonEnv = process.env.MELON_ENV ?? "expo-go";
	const isDevBuild = melonEnv === "development-build";

	const baseExpo = {
		name: isDevBuild ? "Melon Playground (Dev)" : "Melon Playground",
		slug: isDevBuild ? "playground-rn-dev" : "playground-rn",
		version: "1.0.0",
		scheme: isDevBuild ? "melon-playground-dev" : "melon-playground",
		orientation: "portrait",
		newArchEnabled: true,
		ios: {
			bundleIdentifier: isDevBuild
				? "com.nate.nichols.playgroundrn.devbuild"
				: "com.nate.nichols.playgroundrn",
		},
		android: {
			package: isDevBuild
				? "com.nate.nichols.playgroundrn.devbuild"
				: "com.nate.nichols.playgroundrn",
		},
		plugins: ["expo-router", "expo-sqlite", "expo-asset"],
		experiments: {
			typedRoutes: true,
		},
	};

	return {
		expo: baseExpo,
	};
};
