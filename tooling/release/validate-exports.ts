#!/usr/bin/env bun
/**
 * Ensure package exports expose src for workspace dev and dist for publish imports.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { publishExports } from "./export-map.ts";
import { PUBLISH_ORDER } from "./packages.ts";

const root = join(import.meta.dir, "../..");

for (const config of PUBLISH_ORDER) {
  const pkg = JSON.parse(
    readFileSync(join(root, config.dir, "package.json"), "utf8"),
  ) as {
    exports?: Record<string, { import?: string; bun?: string; development?: string }>;
  };
  const expectedPublish = publishExports(config);
  for (const entry of config.entries) {
    const key = entry.export === "." ? "." : entry.export;
    const exp = pkg.exports?.[key];
    if (!exp) {
      throw new Error(`${config.name} missing export ${key}`);
    }
    if (exp.bun !== `./${entry.src}` || exp.development !== `./${entry.src}`) {
      throw new Error(`${config.name} export ${key} must map bun/development to src`);
    }
    if (exp.import !== expectedPublish[key]?.import) {
      throw new Error(
        `${config.name} export ${key} import must be ${expectedPublish[key]?.import}`,
      );
    }
  }
}

console.log("Export map validation passed.");
