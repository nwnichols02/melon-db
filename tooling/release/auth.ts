import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type PublishAuthMode = "oidc" | "token" | "auto";

const NPM_REGISTRY = "https://registry.npmjs.org/";

/**
 * Resolved publish auth mode from MELON_PUBLISH_AUTH or environment.
 */
export function resolvePublishAuthMode(): PublishAuthMode {
	const explicit = process.env.MELON_PUBLISH_AUTH;
	if (explicit === "oidc" || explicit === "token") {
		return explicit;
	}
	return "auto";
}

function hasOidcContext(): boolean {
	return (
		process.env.GITHUB_ACTIONS === "true" &&
		Boolean(process.env.ACTIONS_ID_TOKEN_REQUEST_URL)
	);
}

function hasTokenAuth(): boolean {
	const token = process.env.NPM_TOKEN ?? process.env.NODE_AUTH_TOKEN;
	return Boolean(token && token.length > 0);
}

/**
 * Detect whether npm publish can run (OIDC trusted publishing or token).
 */
export function hasNpmPublishAuth(): boolean {
	const mode = resolvePublishAuthMode();

	if (mode === "oidc") {
		return hasOidcContext();
	}

	if (mode === "token") {
		return hasTokenAuth();
	}

	if (hasTokenAuth()) {
		return true;
	}

	return hasOidcContext();
}

/**
 * Human-readable auth mode for logs.
 */
export function describeNpmPublishAuth(): string {
	const mode = resolvePublishAuthMode();

	if (mode === "oidc") {
		return hasOidcContext()
			? "OIDC trusted publishing (GitHub Actions)"
			: "OIDC (missing ACTIONS_ID_TOKEN_REQUEST_URL — check job permissions)";
	}

	if (mode === "token") {
		return hasTokenAuth()
			? "Automation token (NPM_TOKEN / NODE_AUTH_TOKEN)"
			: "token (missing NPM_TOKEN secret)";
	}

	if (hasTokenAuth()) {
		return "token (NPM_TOKEN / NODE_AUTH_TOKEN)";
	}

	if (hasOidcContext()) {
		return "OIDC trusted publishing (GitHub Actions)";
	}

	return "none";
}

function getNpmAuthToken(): string | undefined {
	const token = process.env.NPM_TOKEN ?? process.env.NODE_AUTH_TOKEN;
	return token && token.length > 0 ? token : undefined;
}

function shouldWriteNpmRegistryToken(): boolean {
	const mode = resolvePublishAuthMode();
	if (mode === "oidc") return false;
	return Boolean(getNpmAuthToken());
}

/**
 * Write ~/.npmrc so npm publish receives the Automation token.
 * NODE_AUTH_TOKEN alone is not enough without registry-url / .npmrc config.
 */
export function configureNpmRegistryAuth(): void {
	if (!shouldWriteNpmRegistryToken()) return;

	const token = getNpmAuthToken();
	if (!token) return;

	const npmrcPath = join(homedir(), ".npmrc");
	writeFileSync(
		npmrcPath,
		`registry=${NPM_REGISTRY}\n//registry.npmjs.org/:_authToken=${token}\n`,
		"utf8",
	);
}

/**
 * Environment for npm publish subprocess — strips tokens in OIDC mode so npm
 * CLI uses GitHub id-token exchange instead of a stale .npmrc token.
 */
export function npmPublishEnv(): NodeJS.ProcessEnv {
	const env = { ...process.env };
	const mode = resolvePublishAuthMode();

	if (mode === "oidc" || (mode === "auto" && !hasTokenAuth() && hasOidcContext())) {
		delete env.NPM_TOKEN;
		delete env.NODE_AUTH_TOKEN;
	}

	return env;
}

/**
 * Exit message when auth is misconfigured.
 */
export function publishAuthHelp(): string {
	return (
		"No npm publish auth available.\n\n" +
		"GitHub Actions:\n" +
		"  NPM_TOKEN secret = npm Automation token (NOT Granular — Granular triggers EOTP/2FA)\n\n" +
		"Local:\n" +
		"  export NPM_TOKEN=npm_...  (Automation token)\n" +
		"  or npm login"
	);
}
