#!/usr/bin/env node
/**
 * Export the built Astro site to a destination directory.
 *
 * Purpose:
 * - Copy the static Astro build output from `dist/` into a destination directory.
 * - Support a mounted or synced `public_html` path on the NUS server.
 * - Keep the export step dependency-light and shell-friendly.
 * - Cache the last copied source hash so repeat exports can be skipped when
 *   the built output has not changed.
 *
 * Invocation:
 * - Build only: `npm run build`
 * - Export only: `node scripts/export-static.mjs --dest /path/to/public_html/site`
 * - Build then export: `npm run build:export -- --dest /path/to/public_html/site`
 *
 * Environment variables:
 * - `EXPORT_SOURCE_DIR`: override the source build directory (default: `dist`)
 * - `EXPORT_DEST_DIR`: override the destination directory
 *
 * Flags:
 * - `--source <dir>`: source build directory
 * - `--dest <dir>`: destination directory
 * - `--clean`: remove the destination directory before copying
 * - `--help`: print usage and exit
 *
 * Notes:
 * - The destination can be a local folder, mounted server path, or sync target.
 * - Use `--clean` when you want the destination to exactly match the current build.
 * - Cache files live under `.cache/astro-homepage/` and are ignored by Git.
 * - The HTML run log is copied to the destination as `pipeline-log.html`.
 */

import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { appendPipelineLogEntry, copyPipelineLogToDestination } from "./pipeline-log.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, "..");
const cacheDir = path.join(repoRoot, ".cache", "astro-homepage");
const cachePath = path.join(cacheDir, "export-cache.json");

/**
 * Print CLI usage, examples, and environment variable notes for the exporter.
 */
function printHelp() {
  console.log(`Usage:
  node scripts/export-static.mjs --dest <directory> [--source dist] [--clean]

Options:
  --source <dir>   Source build directory (default: dist)
  --dest <dir>     Destination directory to receive the static site
  --clean          Remove the destination directory before copying
  --help           Show this help text

Environment:
  EXPORT_SOURCE_DIR  Override the default source directory
  EXPORT_DEST_DIR    Override the destination directory

Examples:
  npm run build
  node scripts/export-static.mjs --dest /Users/knmnyn/public_html/astro-homepage
  EXPORT_DEST_DIR=/Users/knmnyn/public_html/astro-homepage npm run export:static
`);
}

/**
 * Parse the small argument surface used by the export script.
 *
 * The command intentionally accepts only a few flags so the workflow stays
 * predictable when used by shell scripts or deployment steps.
 */
