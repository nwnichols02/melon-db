/**
 * Shared publish and documentation metadata for @melon-db/* packages.
 */
export const MELON_AUTHOR = "Nate Nichols <nwnichols02@gmail.com>";

export const MELON_LICENSE = "MIT";

export const MELON_REPOSITORY = {
  type: "git" as const,
  url: "git+https://github.com/nwnichols02/melon-db.git",
};

export const MELON_HOMEPAGE = "https://github.com/nwnichols02/melon-db#readme";

export const MELON_BUGS = "https://github.com/nwnichols02/melon-db/issues";

export const MELON_COPYRIGHT = "Copyright (c) 2026 Nate Nichols";

export const README_FOOTER = `## Author & license

${MELON_COPYRIGHT}. See [LICENSE](../../LICENSE) for the full MIT license text.`;

export const ROOT_README_FOOTER = `## Author & license

${MELON_COPYRIGHT}. See [LICENSE](./LICENSE) for the full MIT license text.

Melon alpha packages are published on npm under the \`@melon-db\` scope with dist-tag \`alpha\`. See [Alpha support policy](apps/docs/content/docs/alpha-support.mdx) and [RELEASING.md](./RELEASING.md) for release expectations.`;
