import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { api, Thread } from '@/api/client';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { Avatar, ErrorText, Loading, PostThumb } from '@/components/ui';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { formatAgo } from '@/lib/format';
import { usePolling } from '@/lib/usePolling';

const STATUS: Record<Thread['status'], { label: string; fg: string; bg: string }> = {
  open: { label: 'Chatting', fg: Colors.textSecondary, bg: Colors.surface },
  requested: { label: 'Request pending', fg: Colors.warning, bg: Colors.warningSoft },
  accepted: { label: 'Accepted', fg: Colors.primary, bg: Colors.primarySoft },
  declined: { label: 'Declined', fg: Colors.danger, bg: Colors.dangerSoft },
  completed: { label: 'Complete', fg: Colors.success, bg: Colors.successSoft },
};

export default function MessagesScreen() {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setThreads((await api.threads()).threads);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load messages.');
    }
  }, []);

  usePolling(load, 5000);

  if (threads === null && !error) return <Loading />;

  return (
    <Screen>
      <FlatList
        data={threads ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<ErrorText message={error} />}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="No conversations yet"
            message="When you book a service, request an item, or someone asks about your listing, it shows up here."
          />
        }
        renderItem={({ item }) => <ThreadRow thread={item} />}
      />
    </Screen>
  );
}

function ThreadRow({ thread }: { thread: Thread }) {
  const status = STATUS[thread.status];
  const other = thread.counterpart;
  const preview = thread.lastMessage
    ? `${thread.lastMessage.mine ? 'You: ' : ''}${thread.lastMessage.body}`
    : 'No messages yet';
  return (
    <Link href={`/thread/${thread.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
        <View style={styles.thumb}>
          <PostThumb type={thread.listing.type} category={thread.listing.category} photo={thread.listing.photos[0]} size={52} />
          {other.revealed && (
            <View style={styles.avatarBadge}>
              <Avatar name={other.name} photo={other.photo} size={24} />
            </View>
          )}
        </View>
        <View style={styles.body}>
          <View style={styles.topLine}>
            <Text style={[styles.title, thread.unread > 0 && styles.unreadText]} numberOfLines={1}>
              {thread.listing.title}
            </Text>
            {thread.lastMessage && <Text style={styles.time}>{formatAgo(thread.lastMessage.createdAt)}</Text>}
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {thread.role === 'buyer' ? 'Seller' : 'Buyer'}: {other.name}
          </Text>
          <Text style={[styles.preview, thread.unread > 0 && styles.unreadText]} numberOfLines={1}>
            {preview}
          </Text>
          <View style={styles.bottomLine}>
            <View style={[styles.status, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
            </View>
            {thread.unread > 0 && (
              <View style={styles.unread}>
                <Text style={styles.unreadCount}>{thread.unread}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.lg, gap: Spacing.md, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumb: { width: 52, height: 52 },
  avatarBadge: { position: 'absolute', right: -6, bottom: -6, borderWidth: 2, borderColor: Colors.background, borderRadius: 14 },
  body: { flex: 1, gap: 2, minWidth: 0 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  title: { ...Typography.heading, fontSize: 15, color: Colors.text, flex: 1 },
  time: { ...Typography.caption, color: Colors.textMuted },
  meta: { ...Typography.caption, color: Colors.textSecondary },
  preview: { ...Typography.caption, color: Colors.textSecondary },
  unreadText: { color: Colors.text, fontWeight: '700' },
  bottomLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  status: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill },
  statusText: { fontSize: 12, fontWeight: '600' },
  unread: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
