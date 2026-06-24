const METRIC_VALUES_SELECTOR = "[data-metric-card]";
const METRIC_TOGGLE_SELECTOR = "[data-metric-toggle]";
const SORT_TOGGLE_SELECTOR = "[data-sort-toggle]";

function parseValues(card) {
  try {
    return JSON.parse(card?.dataset?.metricValues || "{}");
  } catch {
    return {};
  }
}

function syncButtons(buttons, activeFilter) {
  for (const button of buttons) {
    const field = button?.dataset?.metricField || "";
    const value = button?.dataset?.metricValue || "";
    if (typeof button?.setAttribute === "function") {
      button.setAttribute("aria-pressed", String(Boolean(activeFilter && activeFilter.field === field && activeFilter.value === value)));
    }
  }
}

function syncSortButtons(buttons, activeSort) {
  for (const button of buttons) {
    const field = button?.dataset?.sortField || "";
    const direction = activeSort && activeSort.field === field ? activeSort.direction : "asc";
    const isActive = Boolean(activeSort && activeSort.field === field);

    if (typeof button?.setAttribute === "function") {
      button.setAttribute("aria-pressed", String(isActive));
      button.setAttribute("data-sort-direction", direction);
      const label = button.dataset.sortLabel || "";
      button.setAttribute("aria-label", `Sort by ${label}, ${direction === "desc" ? "descending" : "ascending"}`);
    }

    const indicator = typeof button?.querySelector === "function" ? button.querySelector("[data-sort-indicator]") : null;
    if (indicator) {
      indicator.textContent = isActive ? (direction === "desc" ? "↓" : "↑") : "↕";
    }
  }
}

function parseSortableNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const match = raw.match(/^([+-]?(?:\d+(?:,\d{3})*|\d*\.\d+))(?:\s*([kKmMbB]))?$/);
  if (!match) {
    return null;
  }

  const amount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount)) {
    return null;
  }

  const suffix = (match[2] || "").toLowerCase();
  const multipliers = {
    k: 1e3,
    m: 1e6,
    b: 1e9,
  };

  return amount * (multipliers[suffix] || 1);
}

function compareValues(leftValue, rightValue) {
  const left = String(leftValue ?? "").trim();
  const right = String(rightValue ?? "").trim();

  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  const leftNumber = parseSortableNumber(left);
  const rightNumber = parseSortableNumber(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

function sortCards(cards, activeSort) {
  if (!activeSort || cards.length < 2) return;

  const parent = cards[0]?.parentElement;
  if (!parent) return;

  const ordered = [...cards].sort((leftCard, rightCard) => {
    const leftValues = parseValues(leftCard);
    const rightValues = parseValues(rightCard);
    const leftValue = leftValues[activeSort.field];
    const rightValue = rightValues[activeSort.field];
    const leftBlank = String(leftValue ?? "").trim() === "";
    const rightBlank = String(rightValue ?? "").trim() === "";

    // Blank values stay at the bottom regardless of sort direction so the
    // active ordering always compares real content first.
    if (leftBlank && rightBlank) {
      return 0;
    }
    if (leftBlank) {
      return 1;
    }
    if (rightBlank) {
      return -1;
    }

    const comparison = compareValues(leftValue, rightValue);
    return activeSort.direction === "desc" ? -comparison : comparison;
  });

  for (const card of ordered) {
    parent.appendChild(card);
  }
}

function applyFilters(cards, buttons, activeFilter, sortButtons = [], activeSort = null) {
  for (const card of cards) {
    const values = parseValues(card);
    const matches = activeFilter ? String(values[activeFilter.field] || "") === activeFilter.value : false;
    card?.classList?.toggle?.("metric-card--highlight", Boolean(activeFilter) && matches);
    card?.classList?.toggle?.("metric-card--dim", Boolean(activeFilter) && !matches);
  }

  syncButtons(buttons, activeFilter);
  sortCards(cards, activeSort);
  syncSortButtons(sortButtons, activeSort);
}

export function initMetricScope(scopeRoot) {
  if (!scopeRoot || scopeRoot.dataset?.metricScopeInitialized === "true") return;

  const metricsRoot = typeof scopeRoot.querySelector === "function" ? scopeRoot.querySelector(".section-metrics") : null;
  const buttons = metricsRoot && typeof metricsRoot.querySelectorAll === "function" ? [...metricsRoot.querySelectorAll(METRIC_TOGGLE_SELECTOR)] : [];
  const sortButtons = metricsRoot && typeof metricsRoot.querySelectorAll === "function" ? [...metricsRoot.querySelectorAll(SORT_TOGGLE_SELECTOR)] : [];
  const cards = typeof scopeRoot.querySelectorAll === "function" ? [...scopeRoot.querySelectorAll(METRIC_VALUES_SELECTOR)] : [];

  if (!metricsRoot || (!buttons.length && !sortButtons.length) || !cards.length) return;

  scopeRoot.dataset.metricScopeInitialized = "true";

  let activeFilter = null;
  let activeSort = null;

  buttons.forEach((button) => {
    button?.addEventListener?.("click", () => {
      const field = button?.dataset?.metricField || "";
      const value = button?.dataset?.metricValue || "";
      if (!field || !value) return;

      if (activeFilter && activeFilter.field === field && activeFilter.value === value) {
        activeFilter = null;
      } else {
        activeFilter = { field, value };
      }

      applyFilters(cards, buttons, activeFilter, sortButtons, activeSort);
    });
  });

  sortButtons.forEach((button) => {
    button?.addEventListener?.("click", () => {
      const field = button?.dataset?.sortField || "";
      if (!field) return;

      if (activeSort && activeSort.field === field) {
        activeSort = {
          field,
          direction: activeSort.direction === "asc" ? "desc" : "asc",
        };
      } else {
        activeSort = { field, direction: "asc" };
      }

      applyFilters(cards, buttons, activeFilter, sortButtons, activeSort);
    });
  });

  applyFilters(cards, buttons, activeFilter, sortButtons, activeSort);
}

export function initAllMetricScopes(root = globalThis.document) {
  if (!root || typeof root.querySelectorAll !== "function") return;

  root.querySelectorAll("[data-metric-scope-root]").forEach(initMetricScope);
}
