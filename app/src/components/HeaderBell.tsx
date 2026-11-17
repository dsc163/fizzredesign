import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { Colors } from '@/constants/theme';
import { useBadges } from '@/lib/badges';

export function HeaderBell({ color = Colors.text }: { color?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { notifications } = useBadges();
  if (!user) {
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/welcome', params: { next: pathname } })}
        accessibilityRole="button"
        style={styles.button}>
        <Text style={[styles.signIn, { color }]}>Sign in</Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      accessibilityRole="button"
      accessibilityLabel={notifications ? `Notifications, ${notifications} unread` : 'Notifications'}
      style={styles.button}>
      <Ionicons name={notifications ? 'notifications' : 'notifications-outline'} size={24} color={color} />
      {notifications > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{notifications > 9 ? '9+' : notifications}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: 16, paddingVertical: 6 },
  badge: {
    position: 'absolute',
    top: 2,
    right: 10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  signIn: { fontSize: 15, fontWeight: '700' },
});
