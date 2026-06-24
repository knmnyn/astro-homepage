import { siteData } from "./site-data.js";
import { sitePath } from "./site-path.js";

function orderValue(value) {
  const parsed = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

export const primaryNavItems = siteData.navItems
  .filter((item) => String(item.visible ?? "").trim().toUpperCase() === "TRUE" && item.navHeader && item.path)
  .sort((left, right) => orderValue(left.order) - orderValue(right.order))
  .map((item) => ({
    href: sitePath(String(item.path ?? "").trim().replace(/^\/+/, "")),
    label: item.navHeader,
    title: item.header || item.notes || item.navHeader,
  }));

export function getNavItemById(id) {
  return siteData.navItems.find((item) => item.id === id) || null;
}

export function getNavSectionText(id, fallback = {}) {
  const item = getNavItemById(id) || {};

  return {
    kicker: item.kicker || fallback.kicker || "",
    header: item.header || fallback.header || "",
    intro: item.intro || fallback.intro || "",
    summary: item.summary || fallback.summary || "",
    trailer: item.trailer || fallback.trailer || "",
    notes: item.notes || fallback.notes || "",
  };
}
