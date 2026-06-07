#!/usr/bin/env bun
/**
 * Print npm Trusted Publisher settings for every @melon-db/* package.
 * Run: bun tooling/release/trusted-publisher-checklist.ts
 */
import { PUBLISH_ORDER } from "./packages.ts";

const GITHUB_REPO = "nwnichols02/melon-db";
const WORKFLOW = "release.yml";

console.log("npm Trusted Publisher checklist\n");
console.log("Configure each package AFTER its first publish exists on npm.\n");
console.log("GitHub Actions settings (same for every package):");
console.log(`  Provider:   GitHub Actions`);
console.log(`  Repository: ${GITHUB_REPO}`);
console.log(`  Workflow:   ${WORKFLOW}`);
console.log(`  Environment: (leave blank)\n`);
console.log("Packages:\n");

for (const config of PUBLISH_ORDER) {
  const slug = config.name.slice(1).replace("/", "%2F");
  console.log(`  ${config.name}`);
  console.log(`    npm: https://www.npmjs.com/package/${config.name}/settings`);
  console.log(`    or:  npmjs.com → Packages → ${config.name} → Settings → Trusted publishing\n`);
}

console.log(`Total: ${PUBLISH_ORDER.length} packages`);
console.log("\nAfter OIDC works, revoke the bootstrap Automation token and delete NPM_TOKEN from GitHub secrets.");
