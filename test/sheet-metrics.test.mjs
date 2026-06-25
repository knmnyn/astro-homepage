/**
 * Tests for the sheet metric inference helpers.
 *
 * These assertions protect the marker-based schema contract so that a changed
 * spreadsheet header layout does not silently break metric generation or the
 * card payloads used by the browser-side filtering logic.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMetricCardData,
  buildSheetMetrics,
  collectMetricFieldValues,
  getSheetCountMetric,
  normalizeMetricDisplayValue,
  stripMetricMarker,
} from "../src/lib/sheet-metrics.js";
import grantsSheet from "../src/generated/content-sources/grants.json" with { type: "json" };

test("stripMetricMarker removes the metric prefix and trims whitespace", () => {
  assert.equal(stripMetricMarker("[#]Role"), "Role");
  assert.equal(stripMetricMarker("  [#]  ID  "), "ID");
  assert.equal(stripMetricMarker("[|]Start Year"), "Start Year");
  assert.equal(stripMetricMarker("[!]Pinned"), "Pinned");
  assert.equal(stripMetricMarker("[*]Featured"), "Featured");
  assert.equal(stripMetricMarker("Name"), "Name");
});

test("buildSheetMetrics infers count and enum metrics from marked headers", () => {
  const metrics = buildSheetMetrics(grantsSheet);
  const countMetric = getSheetCountMetric(metrics);
  const recordTypeMetric = metrics.find((metric) => metric.kind === "enum" && metric.fieldKey === "record type");
  const roleMetric = metrics.find((metric) => metric.kind === "enum" && metric.fieldKey === "role");
  const startYearMetric = metrics.find((metric) => metric.kind === "sort" && metric.fieldKey === "start year");

  assert.equal(countMetric?.value, grantsSheet.row_count);
  assert.ok(recordTypeMetric);
  assert.ok(roleMetric);
  assert.ok(startYearMetric);
  assert.ok(recordTypeMetric.values.some((entry) => entry.label === "Grant"));
  assert.ok(roleMetric.values.length > 0);
});

test("buildSheetMetrics splits semicolon-delimited enum values into separate counts", () => {
  const sheet = {
    headers: ["ID", "[#]Category"],
    records: [
      { ID: "1", Category: "A; B" },
      { ID: "2", Category: "A;C" },
      { ID: "3", Category: "B" },
    ],
  };

  const metrics = buildSheetMetrics(sheet);
  const metric = metrics.find((entry) => entry.kind === "enum" && entry.fieldKey === "category");

  assert.ok(metric);
  assert.deepEqual(metric.values, [
    { label: "A", count: 2 },
    { label: "B", count: 2 },
    { label: "C", count: 1 },
  ]);
});

test("collectMetricFieldValues splits semicolon-delimited values into unique labels", () => {
  const records = [
    { Area: "NLP; DL" },
    { Area: "DL; IR" },
    { Area: "IR" },
    { Area: "" },
  ];

  assert.deepEqual(collectMetricFieldValues(records, "Area"), ["NLP", "DL", "IR"]);
});

test("normalizeMetricDisplayValue deduplicates semicolon-delimited display values", () => {
  assert.deepEqual(normalizeMetricDisplayValue("DL;NLP"), ["DL", "NLP"]);
  assert.deepEqual(normalizeMetricDisplayValue("DL; NLP; DL"), ["DL", "NLP"]);
  assert.deepEqual(normalizeMetricDisplayValue(["DL", "NLP", "DL"]), ["DL", "NLP"]);
  assert.equal(normalizeMetricDisplayValue("DL"), "DL");
});

test("buildMetricCardData maps enum values for matching cards", () => {
  const metrics = buildSheetMetrics(grantsSheet);
  const cardData = buildMetricCardData(grantsSheet.records[0], metrics);

  assert.equal(cardData["record type"], "Grant");
  assert.equal(cardData.role, "PI");
  assert.equal(cardData["start year"], "2026");
});

test("buildMetricCardData splits semicolon-delimited enum values into arrays", () => {
  const metrics = [{ kind: "enum", label: "Category", fieldKey: "category" }];
  const cardData = buildMetricCardData({ Category: "A; B; C" }, metrics);

  assert.deepEqual(cardData.category, ["A", "B", "C"]);
});
