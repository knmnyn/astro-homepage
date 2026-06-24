/**
 * Shared chrome helpers for the top navigation.
 *
 * These pure functions keep the layout script small and make the theme and
 * font-size behavior easy to test without a browser harness.
 */
const VALID_THEME_CHOICES = new Set(["auto", "light", "dark"]);
const VALID_FONT_SCALES = new Set(["80", "100", "120"]);

export function normalizeThemeChoice(choice = "auto") {
  return VALID_THEME_CHOICES.has(choice) ? choice : "auto";
}

export function resolveThemeMode(choice = "auto", prefersDark = false) {
  const normalized = normalizeThemeChoice(choice);
  return normalized === "auto" ? (prefersDark ? "dark" : "light") : normalized;
}

export function normalizeFontScale(scale = "100") {
  return VALID_FONT_SCALES.has(scale) ? scale : "100";
}

export function stepFontScale(currentScale = "100", direction = "up") {
  const scale = normalizeFontScale(currentScale);

  if (direction === "down") {
    return scale === "120" ? "100" : scale === "100" ? "80" : "80";
  }

  return scale === "80" ? "100" : scale === "100" ? "120" : "120";
}
