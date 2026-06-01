interface MelonLogoProps {
	size?: "sm" | "lg";
	showWordmark?: boolean;
}

/**
 * Melon brand mark with optional wordmark for nav and hero surfaces.
 */
export function MelonLogo({ size = "sm", showWordmark = true }: MelonLogoProps) {
	return (
		<span className="inline-flex items-center gap-2">
			<img
				alt="Melon"
				className={`melon-logo-img melon-logo-img--${size}`}
				src="/melon-no-bg.png"
			/>
			{showWordmark ? (
				<span className="font-semibold tracking-tight">Melon</span>
			) : null}
		</span>
	);
}
