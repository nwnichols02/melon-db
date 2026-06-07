#!/usr/bin/env bun
/**
 * Publish all @melon-db packages in dependency order.
 *
 * Auth (pick one):
 * - OIDC trusted publishing in GitHub Actions (no secret; npm CLI uses id-token)
 * - NPM_TOKEN / NODE_AUTH_TOKEN for local or bootstrap publishes
 *
 * Requires prior `bun run build:packages`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describeNpmPublishAuth, hasNpmPublishAuth, npmPublishEnv, publishAuthHelp } from "./auth.ts";
import { publishExports } from "./export-map.ts";
import { MELON_VERSION, PUBLISH_ORDER } from "./packages.ts";

const root = join(import.meta.dir, "../..");
const tag = process.argv.includes("--tag")
  ? process.argv[process.argv.indexOf("--tag") + 1] ?? "alpha"
  : "alpha";

if (!hasNpmPublishAuth()) {
  console.error(publishAuthHelp());
  process.exit(1);
}

console.log(`npm publish auth: ${describeNpmPublishAuth()}`);
if (process.env.MELON_PUBLISH_AUTH === "token" && process.env.GITHUB_ACTIONS === "true") {
  console.log(
    "Bootstrap mode: NPM_TOKEN must be an npm Automation token (Access Tokens → Automation). " +
      "Granular tokens require browser 2FA and fail in CI with EOTP.",
  );
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
      env: npmPublishEnv(),
    },
  );

  writeFileSync(pkgPath, original);

  if (proc.exitCode !== 0) {
    throw new Error(`npm publish failed for ${config.name}`);
  }
}

console.log(`Published ${PUBLISH_ORDER.length} packages with tag "${tag}".`);
