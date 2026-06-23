/**
 * Tests for the Google Sheets content watcher.
 *
 * These cases focus on the helper functions that keep the sync pipeline safe
 * and predictable: config parsing, CSV parsing, cache handling, URL checks,
 * and small utility helpers used by the watcher runtime.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConditionalHeaders,
  isTrustedCsvUrl,
  md5,
  normalizeSheetConfig,
  parseCsv,
  parseYamlConfig,
  readWatcherCache,
  rowsToObjects,
  validateSheetKey,
} from "../scripts/content-watcher.mjs";

test("parseYamlConfig reads sheet entries", () => {
  const config = parseYamlConfig(`
sheets:
  - key: profile
    name: Profile
    gid: 123
    csv_url: https://docs.google.com/spreadsheets/d/e/test/pub?gid=123&output=csv
`);

  assert.equal(config.sheets.length, 1);
  assert.deepEqual(config.sheets[0], {
    key: "profile",
    name: "Profile",
    gid: "123",
    csv_url: "https://docs.google.com/spreadsheets/d/e/test/pub?gid=123&output=csv",
  });
});

test("parseCsv handles quoted commas and escaped quotes", () => {
  const rows = parseCsv('name,notes\n"Alpha, Beta","He said ""hi"""\n');

  assert.deepEqual(rows, [
    ["name", "notes"],
    ["Alpha, Beta", 'He said "hi"'],
  ]);
});

test("rowsToObjects maps rows to records", () => {
  const { headers, records } = rowsToObjects([
    ["id", "title"],
    ["a1", "First"],
    ["b2", "Second"],
  ]);

  assert.deepEqual(headers, ["id", "title"]);
  assert.deepEqual(records, [
    { id: "a1", title: "First" },
    { id: "b2", title: "Second" },
  ]);
});

test("validateSheetKey only allows safe filename-like keys", () => {
  assert.equal(validateSheetKey("profile"), true);
  assert.equal(validateSheetKey("personal-links"), true);
  assert.equal(validateSheetKey("personal_links"), true);
  assert.equal(validateSheetKey("../escape"), false);
  assert.equal(validateSheetKey("sheet.json"), false);
  assert.equal(validateSheetKey("/absolute"), false);
});

test("isTrustedCsvUrl only allows published Google Sheets HTTPS URLs", () => {
  assert.equal(
    isTrustedCsvUrl("https://docs.google.com/spreadsheets/d/e/test/pub?gid=1&output=csv"),
    true,
  );
  assert.equal(
    isTrustedCsvUrl("https://docs.googleusercontent.com/spreadsheets/d/e/test/pub?gid=1&output=csv"),
    true,
  );
  assert.equal(isTrustedCsvUrl("http://docs.google.com/spreadsheets/d/e/test/pub?gid=1&output=csv"), false);
  assert.equal(isTrustedCsvUrl("https://127.0.0.1:8080/evil.csv"), false);
  assert.equal(isTrustedCsvUrl("file:///etc/passwd"), false);
});

test("normalizeSheetConfig rejects path traversal and unsafe URLs", () => {
  assert.throws(
    () =>
      normalizeSheetConfig({
        key: "../escape",
        csv_url: "https://docs.google.com/spreadsheets/d/e/test/pub?gid=1&output=csv",
      }),
    /Invalid sheet key/,
  );

  assert.throws(
    () =>
      normalizeSheetConfig({
        key: "profile",
        csv_url: "https://127.0.0.1:8080/evil.csv",
      }),
    /Invalid csv_url/,
  );
});

test("buildConditionalHeaders mirrors cached validators", () => {
  assert.deepEqual(buildConditionalHeaders({ etag: '"abc"', last_modified: "Tue, 24 Jun 2026 00:00:00 GMT" }), {
    "if-none-match": '"abc"',
    "if-modified-since": "Tue, 24 Jun 2026 00:00:00 GMT",
  });
});

test("md5 returns a stable cache key", () => {
  assert.equal(md5("hello"), md5("hello"));
  assert.notEqual(md5("hello"), md5("hello!"));
});

test("readWatcherCache tolerates missing cache files", async () => {
  const cache = await readWatcherCache();
  assert.equal(typeof cache, "object");
  assert.equal(typeof cache.sheets, "object");
});
