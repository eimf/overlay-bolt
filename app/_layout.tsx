import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ensureSession } from '@/lib/supabase';
import { getPreferences } from '@/lib/preferences';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    if (getPreferences().persistenceEnabled) {
      ensureSession().catch(() => {});
    }
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
