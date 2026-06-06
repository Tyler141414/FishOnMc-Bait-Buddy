export type ThemeMode = 'light' | 'dark';

const themeStorageKey = 'fishonmc-theme';

export function getInitialTheme(): ThemeMode {
  const storedTheme = readStoredTheme();

  if (storedTheme) {
    return storedTheme;
  }

  return prefersDarkMode() ? 'dark' : 'light';
}

export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset['theme'] = theme;
  document.documentElement.style.colorScheme = theme;
}

export function persistTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Ignore storage failures and keep the UI working.
  }
}

function readStoredTheme(): ThemeMode | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const storedTheme = window.localStorage.getItem(themeStorageKey);

    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }
  } catch {
    // Ignore storage failures and fall back to the system preference.
  }

  return undefined;
}

function prefersDarkMode(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
