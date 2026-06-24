#!/usr/bin/env node
/**
 * Build the Astro site only when inputs changed, then export the result.
 *
 * Purpose:
 * - Hash the site inputs so `astro build` can be skipped when nothing changed.
 * - Reuse the static exporter cache so the destination copy is skipped when the
 *   built output matches the last export.
 * - Keep the release workflow lightweight for repeated local or server syncs.
 *
 * Invocation:
 * - Build and export: `node scripts/build-and-export.mjs --dest /path/to/public_html/site`
 * - Package shortcut: `npm run build:export -- --dest /path/to/public_html/site`
 *
 * Flags:
 * - `--dest <dir>`: destination directory for the exported static site
 * - `--source <dir>`: optional source build directory passed to the exporter (default: dist)
 * - `--clean`: remove the destination directory before copying
 * - `--force-build`: force `astro build` even if the input hash is unchanged
 * - `--help`: print usage and exit
 *
 * Notes:
 * - Cache files live under `.cache/astro-homepage/` and are ignored by Git.
 * - The build hash covers the app source tree, public assets, Astro config, and package files.
 * - The export phase refreshes `pipeline-log.html` in the destination directory.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { exportStatic, hashDirectory, listFiles } from "./export-static.mjs";
import { appendPipelineLogEntry } from "./pipeline-log.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, "..");
const cacheDir = path.join(repoRoot, ".cache", "astro-homepage");
const cachePath = path.join(cacheDir, "build-cache.json");

/**
 * Print CLI usage, flags, and examples.
 */
function printHelp() {
  console.log(`Usage:
  node scripts/build-and-export.mjs --dest <directory> [--source dist] [--clean] [--force-build]

Options:
  --dest <dir>       Destination directory for the exported static site
  --source <dir>     Source build directory passed to the exporter (default: dist)
  --clean            Remove the destination directory before copying
  --force-build      Run Astro build even if the input hash is unchanged
  --help             Show this help text

Examples:
  npm run build:export -- --dest /Users/knmnyn/public_html/astro-homepage
  node scripts/build-and-export.mjs --dest /Users/knmnyn/public_html/astro-homepage
`);
}

/**
 * Parse command-line arguments for the build/export wrapper.
 */
