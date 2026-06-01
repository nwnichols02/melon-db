/** @type {import('@react-native-community/cli-types').Config} */
module.exports = {
	dependency: {
		platforms: {
			ios: {
				podspecPath: "./melon-sqlite-native.podspec",
			},
			android: {
				sourceDir: "./android",
				packageImportPath: "import com.melon.sqlite.MelonSQLitePackage;",
				packageInstance: "new MelonSQLitePackage()",
			},
		},
	},
};
