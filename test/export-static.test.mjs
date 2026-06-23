/**
 * Tests for the standalone static export utility.
 *
 * The suite checks CLI argument parsing, directory copying, cache-aware skip
 * behavior, and the generation of the exported pipeline log file.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { exportStatic, parseArgs } from "../scripts/export-static.mjs";

test("parseArgs reads source, destination, and clean flags", () => {
  const options = parseArgs(["--source", "dist-site", "--dest", "/tmp/site", "--clean"]);

  assert.deepEqual(options, {
    source: "dist-site",
    dest: "/tmp/site",
    clean: true,
    help: false,
  });
});

test("exportStatic copies built files to a destination directory", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "astro-export-"));
  const sourceDir = path.join(tempRoot, "dist");
  const destDir = path.join(tempRoot, "public_html");

  await fs.mkdir(sourceDir, { recursive: true });
  await fs.writeFile(path.join(sourceDir, "index.html"), "<html><body>ok</body></html>");
  await fs.writeFile(path.join(sourceDir, "robots.txt"), "User-agent: *\n");

  const result = await exportStatic({ source: sourceDir, dest: destDir, clean: true });

  assert.equal(result.sourceDir, sourceDir);
  assert.equal(result.destDir, destDir);
  assert.equal(await fs.readFile(path.join(destDir, "index.html"), "utf8"), "<html><body>ok</body></html>");
  assert.equal(await fs.readFile(path.join(destDir, "robots.txt"), "utf8"), "User-agent: *\n");
  assert.match(await fs.readFile(path.join(destDir, "pipeline-log.html"), "utf8"), /static-export/);
});

test("exportStatic skips a repeat export when the source hash is unchanged", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "astro-export-skip-"));
  const sourceDir = path.join(tempRoot, "dist");
  const destDir = path.join(tempRoot, "public_html");

  await fs.mkdir(sourceDir, { recursive: true });
  await fs.writeFile(path.join(sourceDir, "index.html"), "<html><body>cached</body></html>");

  const first = await exportStatic({ source: sourceDir, dest: destDir, clean: true });
  assert.equal(first.skipped, false);

  await fs.writeFile(path.join(destDir, "manual.txt"), "keep-me");

  const second = await exportStatic({ source: sourceDir, dest: destDir, clean: false });
  assert.equal(second.skipped, true);
  assert.equal(await fs.readFile(path.join(destDir, "manual.txt"), "utf8"), "keep-me");
  assert.match(await fs.readFile(path.join(destDir, "pipeline-log.html"), "utf8"), /skipped/);
});
