"use client";

interface ArchitectureDiagramProps {
	/** Path to exported SVG under /public (e.g. /diagrams/architecture/system-overview.svg). */
	src: string;
	alt: string;
	/** Optional draw.io source file for editing in diagrams.net. */
	drawioSrc?: string;
	caption?: string;
}

/**
 * Renders an architecture diagram as an inline SVG with optional draw.io source link.
 */
export function ArchitectureDiagram({
	src,
	alt,
	drawioSrc,
	caption,
}: ArchitectureDiagramProps) {
	const viewerUrl = drawioSrc
		? `https://viewer.diagrams.net/?tags=melon&nav=1&title=${encodeURIComponent(alt)}&url=${encodeURIComponent(typeof window !== "undefined" ? `${window.location.origin}${drawioSrc}` : drawioSrc)}`
		: null;

	return (
		<figure className="my-6 not-prose">
			<div className="overflow-x-auto rounded-lg border border-fd-border bg-fd-card p-4">
				<img
					alt={alt}
					className="mx-auto max-w-full"
					height={480}
					loading="lazy"
					src={src}
					width={800}
				/>
			</div>
			{(caption || drawioSrc) && (
				<figcaption className="mt-2 text-center text-fd-muted-foreground text-sm">
					{caption}
					{caption && drawioSrc ? " · " : null}
					{drawioSrc ? (
						<a
							className="text-fd-primary underline-offset-4 hover:underline"
							href={viewerUrl ?? drawioSrc}
							rel="noreferrer"
							target="_blank"
						>
							Open in draw.io
						</a>
					) : null}
				</figcaption>
			)}
		</figure>
	);
}
