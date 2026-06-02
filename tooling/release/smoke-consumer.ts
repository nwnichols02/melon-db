#!/usr/bin/env bun
/**
 * Pack all packages and run consumer fixture against tarballs.
 */
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../..");
const fixture = join(import.meta.dir, "consumer-fixture");
const artifacts = join(import.meta.dir, "artifacts");

const required = [
  "melon-db-0.1.0-alpha.0.tgz",
  "melon-db-sqlite-0.1.0-alpha.0.tgz",
  "melon-db-query-0.1.0-alpha.0.tgz",
];

async function main(): Promise<void> {
  const build = Bun.spawnSync(["bun", "run", "build:packages"], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (build.exitCode !== 0) process.exit(1);

  const pack = Bun.spawnSync(["bun", "tooling/release/pack-all.ts"], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (pack.exitCode !== 0) process.exit(1);

  for (const file of required) {
    if (!existsSync(join(artifacts, file))) {
      throw new Error(`Missing pack artifact: ${file}`);
    }
  }

  rmSync(join(fixture, "node_modules"), { recursive: true, force: true });
  rmSync(join(fixture, "bun.lock"), { force: true });

  const install = Bun.spawnSync(["bun", "install"], {
    cwd: fixture,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (install.exitCode !== 0) process.exit(1);

  const typecheck = Bun.spawnSync(["bun", "run", "typecheck"], {
    cwd: fixture,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (typecheck.exitCode !== 0) process.exit(1);

  const smoke = Bun.spawnSync(["bun", "run", "smoke"], {
    cwd: fixture,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (smoke.exitCode !== 0) process.exit(1);

  console.log("release:smoke OK");
}

main();
