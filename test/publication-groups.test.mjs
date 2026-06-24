import assert from "node:assert/strict";
import test from "node:test";

import { groupPublicationsBySection } from "../src/lib/publication-groups.js";
import { siteData } from "../src/lib/site-data.js";

test("publication items expose the section field from the sheet", () => {
  const firstPublication = siteData.publications[0];

  assert.equal(firstPublication.section, "Edited volumes or issues");
});

test("groupPublicationsBySection preserves first-seen section order", () => {
  const groups = groupPublicationsBySection([
    { title: "A", section: "Journal Articles and Book Chapters" },
    { title: "B", section: "Conference and Workshop Papers" },
    { title: "C", section: "Journal Articles and Book Chapters" },
    { title: "D", section: "" },
  ]);

  assert.deepEqual(groups.map((group) => group.label), [
    "Journal Articles and Book Chapters",
    "Conference and Workshop Papers",
    "Other",
  ]);

  assert.deepEqual(groups[0].items.map((item) => item.title), ["A", "C"]);
  assert.deepEqual(groups[1].items.map((item) => item.title), ["B"]);
  assert.deepEqual(groups[2].items.map((item) => item.title), ["D"]);
});
