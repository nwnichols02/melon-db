#!/usr/bin/env bun
/**
 * Publish all @melon-db packages in dependency order.
 *
 * Auth (pick one):
 * - OIDC trusted publishing in GitHub Actions (no secret; npm CLI uses id-token)
 * - NPM_TOKEN / NODE_AUTH_TOKEN (granular access token) for CI or local publish
 *
 * Requires prior `bun run build:packages`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  configureNpmRegistryAuth,
  describeNpmPublishAuth,
  hasNpmPublishAuth,
  npmPublishEnv,
  publishAuthHelp,
} from "./auth.ts";
import { publishExports } from "./export-map.ts";
import { MELON_VERSION, PUBLISH_ORDER } from "./packages.ts";

const root = join(import.meta.dir, "../..");
const tag = process.argv.includes("--tag")
  ? process.argv[process.argv.indexOf("--tag") + 1] ?? "alpha"
  : "alpha";
const skipPublished = process.argv.includes("--skip-published");

/**
 * Returns true when the exact version is already on the npm registry.
 */
function isVersionPublished(packageName: string, version: string): boolean {
  const proc = Bun.spawnSync(
    ["npm", "view", `${packageName}@${version}`, "version", "--registry", "https://registry.npmjs.org/"],
    { stdout: "pipe", stderr: "pipe", env: npmPublishEnv() },
  );
  if (proc.exitCode !== 0) return false;
  return new TextDecoder().decode(proc.stdout).trim() === version;
}

if (!hasNpmPublishAuth()) {
  console.error(publishAuthHelp());
  process.exit(1);
}

console.log(`npm publish auth: ${describeNpmPublishAuth()}`);

configureNpmRegistryAuth();

if (process.env.MELON_PUBLISH_AUTH !== "oidc") {
  const whoami = Bun.spawnSync(["npm", "whoami", "--registry", "https://registry.npmjs.org/"], {
    stdout: "pipe",
    stderr: "pipe",
    env: npmPublishEnv(),
  });
  if (whoami.exitCode !== 0) {
    const detail = new TextDecoder().decode(whoami.stderr).trim();
    console.error(
      "npm whoami failed — check NPM_TOKEN is set, not expired, and is a granular token " +
        "with Read and write + Bypass 2FA for @melon-db/*.\n" +
        (detail ? `${detail}\n` : ""),
    );
    process.exit(1);
  }
  console.log(`npm whoami: ${new TextDecoder().decode(whoami.stdout).trim()}`);
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

  if (skipPublished && isVersionPublished(config.name, MELON_VERSION)) {
    console.log(`Skipping ${config.name}@${MELON_VERSION} (already on npm)`);
    writeFileSync(pkgPath, original);
    continue;
  }

  console.log(`Publishing ${config.name}@${MELON_VERSION} (tag: ${tag})...`);
  const proc = Bun.spawnSync(
    ["npm", "publish", "--access", "public", "--tag", tag, "--ignore-scripts"],
    {
      cwd: packageDir,
      stdout: "inherit",
      stderr: "inherit",
      env: npmPublishEnv(),
    },
  );

  writeFileSync(pkgPath, original);

  if (proc.exitCode !== 0) {
    throw new Error(`npm publish failed for ${config.name}`);
  }
}

console.log(`Published ${PUBLISH_ORDER.length} packages with tag "${tag}".`);
