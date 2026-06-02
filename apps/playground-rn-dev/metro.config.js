const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

/**
 * Resolves a package directory for Metro when Bun's .bun symlinks are not followed.
 */
function resolvePackageDir(name) {
	return path.dirname(
		require.resolve(`${name}/package.json`, { paths: [projectRoot] }),
	);
}

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
	path.resolve(projectRoot, "node_modules"),
	path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.unstable_enableSymlinks = true;

config.resolver.extraNodeModules = {
	"@melon/db": path.resolve(workspaceRoot, "packages/melon-db"),
	"@melon/db-devtools": path.resolve(
		workspaceRoot,
		"packages/melon-db-devtools",
	),
	"@melon/db-query": path.resolve(workspaceRoot, "packages/melon-db-query"),
	"@melon/db-react": path.resolve(workspaceRoot, "packages/melon-db-react"),
	"@melon/db-sqlite": path.resolve(workspaceRoot, "packages/melon-db-sqlite"),
	"@melon/db-sqlite-native": path.resolve(
		workspaceRoot,
		"packages/melon-db-sqlite-native",
	),
	"@melon/sync": path.resolve(workspaceRoot, "packages/melon-sync"),
	"@nozbe/watermelondb": resolvePackageDir("@nozbe/watermelondb"),
	"expo-sqlite": resolvePackageDir("expo-sqlite"),
};

module.exports = config;
