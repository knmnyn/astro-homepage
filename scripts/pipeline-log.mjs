/**
 * Shared HTML pipeline log helper.
 *
 * Purpose:
 * - Maintain a gitignored HTML log under `.cache/astro-homepage/`.
 * - Append human-readable rows for watcher, build, and export runs.
 * - Copy the current log into a serving destination as `pipeline-log.html`.
 *
 * Notes:
 * - This helper is intentionally tiny so the watcher and export scripts can
 *   share the same on-disk format without extra dependencies.
 */
import fs from "node:fs/promises";
import path from "node:path";

const cacheRelativeDir = path.join(".cache", "astro-homepage");
const logFileName = "pipeline-log.html";

/**
 * Return the cache directory and HTML log path for this repository.
 */
function pipelineLogPaths(repoRoot) {
  const cacheDir = path.join(repoRoot, cacheRelativeDir);
  return {
    cacheDir,
    cachePath: path.join(cacheDir, logFileName),
  };
}

/**
 * Escape a value for safe insertion into HTML text content.
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Format one log row for the HTML table.
 */
function renderLogRow(entry) {
  const details = Array.isArray(entry.details) ? entry.details.filter(Boolean).map(escapeHtml).join("<br />") : "";
  const destination = entry.destination ? escapeHtml(entry.destination) : "";

  return `      <tr>
        <td>${escapeHtml(entry.timestamp)}</td>
        <td>${escapeHtml(entry.utility)}</td>
        <td>${escapeHtml(entry.action)}</td>
        <td>${escapeHtml(entry.status)}</td>
        <td>${escapeHtml(entry.summary)}</td>
        <td>${details}${destination ? `${details ? "<br />" : ""}${destination}` : ""}</td>
      </tr>`;
}

/**
 * Build a complete HTML document when no log exists yet.
 */
function renderLogDocument({ title, refreshedAt, rows }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f8f4ee;
        --panel: #fffaf4;
        --text: #1f2933;
        --muted: #667085;
        --line: rgba(31, 41, 51, 0.12);
        --accent: #173f5f;
      }
      body {
        margin: 0;
        padding: 24px;
        background: var(--bg);
        color: var(--text);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        max-width: 1100px;
        margin: 0 auto;
      }
      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 20px;
        box-shadow: 0 18px 40px rgba(23, 63, 95, 0.08);
      }
      h1 {
        margin: 0 0 8px;
        font-size: 2rem;
      }
      p {
        margin: 0.4rem 0;
        color: var(--muted);
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 16px;
      }
      th,
      td {
        border-top: 1px solid var(--line);
        padding: 10px 12px;
        text-align: left;
        vertical-align: top;
        font-size: 0.92rem;
      }
      th {
        color: var(--accent);
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      td:last-child {
        white-space: pre-wrap;
      }
      .meta {
        color: var(--muted);
        font-size: 0.9rem;
      }
      .timestamp {
        font-variant-numeric: tabular-nums;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="panel">
        <h1>${escapeHtml(title)}</h1>
        <p class="meta">Refreshed ${escapeHtml(refreshedAt)}</p>
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Utility</th>
              <th>Action</th>
              <th>Status</th>
              <th>Summary</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
${rows.join("\n")}
          </tbody>
        </table>
      </section>
    </main>
  </body>
</html>
`;
}

/**
 * Append one run log entry to the HTML log file.
 */
async function appendPipelineLogEntry({
  repoRoot,
  utility,
  action,
  status,
  summary,
  details = [],
  destination = "",
  title = "Astro pipeline log",
}) {
  const { cacheDir, cachePath } = pipelineLogPaths(repoRoot);
  await fs.mkdir(cacheDir, { recursive: true });

  const timestamp = new Date().toISOString();
  const row = renderLogRow({
    timestamp,
    utility,
    action,
    status,
    summary,
    details,
    destination,
  });

  const existing = await fs.readFile(cachePath, "utf8").catch(() => "");
  let next;

  if (existing && existing.includes("</tbody>")) {
    next = existing
      .replace(
        /<p class="meta">Refreshed .*?<\/p>/,
        `<p class="meta">Refreshed ${escapeHtml(timestamp)}</p>`,
      )
      .replace("</tbody>", `${row}\n          </tbody>`);
  } else {
    next = renderLogDocument({
      title,
      refreshedAt: timestamp,
      rows: [row],
    });
  }

  await fs.writeFile(cachePath, `${next}\n`);
  return { cachePath, timestamp };
}

/**
 * Copy the HTML log into a destination directory when it exists.
 */
async function copyPipelineLogToDestination({ repoRoot, destDir, filename = logFileName }) {
  const { cachePath } = pipelineLogPaths(repoRoot);
  const logStat = await fs.stat(cachePath).catch(() => null);
  if (!logStat?.isFile?.()) {
    return false;
  }

  await fs.mkdir(destDir, { recursive: true });
  await fs.copyFile(cachePath, path.join(destDir, filename));
  return true;
}

export {
  appendPipelineLogEntry,
  copyPipelineLogToDestination,
  escapeHtml,
  logFileName,
  pipelineLogPaths,
  renderLogDocument,
  renderLogRow,
};
