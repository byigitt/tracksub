import type { ExpoConfig } from 'expo/config';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

const config: ExpoConfig = {
  name: 'Tracksub',
  slug: 'tracksub',
  scheme: 'tracksub',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'app.tracksub.mobile',
    supportsTablet: true,
  },
  android: {
    package: 'app.tracksub.mobile',
  },
  web: {
    bundler: 'metro',
  },
  plugins: ['expo-router', 'expo-secure-store', 'expo-web-browser'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: API_URL,
  },
};

export default config;
