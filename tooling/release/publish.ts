#!/usr/bin/env bun
/**
 * Publish all @melon-db packages in dependency order.
 * Requires NPM_TOKEN and prior `bun run build:packages`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { publishExports } from "./export-map.ts";
import { MELON_VERSION, PUBLISH_ORDER } from "./packages.ts";

const root = join(import.meta.dir, "../..");
const tag = process.argv.includes("--tag")
  ? process.argv[process.argv.indexOf("--tag") + 1] ?? "alpha"
  : "alpha";

const authToken = process.env.NPM_TOKEN ?? process.env.NODE_AUTH_TOKEN;
if (!authToken) {
  console.error("NPM_TOKEN or NODE_AUTH_TOKEN is required to publish.");
  process.exit(1);
}

for (const config of PUBLISH_ORDER) {
  const packageDir = join(root, config.dir);
  const pkgPath = join(packageDir, "package.json");
  const original = readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(original) as Record<string, unknown> & {
    dependencies?: Record<string, string>;
    exports?: Record<string, unknown>;
  };

  pkg.exports = publishExports(config);
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies"] as const) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const key of Object.keys(deps)) {
      if (deps[key] === "workspace:*") deps[key] = `^${MELON_VERSION}`;
    }
  }

  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`);

  console.log(`Publishing ${config.name}@${MELON_VERSION} (tag: ${tag})...`);
  const proc = Bun.spawnSync(
    ["npm", "publish", "--access", "public", "--tag", tag],
    {
      cwd: packageDir,
      stdout: "inherit",
      stderr: "inherit",
      env: { ...process.env },
    },
  );

  writeFileSync(pkgPath, original);

  if (proc.exitCode !== 0) {
    throw new Error(`npm publish failed for ${config.name}`);
  }
}

console.log(`Published ${PUBLISH_ORDER.length} packages with tag "${tag}".`);
