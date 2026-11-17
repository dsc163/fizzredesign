import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { EmptyState } from './EmptyState';
import { Screen } from './Screen';
import { Button, IconName } from './ui';

// Shown on screens that need an account (Post, Messages, Profile…) when signed out.
export function SignInPrompt({ icon, title, message }: { icon: IconName; title: string; message: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <Screen>
      <View style={styles.wrap}>
        <EmptyState icon={icon} title={title} message={message} />
        <Button title="Sign in or create an account" onPress={() => router.push({ pathname: '/welcome', params: { next: pathname } })} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: Spacing.xl, gap: Spacing.lg, justifyContent: 'center' },
});
