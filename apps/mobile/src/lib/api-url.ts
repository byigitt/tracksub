import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolve the API base URL.
 *
 * Priority:
 *   1. `EXPO_PUBLIC_API_URL` env (passed through `app.config.ts` → `extra.apiUrl`).
 *   2. Sensible dev default per platform:
 *      - iOS simulator: `http://localhost:4000`
 *      - Android emulator: `http://10.0.2.2:4000` (host-loopback alias)
 *      - Real device on Expo Go / dev build: derive LAN IP from Expo's hostUri.
 */
export const getApiUrl = (): string => {
  const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (fromExtra && fromExtra !== 'http://localhost:4000') return fromExtra;

  // Constants.expoConfig.hostUri is set by Expo CLI when running in dev.
  const hostUri = (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ?? null;

  if (hostUri && typeof hostUri === 'string') {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:4000`;
    }
  }

  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  return 'http://localhost:4000';
};

export const API_URL = getApiUrl();
