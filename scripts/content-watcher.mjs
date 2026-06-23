/**
 * Content watcher for Google Sheets-backed site data.
 *
 * Purpose:
 * - Read `content-sources.yml` from the project root.
 * - Fetch each published Google Sheets CSV URL.
 * - Parse the CSV into normalized JSON files under `src/generated/content-sources/`.
 * - Write a manifest (`index.json`) so Astro or other build steps can discover the synced sources.
 *
 * Invocation:
 * - One-shot sync: `node scripts/content-watcher.mjs --once`
 * - Continuous watch: `node scripts/content-watcher.mjs`
 *
 * Flags:
 * - `--once` runs a single sync and exits.
 * - `--interval=<ms>` sets the polling interval used in watch mode (default: 300000).
 * - `--help` prints this help text and exits.
 *
 * Notes:
 * - The script expects `content-sources.yml` in the repository root.
 * - Generated JSON is written to `src/generated/content-sources/`.
 * - This is intentionally dependency-light so it can run in a plain Node environment.
 */

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const repoRoot = process.cwd();
const configPath = path.join(repoRoot, "content-sources.yml");
const outputDir = path.join(repoRoot, "src", "generated", "content-sources");
const indexPath = path.join(outputDir, "index.json");

const args = new Set(process.argv.slice(2));
const help = args.has("--help") || args.has("-h");
const once = args.has("--once");
const intervalArg = process.argv.find((arg) => arg.startsWith("--interval="));
const intervalMs = intervalArg ? Number(intervalArg.split("=", 2)[1]) : 5 * 60 * 1000;
const isMainModule = fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "");

/**
 * Print CLI usage and examples for the watcher.
 */
function printHelp() {
  console.log(`Usage:
  node scripts/content-watcher.mjs [--once] [--interval=<ms>]

Options:
  --once           Run a single sync and exit.
  --interval=<ms>  Polling interval for watch mode (default: 300000).
  --help, -h       Show this help message.

Examples:
  node scripts/content-watcher.mjs --once
  node scripts/content-watcher.mjs
  node scripts/content-watcher.mjs --interval=60000

Input:
  content-sources.yml (repo root)

Output:
  src/generated/content-sources/*.json
  src/generated/content-sources/index.json`);
}

/**
 * Parse the small YAML config used to describe published sheet sources.
 *
 * The file is intentionally constrained:
 * - top-level `sheets:` key
 * - list items with `key`, `name`, `gid`, and `csv_url`
 *
 * This keeps the parser tiny and predictable for the watcher.
 */
function parseYamlConfig(text) {
  const sheets = [];
  let current = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line === "sheets:") continue;

    const sheetStart = rawLine.match(/^\s*-\s+key:\s*(.+)\s*$/);
    if (sheetStart) {
      if (current) sheets.push(current);
      current = { key: sheetStart[1].trim() };
      continue;
    }

    const fieldMatch = rawLine.match(/^\s{4}([A-Za-z0-9_-]+):\s*(.*?)\s*$/);
    if (fieldMatch && current) {
      const [, key, value] = fieldMatch;
      current[key] = value;
    }
  }

  if (current) sheets.push(current);
  return { sheets };
}

/**
 * Validate the sheet key used for generated filenames.
 *
 * Keys are mapped to `src/generated/content-sources/<key>.json`, so they must
 * stay within a conservative slug-like character set.
 */
function validateSheetKey(key) {
  return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(key);
}

/**
 * Validate that a CSV URL is safe to fetch in this pipeline.
 *
 * The config is for published Google Sheets CSVs, so we only accept HTTPS
 * URLs on `docs.google.com` or `docs.googleusercontent.com`.
 */
function isTrustedCsvUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "docs.google.com" || url.hostname === "docs.googleusercontent.com")
    );
  } catch {
    return false;
  }
}

/**
 * Validate a parsed sheet entry and return a normalized copy.
 */
