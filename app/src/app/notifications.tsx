import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { api, Notification } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { SignInPrompt } from '@/components/SignInPrompt';
import { IconName, Loading } from '@/components/ui';
import { Colors, Party, Radius, Spacing, Typography } from '@/constants/theme';
import { useBadges } from '@/lib/badges';
import { formatAgo } from '@/lib/format';
import { usePolling } from '@/lib/usePolling';

const ICONS: Record<string, { icon: IconName; color: string }> = {
  request: { icon: 'calendar', color: Colors.primary },
  accepted: { icon: 'checkmark-circle', color: Colors.success },
  declined: { icon: 'close-circle', color: Colors.danger },
  suggested: { icon: 'time', color: Colors.warning },
  meetup: { icon: 'location', color: Colors.primary },
  paid: { icon: 'cash', color: Colors.success },
  complete: { icon: 'checkmark-done', color: Colors.success },
  exchange: { icon: 'trophy', color: Colors.success },
  listing: { icon: 'pricetag', color: Colors.warning },
  message: { icon: 'chatbubble', color: Colors.primary },
  comment: { icon: 'chatbubbles', color: Colors.primary },
  like: { icon: 'heart', color: '#E11D48' },
  rsvp: { icon: 'people', color: Party.purple },
  update: { icon: 'megaphone', color: Party.pink },
  reveal: { icon: 'location', color: Party.purple },
  reminder: { icon: 'alarm', color: Party.pink },
};

function NotificationsScreenContent() {
  const router = useRouter();
  const { refresh } = useBadges();
  const [items, setItems] = useState<Notification[] | null>(null);

  // Load, then mark everything read so the bell clears; unread styling stays for this visit.
  const load = useCallback(async () => {
    const { notifications } = await api.notifications();
    setItems((current) =>
      current ? notifications.map((n) => ({ ...n, read: current.find((c) => c.id === n.id)?.read ?? n.read })) : notifications
    );
    if (notifications.some((n) => !n.read)) {
      await api.markNotificationsRead();
      refresh();
    }
  }, [refresh]);

  usePolling(load, 10000);

  if (!items) return <Loading />;

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="You're all caught up"
            message="Requests, replies, comments, and event updates will show up here."
          />
        }
        renderItem={({ item }) => {
          const style = ICONS[item.kind] ?? { icon: 'notifications' as IconName, color: Colors.textSecondary };
          return (
            <Pressable
              onPress={() => item.link && router.push(item.link as never)}
              style={({ pressed }) => [styles.row, !item.read && styles.unread, pressed && { opacity: 0.7 }]}>
              <View style={[styles.icon, { backgroundColor: `${style.color}1A` }]}>
                <Ionicons name={style.icon} size={18} color={style.color} />
              </View>
              <View style={styles.body}>
                <Text style={styles.title}>{item.title}</Text>
                {item.body ? (
                  <Text style={styles.text} numberOfLines={2}>
                    {item.body}
                  </Text>
                ) : null}
                <Text style={styles.time}>{formatAgo(item.createdAt)}</Text>
              </View>
              {!item.read && <View style={styles.dot} />}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.lg, gap: Spacing.sm, flexGrow: 1 },
  row: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, alignItems: 'flex-start' },
  unread: { backgroundColor: Colors.primarySoft },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  title: { ...Typography.body, fontWeight: '700', color: Colors.text },
  text: { ...Typography.caption, color: Colors.textSecondary },
  time: { ...Typography.caption, color: Colors.textMuted },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 },
});

export default function NotificationsScreen() {
  const { user } = useAuth();
  if (!user) return <SignInPrompt icon="notifications-outline" title="Notifications" message="Sign in to get notified about requests, replies, and events." />;
  return <NotificationsScreenContent />;
}
