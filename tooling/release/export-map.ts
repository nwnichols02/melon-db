import type { PackageBuildConfig } from "./packages.ts";

function distBase(exportKey: string): string {
  if (exportKey === ".") return "index";
  return exportKey.startsWith("./") ? exportKey.slice(2) : exportKey;
}

function srcPath(entry: PackageBuildConfig["entries"][number]): string {
  return `./${entry.src}`;
}

export function buildExports(
  config: PackageBuildConfig,
): Record<string, Record<string, string>> {
  const exports: Record<string, Record<string, string>> = {};
  for (const entry of config.entries) {
    const base = distBase(entry.export);
    const key = entry.export === "." ? "." : entry.export;
    exports[key] = {
      types: `./dist/${base}.d.ts`,
      bun: srcPath(entry),
      development: srcPath(entry),
      import: `./dist/${base}.js`,
      default: srcPath(entry),
    };
  }
  return exports;
}

export function publishExports(
  config: PackageBuildConfig,
): Record<string, { types: string; import: string }> {
  const exports: Record<string, { types: string; import: string }> = {};
  for (const entry of config.entries) {
    const base = distBase(entry.export);
    const key = entry.export === "." ? "." : entry.export;
    exports[key] = {
      types: `./dist/${base}.d.ts`,
      import: `./dist/${base}.js`,
    };
  }
  return exports;
}

export function nativeFilesList(): string[] {
  return [
    "dist",
    "src",
    "ios",
    "android",
    "cpp",
    "melon-sqlite-native.podspec",
    "README.md",
  ];
}

export function defaultFilesList(): string[] {
  return ["dist", "README.md"];
}
