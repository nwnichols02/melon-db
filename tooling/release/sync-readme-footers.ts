#!/usr/bin/env bun
/**
 * Append a standard Author & license footer to package READMEs when missing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PUBLISH_ORDER } from "./packages.ts";
import { README_FOOTER } from "./metadata.ts";

const root = join(import.meta.dir, "../..");
const marker = "## Author & license";

for (const config of PUBLISH_ORDER) {
  const path = join(root, config.dir, "README.md");
  const content = readFileSync(path, "utf8");
  if (content.includes(marker)) {
    console.log(`Skip ${config.name} (footer present)`);
    continue;
  }
  const trimmed = content.replace(/\n+$/, "");
  writeFileSync(path, `${trimmed}\n\n${README_FOOTER}\n`);
  console.log(`Updated ${config.name} README`);
}
