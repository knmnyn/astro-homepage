/**
 * Tests for nav-sheet mapping.
 *
 * These keep the loader pinned to the sheet's nav metadata so the visible
 * nav text comes from Nav Header and not a hardcoded fallback.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { siteData } from "../src/lib/site-data.js";
import { getNavSectionText, primaryNavItems } from "../src/lib/site-navigation.js";

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

test("nav section text exposes kicker content for section pages", () => {
  const talks = getNavSectionText("talks");

  assert.equal(talks.kicker, "Talks");
  assert.equal(talks.header, "Invited Talks");
  assert.equal(talks.summary, "Talk Archive");
  assert.equal(talks.intro, "I list the invited talks for past conferences, workshops and other events I have had the privilege to lecture.");
  assert.equal(talks.trailer, "");
});

test("nav section text exposes student section content from the sheet", () => {
  const students = getNavSectionText("students");

  assert.equal(students.kicker, "Staff");
  assert.equal(students.header, "Current Students and Staff");
  assert.equal(students.summary, "Student and Staff Listing");
  assert.equal(
    students.intro,
    "[WING.NUS](https://wing.comp.nus.edu.sg) is most authoritative for lists of my current and past research students. Here's a snapshot from 2025. WING's website also lists all 100+ alumni, inclusive of over 40+ postgraduate alumni.",
  );
  assert.equal(
    students.trailer,
    "My group also hosts the occasional postgraduate intern from collaborative projects or one-off internships, which are not listed here.",
  );
});

test("grant rows keep their url values from the sheet", () => {
  const grantsWithUrl = siteData.grants.filter((item) => item.url);

  assert.deepEqual(
    grantsWithUrl.map((item) => item.title),
    [
      "Digital Information Resilience: Restoring Trust and Nudging Behaviours in Digitalisation",
      "AI Centre for Education Technologies",
    ],
  );
  assert.deepEqual(grantsWithUrl.map((item) => item.url), [
    "https://ctic.nus.edu.sg/igyro/",
    "https://aicet.comp.nus.edu.sg/",
  ]);
});
