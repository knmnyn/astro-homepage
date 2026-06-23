#!/usr/bin/env node
/**
 * Run an Astro CLI command with the correct base path for exported builds.
 *
 * Purpose:
 * - Keep local dev at `/` so stylesheet and asset URLs resolve on localhost.
 * - Force build and preview to use the NUS export subpath so copied files work.
 *
 * Invocation:
 * - Build: `node scripts/astro-command.mjs build`
 * - Preview: `node scripts/astro-command.mjs preview`
 *
 * Notes:
 * - `ASTRO_BASE_PATH` is set only for build and preview commands.
 * - The dev server still runs directly through `astro dev` without a base path
 *   override, so local CSS and assets continue to load from the root.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, "..");

const command = process.argv[2];
const allowedCommands = new Set(["build", "preview"]);

if (!allowedCommands.has(command)) {
  console.error("Usage: node scripts/astro-command.mjs <build|preview>");
  process.exit(1);
}

const env = {
  ...process.env,
  ASTRO_BASE_PATH: "/~kanmy/astro-homepage/",
};

await new Promise((resolve, reject) => {
  const child = spawn("astro", [command], {
    cwd: repoRoot,
    env,
    stdio: "inherit",
  });

  child.on("error", reject);
  child.on("exit", (code) => {
    if (code === 0) {
      resolve();
    } else {
      reject(new Error(`astro ${command} failed with exit code ${code}`));
    }
  });
});
