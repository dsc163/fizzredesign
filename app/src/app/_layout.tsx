import { Stack, useGlobalSearchParams, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { ConfirmProvider } from '@/components/ConfirmProvider';
import { Loading } from '@/components/ui';
import { BadgeProvider } from '@/lib/badges';
import { Colors, MaxAppWidth, Typography } from '@/constants/theme';

// Browsing works signed out. Once someone signs in on the welcome screen, send
// them back to the page they came from (e.g. a shared post link).
function AuthGate() {
  const { user, ready } = useAuth();
  const segments = useSegments();
  const { next } = useGlobalSearchParams<{ next?: string }>();
  const router = useRouter();
  const onWelcome = segments[0] === 'welcome';

  useEffect(() => {
    if (!ready) return;
    if (user && onWelcome) {
      router.replace(typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? (next as never) : '/');
    }
  }, [ready, user, onWelcome, router, next]);

  if (!ready) return <Loading />;

  return (
    <Stack
      screenOptions={{
        headerTintColor: Colors.text,
        headerTitleStyle: { ...Typography.heading, color: Colors.text },
        headerStyle: { backgroundColor: Colors.background },
        contentStyle: { backgroundColor: Colors.background },
        headerBackButtonDisplayMode: 'minimal',
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ title: '', headerShadowVisible: false }} />
      <Stack.Screen name="listing/[id]" options={{ title: '' }} />
      <Stack.Screen name="thread/[id]" options={{ title: 'Conversation' }} />
      <Stack.Screen name="profile/edit" options={{ title: 'Edit profile' }} />
      <Stack.Screen name="report" options={{ title: 'Report or block', presentation: 'modal' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <View style={styles.backdrop}>
      <View style={styles.app}>
        <StatusBar style="dark" />
        <AuthProvider>
          <BadgeProvider>
            <ConfirmProvider>
              <AuthGate />
            </ConfirmProvider>
          </BadgeProvider>
        </AuthProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? Colors.webBackdrop : Colors.background,
  },
  app: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: Colors.background,
    ...(Platform.OS === 'web' && {
      maxWidth: MaxAppWidth,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderColor: Colors.border,
    }),
  },
});
