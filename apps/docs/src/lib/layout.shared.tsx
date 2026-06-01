import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { appName, gitConfig } from "./shared";

/**
 * Shared Fumadocs layout options for home and docs shells.
 */
export function baseOptions(): BaseLayoutProps {
	return {
		nav: {
			title: appName,
		},
		githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
	};
}
