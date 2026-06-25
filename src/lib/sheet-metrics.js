/**
 * Sheet metric helpers.
 *
 * Spreadsheet headers use `[#]` to mark metric columns and `[|]` to mark
 * sortable columns. The row-level markers `[!]` and `[*]` are stripped from
 * values as they are read so the UI can keep showing clean labels.
 */
const COLUMN_MARKER_RE = /^\s*\[(?:#|\|)\]\s*/;
const ROW_MARKER_RE = /^\s*\[(?:!|\*)\]\s*/;
const METRIC_PREFIX_RE = /^\s*\[#\]\s*/;
const SORT_PREFIX_RE = /^\s*\[\|\]\s*/;

export function stripMetricMarker(value = "") {
  return String(value).replace(COLUMN_MARKER_RE, "").replace(ROW_MARKER_RE, "").trim();
}

function normalizeMetricHeader(header = "") {
  const raw = String(header).trim();
  const label = stripMetricMarker(raw);
  const fieldKey = normalizeFieldName(label);

  if (!raw) {
    return null;
  }

  return {
    raw,
    label,
    fieldKey,
    metric: METRIC_PREFIX_RE.test(raw),
    sortable: SORT_PREFIX_RE.test(raw),
    kind: METRIC_PREFIX_RE.test(raw)
      ? fieldKey === "id"
        ? "count"
        : "enum"
      : SORT_PREFIX_RE.test(raw)
        ? "sort"
        : null,
  };
}

function normalizeFieldName(value = "") {
  return stripMetricMarker(value).toLowerCase();
}

function lookupField(record, fieldName) {
  const target = normalizeFieldName(fieldName);
  for (const [key, value] of Object.entries(record ?? {})) {
    if (normalizeFieldName(key) === target) {
      return value;
    }
  }
  return "";
}

function splitMetricValues(value = "") {
  return [...new Set(
    String(value || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean),
  )];
}

export function normalizeMetricDisplayValue(value = "") {
  if (Array.isArray(value)) {
    return [...new Set(value.map((part) => String(part || "").trim()).filter(Boolean))];
  }

  const raw = String(value ?? "").trim();
  if (!raw.includes(";")) {
    return raw;
  }

  const parts = splitMetricValues(raw);
  return parts.length <= 1 ? parts[0] || "" : parts;
}

export function collectMetricFieldValues(records, fieldName) {
  const values = new Set();

  for (const record of Array.isArray(records) ? records : []) {
    const rawValue = String(lookupField(record, fieldName) ?? "").trim();
    if (!rawValue) continue;

    for (const value of splitMetricValues(rawValue)) {
      values.add(value);
    }
  }

  return [...values];
}

function countValues(records, fieldName) {
  const counts = new Map();

  for (const record of records) {
    const rawValue = String(lookupField(record, fieldName) ?? "").trim();
    if (!rawValue) continue;

    for (const value of splitMetricValues(rawValue)) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export function buildSheetMetrics(sheet) {
  const records = Array.isArray(sheet?.records) ? sheet.records : [];
  const rawHeaders = Array.isArray(sheet?.headers) ? sheet.headers : [];
  const headerMeta = Array.isArray(sheet?.header_meta) && sheet.header_meta.length > 0
    ? sheet.header_meta
    : rawHeaders.map(normalizeMetricHeader).filter(Boolean);

  const metrics = [];

  for (const header of headerMeta) {
    if (!header?.metric && !header?.sortable) continue;

    if (header.kind === "count") {
      metrics.push({
        kind: "count",
        label: "Items",
        fieldKey: header.fieldKey,
        value: records.length,
      });
      continue;
    }

    if (header.kind === "sort") {
      metrics.push({
        kind: "sort",
        label: header.label,
        fieldKey: header.fieldKey,
      });
      continue;
    }

    const values = countValues(records, header.label);
    if (!values.length) continue;

    metrics.push({
      kind: "enum",
      label: header.label,
      fieldKey: header.fieldKey,
      values,
    });
  }

  return metrics;
}

export function getSheetCountMetric(metrics) {
  return Array.isArray(metrics) ? metrics.find((metric) => metric?.kind === "count") || null : null;
}

export function buildMetricCardData(record, metrics) {
  const data = {};

  for (const metric of Array.isArray(metrics) ? metrics : []) {
    if ((metric?.kind !== "enum" && metric?.kind !== "sort") || !metric.fieldKey) continue;
    const value = String(lookupField(record, metric.label) ?? "").trim();
    if (value) {
      if (metric.kind === "enum") {
        const parts = splitMetricValues(value);
        if (!parts.length) continue;
        data[metric.fieldKey] = parts.length === 1 ? parts[0] : parts;
      } else {
        data[metric.fieldKey] = value;
      }
    }
  }

  return data;
}

export function serializeMetricCardData(record, metrics) {
  return JSON.stringify(buildMetricCardData(record, metrics));
}
