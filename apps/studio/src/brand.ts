import { buildLegacyTheme } from "sanity";

/** Decision 17: warm ivory panels, deep-brown top bar, deep gold for the main button and labels. */
export const wbskTheme = buildLegacyTheme({
  "--font-family-base": '"Hanken Grotesk", -apple-system, "Helvetica Neue", Arial, sans-serif',
  "--black": "#1F1914",
  "--white": "#FFFDF9",
  "--gray-base": "#6B5E50",
  "--gray": "#6B5E50",
  "--component-bg": "#FFFDF9",
  "--component-text-color": "#231C16",
  "--brand-primary": "#7A5C17",
  "--default-button-color": "#6B5E50",
  "--default-button-primary-color": "#7A5C17",
  "--default-button-success-color": "#2F6B3F",
  "--default-button-warning-color": "#8A6D1A",
  "--default-button-danger-color": "#A32A1E",
  "--state-info-color": "#7A5C17",
  "--state-success-color": "#2F6B3F",
  "--state-warning-color": "#8A6D1A",
  "--state-danger-color": "#A32A1E",
  "--main-navigation-color": "#1F1914",
  "--main-navigation-color--inverted": "#F5EFE6",
  "--focus-color": "#7A5C17",
});

/** Only this Sanity account sees Delete (Decision 20; the plan's Q3). The rest is a guard rail, not a lock. */
export const OWNER_USER_IDS = new Set(["gultaHcjn", "pXeDJ7ysE"]);
