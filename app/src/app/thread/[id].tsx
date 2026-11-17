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
import { TimePicker } from '@/components/TimePicker';
import { Avatar, Button, Card, Chip, ErrorText, Label, Loading, PostThumb, VerifiedBadge } from '@/components/ui';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { formatDateTime, formatPrice, formatTime } from '@/lib/format';
import { useBadges } from '@/lib/badges';
import { paymentEntries } from '@/lib/payments';
import { usePolling } from '@/lib/usePolling';

const MEETUP_SPOTS = ['Fondren Library entrance', 'RMC', 'College commons'];
const TEMPLATES = ['Is this still available?', 'Are you free this week?', 'On my way!', 'Running 5 minutes late'];

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

  // When the exchange moves to a new step, bring the status card into view.
  const status = thread?.status;
  useEffect(() => {
    if (status) scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [status]);

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
                {thread.role === 'buyer' ? 'You are the buyer' : 'You are the seller'}
                {thread.optionLabel && thread.optionLabel !== thread.listing.title ? ` · ${thread.optionLabel}` : ''}
                {thread.price !== null ? ` · ${formatPrice(thread.price)}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </Pressable>

          <StatusPanel thread={thread} busy={busy} act={act} />
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

function StatusPanel({ thread, busy, act }: { thread: Thread; busy: boolean; act: ActFn }) {
  const router = useRouter();
  const [suggesting, setSuggesting] = useState(false);
  const [suggestTime, setSuggestTime] = useState<number | null>(null);
  const isBuyer = thread.role === 'buyer';
  const otherFirst = thread.counterpart.name.split(' ')[0];
  const theirTurn = thread.proposedBy === thread.role;
  const verb = thread.listing.type === 'service' ? 'booking' : 'request';

  switch (thread.status) {
    case 'open':
      return isBuyer ? (
        <Card>
          <Text style={styles.cardTitle}>Ready when you are</Text>
          <Text style={styles.body}>Pick a time on the listing to send a {verb}.</Text>
          <Button title="Pick a time" icon="calendar-outline" onPress={() => router.push(`/listing/${thread.listing.id}`)} />
        </Card>
      ) : (
        <Card>
          <Text style={styles.cardTitle}>A buyer is asking about your listing</Text>
          <Text style={styles.body}>Reply below. You'll see their request here when they pick a time.</Text>
        </Card>
      );

    case 'declined':
      return (
        <Card>
          <Text style={styles.cardTitle}>Request declined</Text>
          {isBuyer ? (
            <>
              <Text style={styles.body}>Try another time that might work better.</Text>
              <Button title="Pick another time" onPress={() => router.push(`/listing/${thread.listing.id}`)} />
            </>
          ) : (
            <Text style={styles.body}>The buyer can send a new request with a different time.</Text>
          )}
        </Card>
      );

    case 'requested':
      return (
        <Card style={styles.highlight}>
          <Label>{theirTurn ? 'WAITING FOR A RESPONSE' : isBuyer ? 'NEW TIME SUGGESTED' : 'NEW REQUEST'}</Label>
          <Text style={styles.cardTitle}>
            {thread.optionLabel ?? thread.listing.title}
            {thread.price !== null ? ` · ${formatPrice(thread.price)}` : ''}
          </Text>
          {thread.proposedTime ? (
            <View style={styles.inline}>
              <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.body}>{formatDateTime(thread.proposedTime)}</Text>
            </View>
          ) : (
            <Text style={styles.body}>No time picked yet. Agree on one in the chat below.</Text>
          )}
          {theirTurn ? (
            <Text style={styles.body}>
              {isBuyer ? "Sent. You'll get a notification when they respond." : 'Waiting for the buyer to confirm the new time.'}
            </Text>
          ) : suggesting ? (
            <>
              <TimePicker dayLabel="SUGGEST A DAY" onChange={setSuggestTime} />
              <Button
                title="Send new time"
                disabled={!suggestTime}
                loading={busy}
                onPress={() => act(() => api.respond(thread.id, 'suggest', suggestTime!)).then(() => setSuggesting(false))}
              />
              <Button variant="ghost" title="Cancel" onPress={() => setSuggesting(false)} />
            </>
          ) : (
            <>
              <Button title="Accept" icon="checkmark" loading={busy} onPress={() => act(() => api.respond(thread.id, 'accept'))} />
              <View style={styles.inline}>
                <Button style={styles.flex} variant="secondary" title="Suggest a time" onPress={() => setSuggesting(true)} />
                <Button style={styles.flex} variant="danger" title="Decline" onPress={() => act(() => api.respond(thread.id, 'decline'))} />
              </View>
            </>
          )}
          {theirTurn && (
            <Text style={styles.finePrint}>Names are shared with both of you once the {verb} is accepted.</Text>
          )}
        </Card>
      );

    case 'accepted':
    case 'completed':
      return <AcceptedPanel thread={thread} busy={busy} act={act} />;
  }
}

function AcceptedPanel({ thread, busy, act }: { thread: Thread; busy: boolean; act: ActFn }) {
  const [customSpot, setCustomSpot] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const other = thread.counterpart;
  const isBuyer = thread.role === 'buyer';
  const done = thread.status === 'completed';

  return (
    <View style={styles.panels}>
      {done && (
        <Card style={styles.success}>
          <Ionicons name="checkmark-circle" size={36} color={Colors.success} />
          <Text style={styles.successTitle}>Exchange complete</Text>
          <Text style={styles.body}>
            {isBuyer ? `You ${thread.listing.type === 'service' ? 'booked' : 'bought'}` : 'You sold'} {thread.optionLabel ?? thread.listing.title}
            {thread.price !== null ? ` for ${formatPrice(thread.price)}` : ''}. Thanks for trading on Fizz!
          </Text>
        </Card>
      )}

      <Card>
        <Label>YOU'RE MEETING</Label>
        <View style={styles.person}>
          <Avatar name={other.name} photo={other.photo} size={48} />
          <View style={styles.flex}>
            <View style={styles.inline}>
              <Text style={styles.cardTitle}>{other.name}</Text>
              <VerifiedBadge />
            </View>
            <Text style={styles.meta}>
              {isBuyer ? 'Seller' : 'Buyer'}
              {other.college ? ` · ${other.college}` : ''}
            </Text>
          </View>
        </View>
        <Text style={styles.finePrint}>
          {other.name.split(' ')[0]} can also see your name and photo. Names are shared only after a request is accepted.
        </Text>
      </Card>

      <Card>
        <Label>WHEN AND WHERE</Label>
        {thread.proposedTime ? (
          <View style={styles.inline}>
            <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.body}>{formatDateTime(thread.proposedTime)}</Text>
          </View>
        ) : (
          <Text style={styles.body}>Time: agree on one in the chat.</Text>
        )}
        {thread.meetupSpot && (
          <View style={styles.inline}>
            <Ionicons name="location-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.body}>{thread.meetupSpot}</Text>
          </View>
        )}
        {!done && (
          <>
            <Text style={styles.meta}>{thread.meetupSpot ? 'Change the meetup spot:' : 'Pick a public spot to meet:'}</Text>
            <View style={styles.wrap}>
              {MEETUP_SPOTS.map((spot) => (
                <Chip
                  key={spot}
                  label={spot}
                  selected={thread.meetupSpot === spot}
                  onPress={() => act(() => api.setMeetup(thread.id, spot))}
                />
              ))}
              <Chip label="Other" selected={showCustom} onPress={() => setShowCustom(!showCustom)} />
            </View>
            {showCustom && (
              <View style={styles.inline}>
                <TextInput
                  value={customSpot}
                  onChangeText={setCustomSpot}
                  placeholder="e.g. Baker commons"
                  placeholderTextColor={Colors.textMuted}
                  style={[styles.input, styles.flex]}
                />
                <Button
                  title="Set"
                  disabled={!customSpot.trim()}
                  onPress={() => act(() => api.setMeetup(thread.id, customSpot.trim())).then(() => setShowCustom(false))}
                />
              </View>
            )}
          </>
        )}
      </Card>

      <Card>
        <Label>{isBuyer ? 'PAY IN PERSON' : "BUYER'S PAYMENT APPS"}</Label>
        {paymentEntries(other.payments).length > 0 ? (
          paymentEntries(other.payments).map((p) => (
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
          ))
        ) : (
          <Text style={styles.body}>
            {isBuyer
              ? "The seller hasn't added a payment app. Pay with cash or ask in the chat."
              : 'Collect payment in person.'}
          </Text>
        )}
      </Card>

      <Card>
        <Label>CLOSE IT OUT</Label>
        <Step done={thread.buyerPaid} text={thread.buyerPaid ? 'Buyer marked paid' : 'Buyer marks paid'} />
        <Step done={thread.sellerComplete} text={thread.sellerComplete ? 'Seller marked complete' : 'Seller marks complete'} />
        {!done && isBuyer && !thread.buyerPaid && (
          <Button title="I paid" icon="cash-outline" loading={busy} onPress={() => act(() => api.markPaid(thread.id))} />
        )}
        {!done && !isBuyer && !thread.sellerComplete && (
          <Button title="Mark complete" icon="checkmark-done" loading={busy} onPress={() => act(() => api.markComplete(thread.id))} />
        )}
        {!done && ((isBuyer && thread.buyerPaid) || (!isBuyer && thread.sellerComplete)) && (
          <Text style={styles.finePrint}>Waiting for {other.name.split(' ')[0]} to confirm.</Text>
        )}
      </Card>
    </View>
  );
}

function Step({ done, text }: { done: boolean; text: string }) {
  return (
    <View style={styles.inline}>
      <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={done ? Colors.success : Colors.textMuted} />
      <Text style={[styles.body, done && { color: Colors.text }]}>{text}</Text>
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
