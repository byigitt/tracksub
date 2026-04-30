import 'react-native-gesture-handler';
import '../global.css';

import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiClientProvider } from '@tracksub/query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import { createQueryClient } from '@/lib/query-client';
import { NAV_THEME } from '@/lib/theme';
import { useTheme, useThemeBootstrap } from '@/lib/use-theme';

export default function RootLayout() {
  const [queryClient] = useState(() => createQueryClient());
  useThemeBootstrap();
  const { colorScheme } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ApiClientProvider client={apiClient}>
            <ThemeProvider value={NAV_THEME[colorScheme]}>
              <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: {
                    backgroundColor: NAV_THEME[colorScheme].colors.background,
                  },
                }}
              />
              <PortalHost />
            </ThemeProvider>
          </ApiClientProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
