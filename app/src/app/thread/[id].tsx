import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api, Thread } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { SignInPrompt } from '@/components/SignInPrompt';
import { Avatar, Button, Card, Chip, ErrorText, Label, Loading, PostThumb, VerifiedBadge } from '@/components/ui';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { formatPrice, formatTime } from '@/lib/format';
import { useBadges } from '@/lib/badges';
import { paymentEntries } from '@/lib/payments';
import { usePolling } from '@/lib/usePolling';

const TEMPLATES = ['Is this still available?', 'When works for you?', 'Can we meet at the RMC?', 'On my way!'];

function ThreadScreenContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [thread, setThread] = useState<Thread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollViewInstance>(null);

  const { refresh } = useBadges();
  const load = useCallback(async () => {
    try {
      const result = await api.thread(id);
      setThread(result.thread);
      setError(null);
      if (result.thread.unread > 0) refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this conversation.');
    }
  }, [id, refresh]);

  usePolling(load, 3000);

  // Keep the newest message in view as the conversation grows.
  const count = thread?.messages?.length ?? 0;
  useEffect(() => {
    if (count) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [count]);

  // Run an action that returns the updated conversation.
  async function act(fn: () => Promise<{ thread: Thread }>) {
    setActionError(null);
    setBusy(true);
    try {
      setThread((await fn()).thread);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function send(text: string) {
    const body = text.trim();
    if (!body) return;
    setDraft('');
    await act(() => api.sendMessage(id, body));
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  if (error && !thread) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Conversation unavailable" message={error} />
      </Screen>
    );
  }
  if (!thread) return <Loading />;

  const messages = thread.messages ?? [];

  const other = thread.counterpart;

  return (
    <Screen>
      <Stack.Screen options={{ title: other.revealed ? other.name : thread.listing.title }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.listing} onPress={() => router.push(`/listing/${thread.listing.id}`)}>
            <PostThumb type={thread.listing.type} category={thread.listing.category} photo={thread.listing.photos[0]} size={44} />
            <View style={styles.flex}>
              <Text style={styles.listingTitle} numberOfLines={1}>
                {thread.listing.title}
              </Text>
              <Text style={styles.meta}>
                {thread.role === 'buyer' ? 'You asked about this post' : 'Someone is asking about your post'}
                {thread.listing.price !== null ? ` · ${formatPrice(thread.listing.price)}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </Pressable>

          <ContactPanel thread={thread} busy={busy} act={act} />
          <ErrorText message={actionError} />

          <View style={styles.messages}>
            {messages.map((m) =>
              m.system ? (
                <Text key={m.id} style={styles.system}>
                  {m.body}
                </Text>
              ) : (
                <View key={m.id} style={[styles.bubbleRow, m.mine && styles.bubbleRowMine]}>
                  <View style={[styles.bubble, m.mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, m.mine && styles.bubbleTextMine]}>{m.body}</Text>
                    <Text style={[styles.bubbleTime, m.mine && styles.bubbleTimeMine]}>{formatTime(m.createdAt)}</Text>
                  </View>
                </View>
              )
            )}
          </View>

          <Pressable onPress={() => router.push({ pathname: '/report', params: { threadId: thread.id } })}>
            <Text style={styles.reportLink}>Report or block</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.composer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templates}>
            {TEMPLATES.map((t) => (
              <Chip key={t} label={t} onPress={() => send(t)} />
            ))}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Message"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              onSubmitEditing={() => send(draft)}
              returnKeyType="send"
              submitBehavior="submit"
            />
            <Pressable
              onPress={() => send(draft)}
              disabled={!draft.trim()}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              style={[styles.send, !draft.trim() && styles.sendDisabled]}>
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

type ActFn = (fn: () => Promise<{ thread: Thread }>) => Promise<void>;

// Everything is arranged in the chat. Either person can choose to share their
// name and payment apps; until then both stay anonymous (service providers are public).
function ContactPanel({ thread, busy, act }: { thread: Thread; busy: boolean; act: ActFn }) {
  const other = thread.counterpart;
  const pay = paymentEntries(other.payments);
  return (
    <View style={styles.panels}>
      {(other.revealed || other.college || other.photo) && (
        <Card>
          <Label>{thread.role === 'buyer' ? 'POSTED BY' : 'ASKING'}</Label>
          <View style={styles.person}>
            <Avatar name={other.name} photo={other.photo} size={44} />
            <View style={styles.flex}>
              <View style={styles.inline}>
                <Text style={styles.cardTitle}>{other.name}</Text>
                <VerifiedBadge />
              </View>
              {other.college && <Text style={styles.meta}>{other.college}</Text>}
            </View>
          </View>
          {pay.length > 0 && (
            <View style={styles.pay}>
              <Label>PAY WITH</Label>
              {pay.map((p) => (
                <Pressable
                  key={p.key}
                  style={styles.payRow}
                  disabled={!p.url}
                  onPress={() => p.url && Linking.openURL(p.url)}
                  accessibilityRole={p.url ? 'link' : 'text'}>
                  <Text style={styles.body}>{p.label}</Text>
                  <View style={styles.inline}>
                    <Text style={styles.cardTitle}>{p.handle}</Text>
                    {p.url && <Ionicons name="open-outline" size={16} color={Colors.primary} />}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </Card>
      )}
      {thread.iShared ? (
        <Text style={styles.finePrint}>You shared your name and payment info in this chat.</Text>
      ) : (
        <Card style={styles.shareCard}>
          <Text style={styles.body}>
            Ready to meet up? Share your name and payment apps with {other.revealed ? other.name.split(' ')[0] : 'them'}.
            You stay anonymous until you do.
          </Text>
          <Button
            variant="secondary"
            icon="person-add-outline"
            title="Share my name & payment info"
            loading={busy}
            onPress={() => act(() => api.shareContact(thread.id))}
          />
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  listing: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },
  listingTitle: { ...Typography.heading, fontSize: 15, color: Colors.text },
  meta: { ...Typography.caption, color: Colors.textSecondary },
  cardTitle: { ...Typography.heading, color: Colors.text },
  body: { ...Typography.body, color: Colors.textSecondary, flexShrink: 1 },
  finePrint: { ...Typography.caption, color: Colors.textSecondary },
  highlight: { borderColor: Colors.primary, borderWidth: 1.5 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  panels: { gap: Spacing.md },
  pay: { gap: Spacing.sm, marginTop: Spacing.xs },
  shareCard: { backgroundColor: Colors.surface, borderColor: Colors.surface },
  person: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  success: { alignItems: 'center', backgroundColor: Colors.successSoft, borderColor: Colors.successSoft },
  successTitle: { ...Typography.title, color: Colors.success },
  messages: { gap: Spacing.sm },
  system: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.xs },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 2 },
  bubbleMine: { backgroundColor: Colors.primary },
  bubbleTheirs: { backgroundColor: Colors.surface },
  bubbleText: { ...Typography.body, color: Colors.text },
  bubbleTextMine: { color: '#FFFFFF' },
  bubbleTime: { fontSize: 11, color: Colors.textMuted, alignSelf: 'flex-end' },
  bubbleTimeMine: { color: '#DBE4FF' },
  reportLink: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', textDecorationLine: 'underline' },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
  },
  templates: { gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  inputRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, alignItems: 'center' },
  input: {
    ...Typography.body,
    flex: 1,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { backgroundColor: Colors.textMuted },
});

export default function ThreadScreen() {
  const { user } = useAuth();
  if (!user) return <SignInPrompt icon="chatbubbles-outline" title="Conversation" message="Sign in to see this conversation." />;
  return <ThreadScreenContent />;
}