function parseArgs(argv) {
  const options = {
    source: process.env.EXPORT_SOURCE_DIR || "dist",
    dest: process.env.EXPORT_DEST_DIR || "",
    clean: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--clean") {
      options.clean = true;
    } else if (arg === "--source") {
      options.source = argv[++index] || "";
    } else if (arg === "--dest") {
      options.dest = argv[++index] || "";
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

/**
 * Resolve a path relative to the repository root unless it is already absolute.
 */
function resolvePath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(repoRoot, inputPath);
}

/**
 * Walk a directory and return all file paths in stable sorted order.
 */
async function listFiles(rootDir) {
  const files = [];

  async function visit(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  await visit(rootDir);
  files.sort((left, right) => left.localeCompare(right));
  return files;
}

/**
 * Hash the contents and relative paths of a directory tree.
 */
async function hashDirectory(rootDir) {
  const files = await listFiles(rootDir);
  const hash = crypto.createHash("md5");

  for (const filePath of files) {
    const relativePath = path.relative(rootDir, filePath).split(path.sep).join("/");
    const contents = await fs.readFile(filePath);
    hash.update(relativePath);
    hash.update("\0");
    hash.update(contents);
    hash.update("\0");
  }

  return {
    fileCount: files.length,
    hash: hash.digest("hex"),
  };
}

/**
 * Read the export cache from disk if it exists.
 */
async function readExportCache() {
  const text = await fs.readFile(cachePath, "utf8").catch(() => "");
  if (!text) {
    return { destinations: {} };
  }

  try {
    const parsed = JSON.parse(text);
    return {
      destinations: typeof parsed.destinations === "object" && parsed.destinations ? parsed.destinations : {},
    };
  } catch {
    return { destinations: {} };
  }
}

/**
 * Persist the export cache to disk.
 */
async function writeExportCache(cache) {
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
}

/**
 * Copy a built Astro site to a destination directory.
 *
 * This performs a directory copy rather than an upload so the same command can
 * target a mounted server path, a local staging folder, or a public_html sync
 * directory. The source must already exist, which means the site should be built
 * before this runs.
 */
async function exportStatic({ source, dest, clean }) {
  if (!source) {
    throw new Error("Missing source directory.");
  }

  if (!dest) {
    throw new Error("Missing destination directory. Pass --dest or set EXPORT_DEST_DIR.");
  }

  const sourceDir = resolvePath(source);
  const destDir = resolvePath(dest);

  const sourceStat = await fs.stat(sourceDir).catch(() => null);
  if (!sourceStat || !sourceStat.isDirectory()) {
    throw new Error(`Source directory not found: ${sourceDir}. Run npm run build first.`);
  }

  const sourceSnapshot = await hashDirectory(sourceDir);
  const cache = await readExportCache();
  const cacheEntry = cache.destinations[destDir] ?? null;

  const destStat = await fs.stat(destDir).catch(() => null);
  const canSkipCopy =
    !clean &&
    destStat?.isDirectory?.() &&
    cacheEntry &&
    cacheEntry.source_dir === sourceDir &&
    cacheEntry.source_hash === sourceSnapshot.hash &&
    Number(cacheEntry.file_count ?? -1) === sourceSnapshot.fileCount;

  if (!canSkipCopy) {
    if (clean) {
      await fs.rm(destDir, { recursive: true, force: true });
    } else if (destStat && !destStat.isDirectory()) {
      await fs.rm(destDir, { force: true });
    }

    await fs.mkdir(destDir, { recursive: true });
    await fs.cp(sourceDir, destDir, { recursive: true, force: true, preserveTimestamps: true });

    await writeExportCache({
      destinations: {
        ...cache.destinations,
        [destDir]: {
          source_dir: sourceDir,
          source_hash: sourceSnapshot.hash,
          file_count: sourceSnapshot.fileCount,
          exported_at: new Date().toISOString(),
        },
      },
    });
  }

  await appendPipelineLogEntry({
    repoRoot,
    utility: "static-export",
    action: "copy",
    status: canSkipCopy ? "skipped" : "copied",
    summary: canSkipCopy ? "source output unchanged" : "exported static site",
    details: [
      `source: ${path.relative(repoRoot, sourceDir)}`,
      `destination: ${destDir}`,
      `source hash: ${sourceSnapshot.hash}`,
      `files: ${sourceSnapshot.fileCount}`,
      clean ? "clean: yes" : "clean: no",
    ],
  });

  await copyPipelineLogToDestination({ repoRoot, destDir });

  return { sourceDir, destDir, skipped: canSkipCopy, sourceHash: sourceSnapshot.hash, fileCount: sourceSnapshot.fileCount };
}

/**
 * Detect whether this file is being executed directly from the command line.
 */
const isMainModule = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isMainModule) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }

    const result = await exportStatic(options);
    console.log(`Exported ${result.sourceDir} -> ${result.destDir}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    await appendPipelineLogEntry({
      repoRoot,
      utility: "static-export",
      action: "copy",
      status: "error",
      summary: "export run failed",
      details: [error instanceof Error ? error.message : String(error)],
    });
    printHelp();
    process.exit(1);
  }
}

export { exportStatic, hashDirectory, listFiles, parseArgs, printHelp, resolvePath, readExportCache, writeExportCache };
