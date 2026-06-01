/**
 * Loads apps/playground-rn/env/.env.{expo-go|development-build} into process.env
 * before app.config.js reads MELON_ENV / EXPO_PUBLIC_*.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

/**
 * @param {string} filePath
 */
function loadEnvFile(filePath) {
	if (!fs.existsSync(filePath)) {
		return;
	}

	for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		const separator = trimmed.indexOf("=");
		if (separator < 0) {
			continue;
		}

		const key = trimmed.slice(0, separator).trim();
		let value = trimmed.slice(separator + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		process.env[key] = value;
	}
}

/**
 * @returns {"expo-go" | "development-build"}
 */
function resolveMelonEnv() {
	if (process.env.MELON_ENV === "development-build") {
		return "development-build";
	}
	if (process.env.MELON_ENV === "expo-go") {
		return "expo-go";
	}

	const argv = process.argv.join(" ");
	if (argv.includes("--dev-client")) {
		return "development-build";
	}

	return "expo-go";
}

const melonEnv = resolveMelonEnv();
loadEnvFile(path.join(ROOT, "env", `.env.${melonEnv}`));
process.env.MELON_ENV = melonEnv;

module.exports = { melonEnv };
