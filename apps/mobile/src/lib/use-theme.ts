import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'tracksub.themePreference';

let cachedPreference: ThemePreference | null = null;

export const getStoredPreference = async (): Promise<ThemePreference> => {
  if (cachedPreference) return cachedPreference;
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    const value: ThemePreference =
      raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
    cachedPreference = value;
    return value;
  } catch {
    return 'system';
  }
};

export const setStoredPreference = async (pref: ThemePreference): Promise<void> => {
  cachedPreference = pref;
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, pref);
  } catch {
    // ignore — preference is best-effort
  }
};

/**
 * Bootstraps theme on app start: reads SecureStore preference and applies it
 * to NativeWind's colorScheme. Safe to call multiple times.
 */
export const useThemeBootstrap = () => {
  const { setColorScheme } = useNativeWindColorScheme();
  useEffect(() => {
    let alive = true;
    void (async () => {
      const pref = await getStoredPreference();
      if (!alive) return;
      setColorScheme(pref);
    })();
    return () => {
      alive = false;
    };
  }, [setColorScheme]);
};

export const useTheme = () => {
  const { colorScheme, setColorScheme } = useNativeWindColorScheme();
  return {
    /** Resolved color scheme — 'light' or 'dark'. */
    colorScheme: colorScheme ?? 'light',
    /** Persist + apply preference. */
    setPreference: async (pref: ThemePreference) => {
      await setStoredPreference(pref);
      setColorScheme(pref);
    },
    getPreference: getStoredPreference,
  };
};