function parseArgs(argv) {
  const options = {
    dest: process.env.EXPORT_DEST_DIR || "",
    source: process.env.EXPORT_SOURCE_DIR || "dist",
    clean: false,
    forceBuild: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--clean") {
      options.clean = true;
    } else if (arg === "--force-build") {
      options.forceBuild = true;
    } else if (arg === "--dest") {
      options.dest = argv[++index] || "";
    } else if (arg === "--source") {
      options.source = argv[++index] || "";
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

/**
 * Resolve a repo-relative path to an absolute path.
 */
function resolvePath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(repoRoot, inputPath);
}

/**
 * Read the build cache from disk if it exists.
 */
async function readBuildCache() {
  const text = await fs.readFile(cachePath, "utf8").catch(() => "");
  if (!text) return { input_hash: "" };

  try {
    const parsed = JSON.parse(text);
    return { input_hash: String(parsed.input_hash ?? ""), built_at: String(parsed.built_at ?? "") };
  } catch {
    return { input_hash: "", built_at: "" };
  }
}

/**
 * Persist the build cache to disk.
 */
async function writeBuildCache(cache) {
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
}

/**
 * Convert a source page path into the expected Astro build output path.
 */
function pageSourceToOutputPath(pagePath, pagesDir, distDir) {
  const relativePath = path.relative(pagesDir, pagePath);
  const pageExt = path.extname(relativePath);
  if (pageExt !== ".astro" && pageExt !== ".md" && pageExt !== ".mdx") {
    return "";
  }

  if (relativePath.includes("[")) {
    return "";
  }

  const withoutExt = relativePath.slice(0, -pageExt.length);
  const segments = withoutExt.split(path.sep).filter(Boolean);
  const lastSegment = segments[segments.length - 1] || "";
  const outputSegments = lastSegment === "index" ? segments.slice(0, -1) : segments;
  return path.join(distDir, ...outputSegments, "index.html");
}

/**
 * Ensure each static page source has a generated HTML file in dist/.
 */
async function verifyBuiltPages() {
  const pagesDir = resolvePath(path.join("src", "pages"));
  const distDir = resolvePath("dist");
  const pagesDirStat = await fs.stat(pagesDir).catch(() => null);

  if (!pagesDirStat?.isDirectory?.()) {
    return [];
  }

  const missingOutputs = [];
  const pageFiles = await listFiles(pagesDir);

  for (const pageFile of pageFiles) {
    const outputPath = pageSourceToOutputPath(pageFile, pagesDir, distDir);
    if (!outputPath) continue;

    const outputStat = await fs.stat(outputPath).catch(() => null);
    if (!outputStat?.isFile?.()) {
      missingOutputs.push(path.relative(repoRoot, outputPath));
    }
  }

  return missingOutputs;
}

/**
 * Hash the site inputs that affect Astro build output.
 */
async function hashBuildInputs() {
  const hash = crypto.createHash("md5");
  const directories = ["src", "public"];
  const files = ["astro.config.mjs", "content-sources.yml", "package.json", "package-lock.json"];

  for (const directory of directories) {
    const absoluteDir = resolvePath(directory);
    const dirStat = await fs.stat(absoluteDir).catch(() => null);
    if (!dirStat?.isDirectory?.()) continue;

    const directorySnapshot = await hashDirectory(absoluteDir);
    hash.update(directory);
    hash.update("\0");
    hash.update(directorySnapshot.hash);
    hash.update("\0");
  }

  for (const file of files) {
    const absoluteFile = resolvePath(file);
    const fileStat = await fs.stat(absoluteFile).catch(() => null);
    if (!fileStat?.isFile?.()) continue;

    const contents = await fs.readFile(absoluteFile);
    hash.update(file);
    hash.update("\0");
    hash.update(contents);
    hash.update("\0");
  }

  return hash.digest("hex");
}

/**
 * Run `astro build` unless the cached input hash is unchanged.
 */
async function buildIfNeeded(forceBuild = false) {
  const cache = await readBuildCache();
  const inputHash = await hashBuildInputs();
  const distDir = resolvePath("dist");
  const distStat = await fs.stat(distDir).catch(() => null);
  const canSkipBuild = !forceBuild && cache.input_hash === inputHash && distStat?.isDirectory?.();

  if (canSkipBuild) {
    const missingOutputs = await verifyBuiltPages();
    if (missingOutputs.length === 0) {
      return { built: false, inputHash };
    }

    console.warn(`Build cache was valid, but these outputs were missing: ${missingOutputs.join(", ")}. Rebuilding.`);
  }

  await new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", "build"], {
      cwd: repoRoot,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`astro build failed with exit code ${code}`));
      }
    });
  });

  const missingOutputs = await verifyBuiltPages();
  if (missingOutputs.length > 0) {
    throw new Error(`Astro build completed, but these page outputs are missing: ${missingOutputs.join(", ")}`);
  }

  await writeBuildCache({
    input_hash: inputHash,
    built_at: new Date().toISOString(),
  });

  return { built: true, inputHash };
}

const isMainModule = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isMainModule) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }

    const buildResult = await buildIfNeeded(options.forceBuild);
    console.log(buildResult.built ? "Build completed." : "Build skipped: inputs unchanged.");

    await appendPipelineLogEntry({
      repoRoot,
      utility: "build-export",
      action: "build",
      status: buildResult.built ? "built" : "skipped",
      summary: buildResult.built ? "Astro build completed" : "Astro build skipped",
      details: [
        `input hash: ${buildResult.inputHash}`,
        `source dir: ${options.source}`,
        `force build: ${options.forceBuild ? "yes" : "no"}`,
      ],
    });

    const exportResult = await exportStatic({
      source: options.source,
      dest: options.dest,
      clean: options.clean,
    });

    console.log(
      exportResult.skipped
        ? `Export skipped: ${exportResult.sourceDir} unchanged.`
        : `Exported ${exportResult.sourceDir} -> ${exportResult.destDir}`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    await appendPipelineLogEntry({
      repoRoot,
      utility: "build-export",
      action: "run",
      status: "error",
      summary: "build/export run failed",
      details: [error instanceof Error ? error.message : String(error)],
    });
    printHelp();
    process.exit(1);
  }
}

export {
  buildIfNeeded,
  hashBuildInputs,
  parseArgs,
  printHelp,
  readBuildCache,
  resolvePath,
  writeBuildCache,
};
