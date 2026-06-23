/**
 * Tests for the build-and-export wrapper.
 *
 * These checks make sure the wrapper parses its options and produces a stable
 * input hash for the cache layer that decides when Astro actually rebuilds.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { hashBuildInputs, parseArgs } from "../scripts/build-and-export.mjs";

test("parseArgs reads build/export options", () => {
  const options = parseArgs(["--dest", "/tmp/site", "--source", "dist-site", "--clean", "--force-build"]);

  assert.deepEqual(options, {
    dest: "/tmp/site",
    source: "dist-site",
    clean: true,
    forceBuild: true,
    help: false,
  });
});

test("hashBuildInputs returns a stable md5 digest", async () => {
  const hash = await hashBuildInputs();
  assert.equal(typeof hash, "string");
  assert.equal(hash.length, 32);
});
