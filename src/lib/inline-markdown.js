function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value = "") {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function sanitizeHref(rawHref = "") {
  const href = String(rawHref).trim();
  if (!href) {
    return "";
  }

  try {
    const url = new URL(href, "https://example.invalid");
    if (!["http:", "https:", "mailto:", "tel:", "ftp:"].includes(url.protocol)) {
      return "";
    }
    return escapeAttribute(url.href);
  } catch {
    return "";
  }
}

const ALLOWED_INLINE_HTML_TAGS = new Set([
  "a",
  "abbr",
  "b",
  "br",
  "code",
  "em",
  "i",
  "img",
  "kbd",
  "mark",
  "q",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
]);
const INLINE_HTML_TOKEN_PREFIX = "\uE000HTML";
const INLINE_HTML_TOKEN_SUFFIX = "\uE001";
const INLINE_HTML_TAG_RE = /<\/?[a-zA-Z][\w:-]*(?:\s+[^<>]*)?\s*\/?>/g;
const INLINE_ATTR_RE = /([^\s=/>]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>`]+)))?/g;

function sanitizeInlineHtmlTag(match) {
  const parsed = match.match(/^<\s*(\/?)\s*([a-zA-Z][\w:-]*)([^<>]*?)\s*(\/?)\s*>$/);
  if (!parsed) {
    return escapeHtml(match);
  }

  const closing = Boolean(parsed[1]);
  const tagName = parsed[2].toLowerCase();
  const rawAttributes = String(parsed[3] || "");
  const selfClosing = Boolean(parsed[4]);

  if (!ALLOWED_INLINE_HTML_TAGS.has(tagName)) {
    return escapeHtml(match);
  }

  if (tagName === "br") {
    return "<br />";
  }

  if (closing) {
    return `</${tagName}>`;
  }

  const allowedAttributes = [];
  const attributeNames = tagName === "a"
    ? new Set(["class", "href", "rel", "target", "title", "aria-label", "aria-hidden", "id", "lang", "dir"])
    : tagName === "img"
      ? new Set(["alt", "class", "height", "id", "loading", "referrerpolicy", "sizes", "src", "srcset", "title", "width", "aria-label", "aria-hidden", "lang", "dir"])
      : new Set(["class", "id", "lang", "dir", "title", "aria-label", "aria-hidden"]);

  let attrMatch;
  while ((attrMatch = INLINE_ATTR_RE.exec(rawAttributes))) {
    const attrName = String(attrMatch[1] || "").trim().toLowerCase();
    if (!attrName) {
      continue;
    }

    const rawValue = attrMatch[3] ?? attrMatch[4] ?? attrMatch[5] ?? "";
    if (attrName.startsWith("on")) {
      continue;
    }

    if (attrName.startsWith("data-") || attrName.startsWith("aria-") || attributeNames.has(attrName)) {
      if (tagName === "a" && attrName === "href") {
        const safeHref = sanitizeHref(rawValue);
        if (safeHref) {
          allowedAttributes.push(`href="${safeHref}"`);
        }
        continue;
      }

      if (tagName === "img" && attrName === "src") {
        const safeSrc = sanitizeHref(rawValue);
        if (safeSrc) {
          allowedAttributes.push(`src="${safeSrc}"`);
        }
        continue;
      }

      if (tagName === "a" && attrName === "target") {
        const safeTarget = String(rawValue).trim();
        if (["_blank", "_self", "_parent", "_top"].includes(safeTarget)) {
          allowedAttributes.push(`target="${escapeAttribute(safeTarget)}"`);
        }
        continue;
      }

      if (tagName === "a" && attrName === "rel") {
        const safeRel = String(rawValue).trim();
        if (safeRel) {
          allowedAttributes.push(`rel="${escapeAttribute(safeRel)}"`);
        }
        continue;
      }

      if (tagName === "img" && attrName === "loading") {
        const safeLoading = String(rawValue).trim();
        if (["lazy", "eager"].includes(safeLoading)) {
          allowedAttributes.push(`loading="${escapeAttribute(safeLoading)}"`);
        }
        continue;
      }

      if (tagName === "img" && attrName === "referrerpolicy") {
        const safePolicy = String(rawValue).trim();
        if (safePolicy) {
          allowedAttributes.push(`referrerpolicy="${escapeAttribute(safePolicy)}"`);
        }
        continue;
      }

      if (rawValue === "") {
        allowedAttributes.push(attrName);
      } else {
        allowedAttributes.push(`${attrName}="${escapeAttribute(rawValue)}"`);
      }
    }
  }

  if (tagName === "a" && !allowedAttributes.some((attr) => attr.startsWith("rel="))) {
    allowedAttributes.push('rel="noreferrer"');
  }

  if (tagName === "img") {
    return `<img${allowedAttributes.length ? ` ${allowedAttributes.join(" ")}` : ""} />`;
  }

  return `<${tagName}${allowedAttributes.length ? ` ${allowedAttributes.join(" ")}` : ""}${selfClosing ? " /" : ""}>`;
}

function protectInlineHtml(source = "") {
  const placeholders = [];
  const protectedSource = String(source).replace(INLINE_HTML_TAG_RE, (match) => {
    const sanitized = sanitizeInlineHtmlTag(match);
    const token = `${INLINE_HTML_TOKEN_PREFIX}${placeholders.length}${INLINE_HTML_TOKEN_SUFFIX}`;
    placeholders.push(sanitized);
    return token;
  });

  return {
    placeholders,
    protectedSource,
  };
}

function restoreInlineHtml(rendered = "", placeholders = []) {
  return placeholders.reduce(
    (output, replacement, index) =>
      output.replaceAll(`${INLINE_HTML_TOKEN_PREFIX}${index}${INLINE_HTML_TOKEN_SUFFIX}`, replacement),
    rendered,
  );
}

function renderInlineText(value = "") {
  const { placeholders, protectedSource } = protectInlineHtml(value);
  let rendered = escapeHtml(protectedSource);

  rendered = rendered.replace(/\[([^\]]+)\]\(((?:[^()]|\([^()]*\))*)\)/g, (_, label, href) => {
    const safeHref = sanitizeHref(href);
    if (!safeHref) {
      return escapeHtml(label);
    }

    return `<a href="${safeHref}" rel="noreferrer">${escapeHtml(label)}</a>`;
  });

  rendered = rendered.replace(/`([^`]+)`/g, "<code>$1</code>");
  rendered = rendered.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  rendered = rendered.replace(/(^|[\s>])_([^_]+)_([\s<]|$)/g, (_, lead, text, trail) => `${lead}<em>${text}</em>${trail}`);

  return restoreInlineHtml(rendered, placeholders);
}

function isTableSeparator(line = "") {
  const trimmed = String(line).trim();
  if (!trimmed.includes("|")) {
    return false;
  }

  const cells = trimmed.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim()).filter(Boolean);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderTableBlock(rows) {
  if (!Array.isArray(rows) || rows.length < 2) {
    return "";
  }

  const [headerRow, ...bodyRows] = rows;
  const headers = headerRow.split("|").map((cell) => cell.trim()).filter((cell) => cell.length > 0 || headerRow.includes("|"));
  const body = bodyRows.map((row) => row.split("|").map((cell) => cell.trim()));

  const headHtml = headers.map((cell) => `<th>${renderInlineText(cell)}</th>`).join("");
  const bodyHtml = body
    .map((cells) => `<tr>${cells.map((cell) => `<td>${renderInlineText(cell)}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

function renderParagraphBlock(lines) {
  return `<p>${renderInlineText(lines.join(" "))}</p>`;
}

function renderBlockMarkdown(value = "") {
  const lines = String(value).replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push(`<h${heading[1].length}>${renderInlineText(heading[2])}</h${heading[1].length}>`);
      continue;
    }

    const image = trimmed.match(/^!\[([^\]]*)\]\(((?:[^()]|\([^()]*\))*)\)$/);
    if (image) {
      const safeSrc = sanitizeHref(image[2]);
      if (safeSrc) {
        blocks.push(`<img src="${safeSrc}" alt="${escapeAttribute(image[1])}" />`);
      }
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines = [trimmed.replace(/^>\s?/, "")];
      while (index + 1 < lines.length && /^\s*>\s?/.test(lines[index + 1])) {
        index += 1;
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
      }
      blocks.push(`<blockquote><p>${renderInlineText(quoteLines.join(" "))}</p></blockquote>`);
      continue;
    }

    const listMatch = trimmed.match(/^([*-]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const ordered = /\d+\./.test(listMatch[1]);
      const items = [listMatch[2]];

      while (index + 1 < lines.length) {
        const next = lines[index + 1].trim();
        const nextMatch = next.match(/^([*-]|\d+\.)\s+(.+)$/);
        if (!nextMatch || (/\d+\./.test(nextMatch[1]) !== ordered)) {
          break;
        }
        index += 1;
        items.push(nextMatch[2]);
      }

      const tag = ordered ? "ol" : "ul";
      blocks.push(`<${tag}>${items.map((item) => `<li>${renderInlineText(item)}</li>`).join("")}</${tag}>`);
      continue;
    }

    if (trimmed.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const tableRows = [trimmed.replace(/^\|/, "").replace(/\|$/, "")];
      index += 1;
      while (index + 1 < lines.length && lines[index + 1].trim().includes("|")) {
        index += 1;
        tableRows.push(lines[index].trim().replace(/^\|/, "").replace(/\|$/, ""));
      }
      blocks.push(renderTableBlock(tableRows));
      continue;
    }

    const paragraphLines = [trimmed];
    while (index + 1 < lines.length) {
      const next = lines[index + 1].trim();
      const nextIsBlock =
        !next ||
        /^(#{1,3})\s+/.test(next) ||
        /^!\[([^\]]*)\]\(((?:[^()]|\([^()]*\))*)\)$/.test(next) ||
        /^>\s?/.test(next) ||
        /^([*-]|\d+\.)\s+/.test(next) ||
        (next.includes("|") && index + 2 < lines.length && isTableSeparator(lines[index + 2]));

      if (nextIsBlock) {
        break;
      }

      index += 1;
      paragraphLines.push(next);
    }

    blocks.push(renderParagraphBlock(paragraphLines));
  }

  return blocks.join("");
}

export function renderInlineMarkdown(value = "") {
  const source = String(value ?? "");
  if (!/[\n\r]/.test(source) && !/^\s*(#{1,3}\s|>\s|[*-]\s|\d+\.\s|!\[)/m.test(source)) {
    return renderInlineText(source);
  }

  return renderBlockMarkdown(source);
}
