import { useEffect } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/ui/Toast';
import { AUTO_LOCK_MS } from '@/lib/config';
import { installNativeKdf } from '@/lib/crypto/native-kdf';
import { getKdfBackend } from '@/lib/crypto/argon2';
import { useSession } from '@/lib/store/session';
import { useVault } from '@/lib/store/vault';
import { theme } from '@/theme/theme';

// Prefer a native Argon2id backend when the build provides one.
// Policy: __DEV__ (Expo Go / Metro) -> pure JS; release builds -> native.
installNativeKdf();
console.log('[Keychain] KDF backend =', getKdfBackend());

export default function RootLayout() {
  const status = useSession((s) => s.status);
  const bootstrap = useSession((s) => s.bootstrap);
  const vaultKey = useSession((s) => s.vaultKey);
  const loadLocal = useVault((s) => s.loadLocal);
  const sync = useVault((s) => s.sync);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (status === 'loading') return;
    const inAuth = segments[0] === '(auth)';
    if (status === 'unlocked') {
      if (inAuth) router.replace('/(tabs)/vault');
      return;
    }
    if (!inAuth) {
      router.replace(status === 'onboarding' ? '/(auth)/welcome' : '/(auth)/unlock');
    }
  }, [status, segments, router]);

  useEffect(() => {
    if (status === 'unlocked' && vaultKey) {
      void loadLocal().then(() => sync());
    }
  }, [status, vaultKey, loadLocal, sync]);

  // Auto-lock: when the app is backgrounded for longer than AUTO_LOCK_MS, wipe
  // the in-memory vault key so the vault must be unlocked again.
  useEffect(() => {
    let backgroundedAt: number | null = null;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        backgroundedAt = Date.now();
      } else if (next === 'active') {
        if (
          backgroundedAt != null &&
          Date.now() - backgroundedAt >= AUTO_LOCK_MS &&
          useSession.getState().status === 'unlocked'
        ) {
          useSession.getState().lock();
        }
        backgroundedAt = null;
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={styles.root}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="item/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="item/editor" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="item/otp" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="category/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack>
        </View>
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
});