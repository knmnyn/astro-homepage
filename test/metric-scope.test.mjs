/**
 * Tests for the metric scope controller used by section metric chips.
 *
 * The assertions here exercise the same filtering logic the browser uses,
 * including active button states, card highlighting, dimming, and isolation
 * between multiple scopes on the same page.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { initAllMetricScopes, initMetricScope } from "../src/lib/metric-scope.js";

function createClassList() {
  const classes = new Set();

  return {
    toggle(name, force) {
      if (force) {
        classes.add(name);
      } else {
        classes.delete(name);
      }
    },
    has(name) {
      return classes.has(name);
    },
    values() {
      return [...classes];
    },
  };
}

function createButton(field, value) {
  const listeners = {};
  return {
    dataset: { metricField: field, metricValue: value },
    listeners,
    setAttribute(name, valueToSet) {
      this.attributes = this.attributes || {};
      this.attributes[name] = valueToSet;
    },
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    click() {
      listeners.click?.();
    },
  };
}

function createSortButton(field, label) {
  const listeners = {};
  return {
    dataset: { sortField: field, sortLabel: label, sortDirection: "asc" },
    listeners,
    setAttribute(name, valueToSet) {
      this.attributes = this.attributes || {};
      this.attributes[name] = valueToSet;
    },
    querySelector(selector) {
      if (selector === "[data-sort-indicator]") {
        this.sortIndicator = this.sortIndicator || { textContent: "↕" };
        return this.sortIndicator;
      }
      return null;
    },
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    click() {
      listeners.click?.();
    },
  };
}

function createCard(values) {
  return {
    dataset: { metricValues: JSON.stringify(values) },
    classList: createClassList(),
  };
}

function createCardContainer(cards) {
  const order = [...cards];
  const parent = {
    order,
    appendChild(card) {
      const currentIndex = order.indexOf(card);
      if (currentIndex !== -1) {
        order.splice(currentIndex, 1);
      }
      order.push(card);
      card.parentElement = parent;
      return card;
    },
  };

  for (const card of cards) {
    card.parentElement = parent;
  }

  return parent;
}

function createMetricsRoot(buttons, sortButtons = []) {
  return {
    querySelectorAll(selector) {
      if (selector === "[data-metric-toggle]") return buttons;
      if (selector === "[data-sort-toggle]") return sortButtons;
      return [];
    },
  };
}

function createScopeRoot({ buttons, sortButtons = [], cards }) {
  const metricsRoot = createMetricsRoot(buttons, sortButtons);
  const cardContainer = createCardContainer(cards);
  return {
    dataset: {},
    metricsRoot,
    querySelector(selector) {
      return selector === ".section-metrics" ? metricsRoot : null;
    },
    querySelectorAll(selector) {
      return selector === "[data-metric-card]" ? cards : [];
    },
    cardContainer,
  };
}

test("initMetricScope toggles active state, highlight, and dimming", () => {
  const statusButton = createButton("status", "active");
  const roleButton = createButton("role", "PI");
  const activeCard = createCard({ status: "active", role: "Co-PI" });
  const inactiveCard = createCard({ status: "archived", role: "PI" });
  const scopeRoot = createScopeRoot({ buttons: [statusButton, roleButton], cards: [activeCard, inactiveCard] });

  initMetricScope(scopeRoot);

  assert.equal(scopeRoot.dataset.metricScopeInitialized, "true");
  assert.equal(activeCard.classList.has("metric-card--highlight"), false);
  assert.equal(inactiveCard.classList.has("metric-card--highlight"), false);
  assert.equal(inactiveCard.classList.has("metric-card--dim"), false);
  assert.equal(statusButton.attributes["aria-pressed"], "false");
  assert.equal(roleButton.attributes["aria-pressed"], "false");

  statusButton.click();
  assert.equal(statusButton.attributes["aria-pressed"], "true");
  assert.equal(roleButton.attributes["aria-pressed"], "false");
  assert.equal(activeCard.classList.has("metric-card--highlight"), true);
  assert.equal(activeCard.classList.has("metric-card--dim"), false);
  assert.equal(inactiveCard.classList.has("metric-card--highlight"), false);
  assert.equal(inactiveCard.classList.has("metric-card--dim"), true);

  roleButton.click();
  assert.equal(statusButton.attributes["aria-pressed"], "false");
  assert.equal(roleButton.attributes["aria-pressed"], "true");
  assert.equal(activeCard.classList.has("metric-card--highlight"), false);
  assert.equal(inactiveCard.classList.has("metric-card--highlight"), true);
  assert.equal(activeCard.classList.has("metric-card--dim"), true);
  assert.equal(inactiveCard.classList.has("metric-card--dim"), false);
});

test("initMetricScope sorts cards by a sort toggle", () => {
  const sortButton = createSortButton("start year", "Start year");
  const firstCard = createCard({ "start year": "2023" });
  const secondCard = createCard({ "start year": "2019" });
  const thirdCard = createCard({ "start year": "" });
  const scopeRoot = createScopeRoot({ buttons: [], sortButtons: [sortButton], cards: [firstCard, secondCard, thirdCard] });

  initMetricScope(scopeRoot);

  assert.deepEqual(scopeRoot.cardContainer.order, [firstCard, secondCard, thirdCard]);
  assert.equal(sortButton.attributes["aria-pressed"], "false");
  assert.equal(sortButton.attributes["data-sort-direction"], "asc");
  assert.equal(sortButton.sortIndicator.textContent, "↕");

  sortButton.click();
  assert.deepEqual(scopeRoot.cardContainer.order, [secondCard, firstCard, thirdCard]);
  assert.equal(sortButton.attributes["aria-pressed"], "true");
  assert.equal(sortButton.attributes["data-sort-direction"], "asc");
  assert.equal(sortButton.sortIndicator.textContent, "↑");

  sortButton.click();
  assert.deepEqual(scopeRoot.cardContainer.order, [firstCard, secondCard, thirdCard]);
  assert.equal(sortButton.attributes["data-sort-direction"], "desc");
  assert.equal(sortButton.sortIndicator.textContent, "↓");
});

test("initMetricScope keeps filtering active while sorting and compares numbers naturally", () => {
  const roleButton = createButton("role", "PI");
  const sortButton = createSortButton("start year", "Start year");
  const firstCard = createCard({ role: "PI", "start year": "2024" });
  const secondCard = createCard({ role: "Co-PI", "start year": "2019" });
  const thirdCard = createCard({ role: "PI", "start year": "2026" });
  const scopeRoot = createScopeRoot({ buttons: [roleButton], sortButtons: [sortButton], cards: [firstCard, secondCard, thirdCard] });

  initMetricScope(scopeRoot);

  roleButton.click();
  assert.equal(firstCard.classList.has("metric-card--highlight"), true);
  assert.equal(secondCard.classList.has("metric-card--dim"), true);
  assert.equal(thirdCard.classList.has("metric-card--highlight"), true);
  assert.deepEqual(scopeRoot.cardContainer.order, [firstCard, secondCard, thirdCard]);

  sortButton.click();
  assert.deepEqual(scopeRoot.cardContainer.order, [secondCard, firstCard, thirdCard]);
  assert.equal(firstCard.classList.has("metric-card--highlight"), true);
  assert.equal(secondCard.classList.has("metric-card--dim"), true);
  assert.equal(thirdCard.classList.has("metric-card--highlight"), true);
});

test("initMetricScope matches semicolon-delimited values as multiple categories", () => {
  const roleButton = createButton("role", "PI");
  const multiRoleCard = createCard({ role: ["PI", "Co-PI"] });
  const otherCard = createCard({ role: "Student" });
  const scopeRoot = createScopeRoot({ buttons: [roleButton], cards: [multiRoleCard, otherCard] });

  initMetricScope(scopeRoot);

  roleButton.click();
  assert.equal(multiRoleCard.classList.has("metric-card--highlight"), true);
  assert.equal(otherCard.classList.has("metric-card--highlight"), false);
  assert.equal(otherCard.classList.has("metric-card--dim"), true);
});

test("initMetricScope sorts decimals and magnitude suffixes numerically", () => {
  const sortButton = createSortButton("amount", "Amount");
  const firstCard = createCard({ amount: "1.2M" });
  const secondCard = createCard({ amount: "950" });
  const thirdCard = createCard({ amount: "2.5k" });
  const fourthCard = createCard({ amount: "" });
  const scopeRoot = createScopeRoot({ buttons: [], sortButtons: [sortButton], cards: [firstCard, secondCard, thirdCard, fourthCard] });

  initMetricScope(scopeRoot);

  sortButton.click();
  assert.deepEqual(scopeRoot.cardContainer.order, [secondCard, thirdCard, firstCard, fourthCard]);

  sortButton.click();
  assert.deepEqual(scopeRoot.cardContainer.order, [firstCard, thirdCard, secondCard, fourthCard]);
});

test("initMetricScope accepts optional spaces before magnitude suffixes", () => {
  const sortButton = createSortButton("amount", "Amount");
  const firstCard = createCard({ amount: "2.5 M" });
  const secondCard = createCard({ amount: "900 K" });
  const thirdCard = createCard({ amount: "1.1 B" });
  const scopeRoot = createScopeRoot({ buttons: [], sortButtons: [sortButton], cards: [firstCard, secondCard, thirdCard] });

  initMetricScope(scopeRoot);

  sortButton.click();
  assert.deepEqual(scopeRoot.cardContainer.order, [secondCard, firstCard, thirdCard]);
});

test("initMetricScope sorts date-like values chronologically", () => {
  const sortButton = createSortButton("date", "Date");
  const firstCard = createCard({ date: "16 Sep 2025" });
  const secondCard = createCard({ date: "24 Aug 2018" });
  const thirdCard = createCard({ date: "8 Jan 2025" });
  const fourthCard = createCard({ date: "" });
  const scopeRoot = createScopeRoot({ buttons: [], sortButtons: [sortButton], cards: [firstCard, secondCard, thirdCard, fourthCard] });

  initMetricScope(scopeRoot);

  sortButton.click();
  assert.deepEqual(scopeRoot.cardContainer.order, [secondCard, thirdCard, firstCard, fourthCard]);

  sortButton.click();
  assert.deepEqual(scopeRoot.cardContainer.order, [firstCard, thirdCard, secondCard, fourthCard]);
});

test("initAllMetricScopes keeps sections isolated", () => {
  const firstButton = createButton("status", "active");
  const secondButton = createButton("status", "draft");
  const firstCard = createCard({ status: "active" });
  const secondCard = createCard({ status: "draft" });
  const firstScope = createScopeRoot({ buttons: [firstButton], cards: [firstCard] });
  const secondScope = createScopeRoot({ buttons: [secondButton], cards: [secondCard] });

  const documentLike = {
    querySelectorAll(selector) {
      return selector === "[data-metric-scope-root]" ? [firstScope, secondScope] : [];
    },
  };

  initAllMetricScopes(documentLike);

  assert.equal(firstCard.classList.has("metric-card--highlight"), false);
  assert.equal(secondCard.classList.has("metric-card--highlight"), false);

  firstButton.click();
  assert.equal(firstCard.classList.has("metric-card--highlight"), true);
  assert.equal(secondCard.classList.has("metric-card--highlight"), false);
  assert.equal(secondCard.classList.has("metric-card--dim"), false);

  secondButton.click();
  assert.equal(firstCard.classList.has("metric-card--highlight"), true);
  assert.equal(secondCard.classList.has("metric-card--highlight"), true);
  assert.equal(firstCard.classList.has("metric-card--dim"), false);
  assert.equal(secondCard.classList.has("metric-card--dim"), false);
});
