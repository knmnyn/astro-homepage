/**
 * Tests for the shared chrome helpers used by the layout navigation script.
 *
 * These checks keep the theme and font-size controls predictable so the
 * browser-facing nav stays small and the logic stays easy to reason about.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { normalizeFontScale, normalizeThemeChoice, resolveThemeMode, stepFontScale } from "../src/lib/site-chrome.js";

test("normalizeThemeChoice constrains theme values", () => {
  assert.equal(normalizeThemeChoice("auto"), "auto");
  assert.equal(normalizeThemeChoice("light"), "light");
  assert.equal(normalizeThemeChoice("dark"), "dark");
  assert.equal(normalizeThemeChoice("unexpected"), "auto");
});

test("resolveThemeMode maps auto to the system preference", () => {
  assert.equal(resolveThemeMode("auto", false), "light");
  assert.equal(resolveThemeMode("auto", true), "dark");
  assert.equal(resolveThemeMode("light", true), "light");
  assert.equal(resolveThemeMode("dark", false), "dark");
});

test("normalizeFontScale clamps to the supported range", () => {
  assert.equal(normalizeFontScale("80"), "80");
  assert.equal(normalizeFontScale("100"), "100");
  assert.equal(normalizeFontScale("120"), "120");
  assert.equal(normalizeFontScale("200"), "100");
});

test("stepFontScale steps between the supported sizes", () => {
  assert.equal(stepFontScale("80", "down"), "80");
  assert.equal(stepFontScale("80", "up"), "100");
  assert.equal(stepFontScale("100", "down"), "80");
  assert.equal(stepFontScale("100", "up"), "120");
  assert.equal(stepFontScale("120", "down"), "100");
  assert.equal(stepFontScale("120", "up"), "120");
});
