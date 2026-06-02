/**
 * Publish order and build entrypoints for @melon/* packages.
 */
export const MELON_VERSION = "0.1.0-alpha.0";

export const REPOSITORY = {
  type: "git" as const,
  url: "git+https://github.com/melon/melon.git",
};

export interface PackageBuildConfig {
  readonly name: string;
  readonly dir: string;
  /** Main entry relative to package dir (src/...) */
  readonly entries: readonly { readonly export: string; readonly src: string }[];
  /** Copy to dist without compiling (native sources, podspec, etc.) */
  readonly copy?: readonly string[];
  /** npm pack uses `files` — native package lists sources explicitly */
  readonly native?: boolean;
}

export const PUBLISH_ORDER: readonly PackageBuildConfig[] = [
  {
    name: "@melon/db-query",
    dir: "packages/melon-db-query",
    entries: [{ export: ".", src: "src/index.ts" }],
  },
  {
    name: "@melon/db",
    dir: "packages/melon-db",
    entries: [{ export: ".", src: "src/index.ts" }],
  },
  {
    name: "@melon/db-query-mango",
    dir: "packages/melon-db-query-mango",
    entries: [{ export: ".", src: "src/index.ts" }],
  },
  {
    name: "@melon/db-testkit",
    dir: "packages/melon-db-testkit",
    entries: [{ export: ".", src: "src/index.ts" }],
  },
  {
    name: "@melon/db-sqlite-native",
    dir: "packages/melon-db-sqlite-native",
    entries: [{ export: ".", src: "src/index.ts" }],
    copy: [
      "ios",
      "android/src",
      "android/build.gradle",
      "cpp",
      "melon-sqlite-native.podspec",
    ],
    native: true,
  },
  {
    name: "@melon/db-sqlite",
    dir: "packages/melon-db-sqlite",
    entries: [
      { export: ".", src: "src/index.ts" },
      { export: "./bench", src: "src/bench/index.ts" },
      { export: "./expo", src: "src/expo.ts" },
      { export: "./node", src: "src/node.ts" },
      { export: "./rn", src: "src/rn.ts" },
      { export: "./testing", src: "src/testing.ts" },
    ],
  },
  {
    name: "@melon/db-prisma",
    dir: "packages/melon-db-prisma",
    entries: [
      { export: ".", src: "src/index.ts" },
      { export: "./node", src: "src/node.ts" },
    ],
  },
  {
    name: "@melon/db-devtools",
    dir: "packages/melon-db-devtools",
    entries: [
      { export: ".", src: "src/index.ts" },
      { export: "./react", src: "src/react/index.ts" },
    ],
  },
  {
    name: "@melon/sync",
    dir: "packages/melon-sync",
    entries: [{ export: ".", src: "src/index.ts" }],
  },
  {
    name: "@melon/sync-server",
    dir: "packages/melon-sync-server",
    entries: [
      { export: ".", src: "src/index.ts" },
      { export: "./in-memory", src: "src/in-memory.ts" },
    ],
  },
  {
    name: "@melon/db-react",
    dir: "packages/melon-db-react",
    entries: [{ export: ".", src: "src/index.ts" }],
  },
  {
    name: "@melon/db-codemods",
    dir: "packages/melon-db-codemods",
    entries: [{ export: ".", src: "src/index.ts" }],
  },
];
