export type AppTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "statquest.theme.v1";

export function normalizeAppTheme(value: unknown): AppTheme {
  return value === "dark" ? "dark" : "light";
}

export function loadAppTheme(storage: Pick<Storage, "getItem">): AppTheme {
  return normalizeAppTheme(storage.getItem(THEME_STORAGE_KEY));
}

export function saveAppTheme(
  storage: Pick<Storage, "setItem">,
  theme: AppTheme,
): void {
  storage.setItem(THEME_STORAGE_KEY, theme);
}
