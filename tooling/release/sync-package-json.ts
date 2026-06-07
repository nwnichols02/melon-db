#!/usr/bin/env bun
/**
 * Sync publish metadata on all @melon-db package.json files (run after build in CI).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildExports, defaultFilesList, nativeFilesList } from "./export-map.ts";
import {
  AUTHOR,
  BUGS,
  HOMEPAGE,
  LICENSE,
  MELON_VERSION,
  PUBLISH_ORDER,
  REPOSITORY,
  type PackageBuildConfig,
} from "./packages.ts";

const root = join(import.meta.dir, "../..");

function syncOne(config: PackageBuildConfig): void {
  const path = join(root, config.dir, "package.json");
  const pkg = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;

  pkg.version = MELON_VERSION;
  pkg.author = AUTHOR;
  pkg.license = LICENSE;
  pkg.repository = REPOSITORY;
  pkg.homepage = HOMEPAGE;
  pkg.bugs = { url: BUGS };
  pkg.publishConfig = { access: "public", provenance: true };
  pkg.main = "./dist/index.js";
  pkg.types = "./dist/index.d.ts";
  pkg.files = config.native ? nativeFilesList() : defaultFilesList();
  pkg.exports = buildExports(config);

  if (pkg.bin && typeof pkg.bin === "object") {
    const bins: Record<string, string> = {};
    for (const [name, rel] of Object.entries(pkg.bin as Record<string, string>)) {
      const normalized = rel.replace(/^\.\//, "");
      const base = normalized.startsWith("src/")
        ? normalized.slice(4).replace(/\.ts$/, "")
        : normalized.replace(/^dist\//, "").replace(/\.js$/, "");
      bins[name] = `./dist/${base}.js`;
    }
    pkg.bin = bins;
  }

  writeFileSync(path, `${JSON.stringify(pkg, null, "\t")}\n`);
  console.log(`Updated ${config.name}`);
}

for (const config of PUBLISH_ORDER) {
  syncOne(config);
}
