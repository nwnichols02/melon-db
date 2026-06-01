import { Link } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ReactNode } from "react";

interface DocsLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
	href?: string;
	children?: ReactNode;
}

/**
 * MDX anchor that uses TanStack Router for internal /docs paths.
 */
export function DocsLink({ href, children, ...props }: DocsLinkProps) {
	if (!href) {
		return <span {...props}>{children}</span>;
	}

	if (href.startsWith("/docs")) {
		const splat = href.replace(/^\/docs\/?/, "").replace(/\/$/, "");
		return (
			<Link params={{ _splat: splat }} to="/docs/$" {...props}>
				{children}
			</Link>
		);
	}

	if (href.startsWith("http://") || href.startsWith("https://")) {
		return (
			<a href={href} rel="noreferrer" target="_blank" {...props}>
				{children}
			</a>
		);
	}

	return (
		<a href={href} {...props}>
			{children}
		</a>
	);
}
