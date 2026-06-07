#!/usr/bin/env bun
/**
 * Build all publishable @melon-db/* packages (dist/ + declarations via tsc -b).
 */
import { copyFileSync, existsSync, readFileSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { PUBLISH_ORDER } from "./packages.ts";

const root = join(import.meta.dir, "../..");

const DB_RESOLVE = join(
  root,
  "packages/melon-db/src/database/resolve-collection-query.ts",
);
const DB_RESOLVE_BAK = `${DB_RESOLVE}.build-bak`;
const DB_RESOLVE_STUB = join(
  import.meta.dir,
  "stubs/resolve-collection-query.stub.ts",
);

function addBinShebangs(packageDir: string): void {
  const pkgPath = join(packageDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    bin?: Record<string, string>;
  };
  if (!pkg.bin) return;
  for (const [, rel] of Object.entries(pkg.bin)) {
    if (!rel.startsWith("dist/")) continue;
    const path = join(packageDir, rel);
    if (!existsSync(path)) continue;
    let body = readFileSync(path, "utf8");
    if (!body.startsWith("#!")) {
      body = `#!/usr/bin/env node\n${body}`;
      Bun.write(path, body);
    }
  }
}

function runTscProject(packageDir: string): void {
  rmSync(join(packageDir, "dist"), { recursive: true, force: true });
  const proc = Bun.spawnSync(["bunx", "tsc", "-p", "tsconfig.build.json"], {
    cwd: packageDir,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (proc.exitCode !== 0) {
    throw new Error(`tsc failed in ${packageDir}`);
  }
}

function buildCorePair(): void {
  let moved = false;
  if (existsSync(DB_RESOLVE_BAK)) {
    renameSync(DB_RESOLVE_BAK, DB_RESOLVE);
  }
  if (existsSync(DB_RESOLVE)) {
    renameSync(DB_RESOLVE, DB_RESOLVE_BAK);
    copyFileSync(DB_RESOLVE_STUB, DB_RESOLVE);
    moved = true;
  }

  try {
    console.log("Building @melon-db/db (bootstrap)...");
    runTscProject(join(root, "packages/melon-db"));

    console.log("Building @melon-db/db-query...");
    runTscProject(join(root, "packages/melon-db-query"));

    if (moved) {
      renameSync(DB_RESOLVE_BAK, DB_RESOLVE);
      console.log("Building @melon-db/db (with query bridge)...");
      runTscProject(join(root, "packages/melon-db"));
    }
  } catch (error) {
    if (moved && existsSync(DB_RESOLVE_BAK)) {
      renameSync(DB_RESOLVE_BAK, DB_RESOLVE);
    }
    throw error;
  }
}

export async function buildAll(): Promise<void> {
  buildCorePair();
  addBinShebangs(join(root, "packages/melon-db"));
  addBinShebangs(join(root, "packages/melon-db-query"));

  for (const config of PUBLISH_ORDER) {
    if (config.name === "@melon-db/db" || config.name === "@melon-db/db-query") {
      continue;
    }
    console.log(`Building ${config.name}...`);
    runTscProject(join(root, config.dir));
    addBinShebangs(join(root, config.dir));
  }
}

if (import.meta.main) {
  await buildAll();
  console.log("All packages built.");
}
