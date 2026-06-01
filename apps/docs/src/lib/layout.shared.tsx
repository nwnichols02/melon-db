import { MelonLogo } from "@/components/melon-logo";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { gitConfig } from "./shared";

/**
 * Shared Fumadocs layout options for home and docs shells.
 */
export function baseOptions(): BaseLayoutProps {
	return {
		nav: {
			title: <MelonLogo />,
			url: "/",
		},
		githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
	};
}
