/**
 * Detect whether npm publish can run (OIDC trusted publishing or token).
 */
export function hasNpmPublishAuth(): boolean {
	if (process.env.NPM_TOKEN ?? process.env.NODE_AUTH_TOKEN) {
		return true;
	}

	// GitHub Actions OIDC — npm CLI exchanges the job id-token at publish time.
	if (
		process.env.GITHUB_ACTIONS === "true" &&
		process.env.ACTIONS_ID_TOKEN_REQUEST_URL
	) {
		return true;
	}

	return false;
}

/**
 * Human-readable auth mode for logs.
 */
export function describeNpmPublishAuth(): string {
	if (process.env.NPM_TOKEN ?? process.env.NODE_AUTH_TOKEN) {
		return "token (NPM_TOKEN / NODE_AUTH_TOKEN)";
	}
	if (
		process.env.GITHUB_ACTIONS === "true" &&
		process.env.ACTIONS_ID_TOKEN_REQUEST_URL
	) {
		return "OIDC trusted publishing (GitHub Actions)";
	}
	return "none";
}