function normalizeSheetConfig(sheet) {
  if (!sheet || typeof sheet !== "object") {
    throw new Error("Sheet config entries must be objects.");
  }

  const key = String(sheet.key ?? "").trim();
  const csvUrl = String(sheet.csv_url ?? "").trim();
  const name = String(sheet.name ?? key).trim();
  const gid = String(sheet.gid ?? "").trim();

  if (!validateSheetKey(key)) {
    throw new Error(`Invalid sheet key "${key}". Use letters, numbers, underscores, and hyphens only.`);
  }

  if (!isTrustedCsvUrl(csvUrl)) {
    throw new Error(`Invalid csv_url for "${key}". Use an HTTPS Google Sheets CSV URL.`);
  }

  return { key, name, gid, csv_url: csvUrl };
}

/**
 * Parse a CSV string into rows of cell values.
 *
 * Supports:
 * - quoted values
 * - escaped quotes (`""`)
 * - commas inside quoted cells
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (ch === "\r") continue;
    cell += ch;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((value) => value !== ""));
}

/**
 * Convert parsed CSV rows into a header list and record objects.
 *
 * The first row is treated as the header row. Blank rows are skipped.
 */
function rowsToObjects(rows) {
  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0].map((header) => header.trim());
  const records = [];

  for (const row of rows.slice(1)) {
    if (!row.some((value) => value.trim() !== "")) continue;
    const record = {};
    headers.forEach((header, index) => {
      record[header] = (row[index] ?? "").trim();
    });
    records.push(record);
  }

  return { headers, records };
}

/**
 * Read and parse the sheet-source config from disk.
 */
async function readConfig() {
  const text = await fs.readFile(configPath, "utf8");
  return parseYamlConfig(text);
}

/**
 * Fetch CSV text from a published Google Sheets URL.
 */
async function fetchCsv(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "astro-homepage-content-watcher/1.0",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

/**
 * Run a single fetch/parse/write pass for all configured sheets.
 */
async function syncOnce() {
  const config = await readConfig();
  await fs.mkdir(outputDir, { recursive: true });

  const manifest = {
    source_config: path.relative(repoRoot, configPath),
    generated_at: new Date().toISOString(),
    sheets: [],
  };

  for (const sheet of config.sheets) {
    const normalized = normalizeSheetConfig(sheet);

    const csvText = await fetchCsv(normalized.csv_url);
    const sha256 = crypto.createHash("sha256").update(csvText).digest("hex");
    const rows = parseCsv(csvText);
    const { headers, records } = rowsToObjects(rows);
    const payload = {
      key: normalized.key,
      name: normalized.name,
      gid: normalized.gid,
      csv_url: normalized.csv_url,
      fetched_at: new Date().toISOString(),
      sha256,
      headers,
      row_count: records.length,
      records,
    };

    await fs.writeFile(path.join(outputDir, `${normalized.key}.json`), `${JSON.stringify(payload, null, 2)}\n`);
    manifest.sheets.push({
      key: normalized.key,
      gid: normalized.gid,
      json_path: path.join("src", "generated", "content-sources", `${normalized.key}.json`),
      row_count: records.length,
      sha256,
    });
    console.log(`synced ${normalized.key}: ${records.length} rows`);
  }

  await fs.writeFile(indexPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`wrote ${path.relative(repoRoot, indexPath)}`);
}

/**
 * Watch mode:
 * - run an initial sync
 * - re-sync on config file changes
 * - poll periodically as a backup
 */
async function watch() {
  let timer = null;
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      await syncOnce();
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    } finally {
      running = false;
    }
  };

  await run();

  const schedule = () => {
    if (timer) clearInterval(timer);
    timer = setInterval(run, intervalMs);
  };

  schedule();

  const watcher = await fs.watch(configPath, { persistent: true });
  (async () => {
    for await (const event of watcher) {
      if (event.eventType === "change") {
        await run();
      }
    }
  })().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
  });

  process.on("SIGINT", () => {
    if (timer) clearInterval(timer);
    process.exit(0);
  });
}

if (isMainModule) {
  if (help) {
    printHelp();
  } else if (once) {
    await syncOnce();
  } else {
    await watch();
  }
}

export {
  fetchCsv,
  isTrustedCsvUrl,
  normalizeSheetConfig,
  parseCsv,
  parseYamlConfig,
  rowsToObjects,
  syncOnce,
  validateSheetKey,
  watch,
};
