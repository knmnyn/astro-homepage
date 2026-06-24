import { stripMetricMarker } from "./sheet-metrics.js";

function isUrlFieldName(fieldName = "") {
  const normalized = stripMetricMarker(fieldName).trim();
  const lowered = normalized.toLowerCase();
  return lowered !== "url" && (lowered === "video" || /url$/i.test(normalized));
}

function formatUrlFieldLabel(fieldName = "") {
  return stripMetricMarker(fieldName)
    .trim()
    .replace(/\s*url$/i, "")
    .trim();
}

export function isEmbeddableVideoUrl(rawUrl = "") {
  return Boolean(getEmbeddableVideoSrc(rawUrl));
}

export function isFeaturedTalkCard(talk = {}) {
  return isEmbeddableVideoUrl(talk.videoUrl);
}

function extractIframeSrc(rawUrl = "") {
  const match = String(rawUrl || "").match(/<iframe[^>]*\ssrc=(?:"([^"]+)"|'([^']+)')[^>]*>/i);
  return match ? match[1] || match[2] || "" : "";
}

function isSafeEmbedUrl(href = "") {
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeVimeoSrc(url) {
  const pathname = url.pathname.replace(/\/$/, "");
  const vimeoIdMatch =
    pathname.match(/^\/(?:video\/)?(\d+)$/) ||
    pathname.match(/^\/(\d+)$/) ||
    pathname.match(/^\/channels\/[^/]+\/(\d+)$/) ||
    pathname.match(/^\/groups\/[^/]+\/videos?\/(\d+)$/);
  const videoId = vimeoIdMatch ? vimeoIdMatch[1] : "";

  if (videoId) {
    return `https://player.vimeo.com/video/${videoId}`;
  }

  if (url.hostname.includes("player.vimeo.com") && pathname.includes("/video/")) {
    return url.href;
  }

  return "";
}

export function getEmbeddableVideoSrc(rawUrl = "") {
  const href = String(rawUrl || "").trim();
  if (!href) {
    return "";
  }

  const iframeSrc = extractIframeSrc(href);
  if (iframeSrc && isSafeEmbedUrl(iframeSrc)) {
    return iframeSrc;
  }

  try {
    const url = new URL(href);

    if (url.hostname.includes("youtube.com") && url.pathname.includes("/embed/")) {
      return url.href;
    }

    if (url.hostname === "youtu.be" && url.pathname.length > 1) {
      return `https://www.youtube.com/embed/${url.pathname.replace(/^\//, "")}`;
    }

    if (url.hostname.includes("vimeo.com")) {
      return normalizeVimeoSrc(url);
    }

    if (url.pathname.toLowerCase().includes("/embed/")) {
      return url.href;
    }
  } catch {
    return "";
  }

  return "";
}

export function collectSheetUrlLinks(record) {
  return Object.entries(record ?? {})
    .filter(([fieldName, value]) => isUrlFieldName(fieldName) && String(value || "").trim())
    .map(([fieldName, value]) => ({
      label: formatUrlFieldLabel(fieldName),
      href: String(value).trim(),
    }));
}
