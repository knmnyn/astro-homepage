/**
 * Tests for the shared HTML pipeline log helper.
 *
 * The log is used by the watcher and export utilities, so these checks verify
 * that rows are appended correctly and copied into a destination directory.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { appendPipelineLogEntry, copyPipelineLogToDestination, pipelineLogPaths } from "../scripts/pipeline-log.mjs";

test("appendPipelineLogEntry creates and appends a HTML log", async () => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "astro-log-"));

  await appendPipelineLogEntry({
    repoRoot,
    utility: "watcher",
    action: "sync",
    status: "updated",
    summary: "synced sheets",
    details: ["sheet: profile", "rows: 3"],
  });

  await appendPipelineLogEntry({
    repoRoot,
    utility: "export",
    action: "copy",
    status: "copied",
    summary: "exported site",
    details: ["destination: /tmp/public_html"],
  });

  const { cachePath } = pipelineLogPaths(repoRoot);
  const html = await fs.readFile(cachePath, "utf8");

  assert.match(html, /watcher/);
  assert.match(html, /export/);
  assert.match(html, /synced sheets/);
  assert.match(html, /exported site/);
});

test("copyPipelineLogToDestination mirrors the cached HTML log", async () => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "astro-log-copy-"));
  const destDir = path.join(repoRoot, "public_html");

  await appendPipelineLogEntry({
    repoRoot,
    utility: "watcher",
    action: "sync",
    status: "updated",
    summary: "synced sheets",
  });

  const copied = await copyPipelineLogToDestination({ repoRoot, destDir });
  const copiedHtml = await fs.readFile(path.join(destDir, "pipeline-log.html"), "utf8");

  assert.equal(copied, true);
  assert.match(copiedHtml, /synced sheets/);
});
