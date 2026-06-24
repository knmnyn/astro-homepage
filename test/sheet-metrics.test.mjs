/**
 * Tests for the sheet metric inference helpers.
 *
 * These assertions protect the marker-based schema contract so that a changed
 * spreadsheet header layout does not silently break metric generation or the
 * card payloads used by the browser-side filtering logic.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { buildMetricCardData, buildSheetMetrics, getSheetCountMetric, stripMetricMarker } from "../src/lib/sheet-metrics.js";
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
  assert.equal(recordTypeMetric.values.reduce((sum, entry) => sum + entry.count, 0), grantsSheet.row_count);
  assert.equal(roleMetric.values.reduce((sum, entry) => sum + entry.count, 0), grantsSheet.row_count);
});

test("buildMetricCardData maps enum values for matching cards", () => {
  const metrics = buildSheetMetrics(grantsSheet);
  const cardData = buildMetricCardData(grantsSheet.records[0], metrics);

  assert.equal(cardData["record type"], "grant");
  assert.equal(cardData.role, "Co-PI");
  assert.equal(cardData["start year"], "2026");
});
