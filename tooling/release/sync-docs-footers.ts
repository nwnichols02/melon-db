#!/usr/bin/env bun
/**
 * Append Author & license footer to package MDX pages when missing.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MELON_COPYRIGHT } from "./metadata.ts";

const root = join(import.meta.dir, "../..");
const packagesDir = join(root, "apps/docs/content/docs/packages");
const marker = "## Author & license";
const footer = `
## Author & license

${MELON_COPYRIGHT}. [MIT License](https://github.com/nwnichols02/melon-db/blob/main/LICENSE).
`;

for (const file of readdirSync(packagesDir).filter((name) => name.endsWith(".mdx"))) {
  const path = join(packagesDir, file);
  const content = readFileSync(path, "utf8");
  if (content.includes(marker)) {
    console.log(`Skip ${file} (footer present)`);
    continue;
  }
  writeFileSync(path, `${content.replace(/\n+$/, "")}\n${footer}`);
  console.log(`Updated ${file}`);
}
