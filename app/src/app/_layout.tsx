import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';

import { Colors, MaxAppWidth, Typography } from '@/constants/theme';

export default function RootLayout() {
  return (
    <View style={styles.backdrop}>
      <View style={styles.app}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: Colors.text,
            headerTitleStyle: { ...Typography.heading, color: Colors.text },
            headerStyle: { backgroundColor: Colors.background },
            contentStyle: { backgroundColor: Colors.background },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="listing/[id]" options={{ title: 'Listing' }} />
        </Stack>
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
