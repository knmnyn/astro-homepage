/**
 * Tests for nav-sheet mapping.
 *
 * These keep the loader pinned to the sheet's nav metadata so the visible
 * nav text comes from Nav Header and not a hardcoded fallback.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { siteData } from "../src/lib/site-data.js";
import { primaryNavItems } from "../src/lib/site-navigation.js";

test("nav items expose nav metadata from the sheet", () => {
  const research = siteData.navItems.find((item) => item.id === "research");

  assert.ok(research);
  assert.equal(research.navHeader, "Research");
  assert.equal(research.header, "Research");
  assert.equal(research.path, "/research");
});

test("primary nav items come from the sheet's Nav Header column", () => {
  assert.deepEqual(
    primaryNavItems.map((item) => item.label),
    ["Research", "Teaching", "Publications", "Service", "Misc"],
  );
  assert.deepEqual(
    primaryNavItems.map((item) => item.href),
    ["/research", "/teaching", "/publications", "/service", "/misc"],
  );
  assert.equal(primaryNavItems.some((item) => item.label === "Grants and Awards"), false);
});

test("nav source schema does not expose Label", () => {
  assert.ok(siteData.sources.nav.headers.includes("Header"));
  assert.equal(siteData.sources.nav.headers.includes("Label"), false);
});
