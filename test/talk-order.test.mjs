import assert from "node:assert/strict";
import test from "node:test";

import { siteData } from "../src/lib/site-data.js";
import { sortTalkItems } from "../src/lib/talk-order.js";

test("raw talk data preserves sheet row order", () => {
  const sourceIds = siteData.sources.talks.records.map((record) => record["[#]ID"]);

  assert.deepEqual(
    siteData.talks.map((item) => item.id),
    sourceIds,
  );
});

test("talks keep row order when sort is blank", () => {
  const items = [
    { id: "row-a", sort: "", sourceIndex: 0 },
    { id: "row-b", sort: "", sourceIndex: 1 },
    { id: "row-c", sort: "", sourceIndex: 2 },
  ];

  assert.deepEqual(
    sortTalkItems(items).map((item) => item.id),
    ["row-a", "row-b", "row-c"],
  );
});

test("talks with sort values override row order", () => {
  const items = [
    { id: "row-a", sort: "", sourceIndex: 0 },
    { id: "row-b", sort: "20", sourceIndex: 1 },
    { id: "row-c", sort: "10", sourceIndex: 2 },
  ];

  assert.deepEqual(
    sortTalkItems(items).map((item) => item.id),
    ["row-c", "row-b", "row-a"],
  );
});
