// Theme: light | dark | system
export type Theme = 'light' | 'dark' | 'system';

const KEY = 'tracksub-theme';

export const getTheme = (): Theme => {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem(KEY) as Theme | null) ?? 'system';
};

export const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
};

export const setTheme = (theme: Theme) => {
  if (theme === 'system') {
    localStorage.removeItem(KEY);
  } else {
    localStorage.setItem(KEY, theme);
  }
  applyTheme(theme);
};
