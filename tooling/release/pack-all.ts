#!/usr/bin/env bun
/**
 * npm pack all @melon packages into tooling/release/artifacts (dist-only exports).
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { publishExports } from "./export-map.ts";
import { MELON_VERSION, PUBLISH_ORDER } from "./packages.ts";

const root = join(import.meta.dir, "../..");
const artifacts = join(import.meta.dir, "artifacts");

function packOne(packageDir: string, name: string): string {
  const pkgPath = join(packageDir, "package.json");
  const original = readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(original) as Record<string, unknown> & {
    exports?: Record<string, unknown>;
  };
  const config = PUBLISH_ORDER.find((p) => p.name === name);
  if (config) {
    pkg.exports = publishExports(config);
  }
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies"] as const) {
    const deps = pkg[field] as Record<string, string> | undefined;
    if (!deps) continue;
    for (const key of Object.keys(deps)) {
      if (deps[key] === "workspace:*") {
        deps[key] = `^${MELON_VERSION}`;
      }
    }
  }
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`);

  const proc = Bun.spawnSync(["npm", "pack", "--pack-destination", artifacts], {
    cwd: packageDir,
    stdout: "pipe",
    stderr: "pipe",
  });

  writeFileSync(pkgPath, original);

  if (proc.exitCode !== 0) {
    console.error(proc.stderr.toString());
    throw new Error(`npm pack failed for ${name}`);
  }
  const out = proc.stdout.toString().trim().split("\n").pop() ?? "";
  return out;
}

mkdirSync(artifacts, { recursive: true });
rmSync(join(artifacts, "*.tgz"), { force: true });

for (const config of PUBLISH_ORDER) {
  const dir = join(root, config.dir);
  const tarball = packOne(dir, config.name);
  console.log(`Packed ${config.name}: ${tarball}`);
}

console.log(`Artifacts in ${artifacts}`);
