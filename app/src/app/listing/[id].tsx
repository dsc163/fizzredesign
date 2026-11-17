import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { api, Listing, ListingResponse } from '@/api/client';
import { EmptyState } from '@/components/EmptyState';
import { EventDetail } from '@/components/EventDetail';
import { Screen } from '@/components/Screen';
import { Comments, SocialBar } from '@/components/social';
import { Avatar, Button, Card, Chip, ErrorText, Label, Loading, PostThumb, TypeLabel, VerifiedBadge } from '@/components/ui';
import { Colors, Party, Radius, Spacing, Typography } from '@/constants/theme';
import { formatDateTime, formatPrice } from '@/lib/format';
import { useRequireSignIn } from '@/lib/requireSignIn';
import { takeDown } from '@/lib/takeDown';

const QUICK_MESSAGES = ['Is this still available?', 'Are you free this week?'];

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ListingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.listing(id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this post.');
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (error && !data) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Post unavailable" message={error} />
      </Screen>
    );
  }
  if (!data) return <Loading />;

  const { listing, myThread, comments } = data;
  const setListing = (l: Listing) => setData((d) => (d ? { ...d, listing: l } : d));

  if (listing.type === 'event') {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Event',
            headerStyle: { backgroundColor: Party.bg },
            headerTintColor: Party.text,
            headerTitleStyle: { color: Party.text, fontWeight: '800' },
            contentStyle: { backgroundColor: Party.bg },
          }}
        />
        <EventDetail data={data} onChange={setData} />
      </>
    );
  }

  const backTitle = { service: 'Service', item: 'Goods', event: 'Event', wanted: 'Wanted', lost: 'Lost & Found', found: 'Lost & Found' }[listing.type];

  return (
    <Screen>
      <Stack.Screen options={{ title: backTitle }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Photos listing={listing} />
        <View style={styles.titleBlock}>
          <TypeLabel type={listing.type} extra={listing.category} />
          <Text style={styles.title}>{listing.title}</Text>
          {listing.type === 'item' && <Text style={styles.price}>{formatPrice(listing.price)}</Text>}
          {listing.status !== 'active' && (
            <Text style={styles.statusNote}>This listing is {listing.status === 'sold' ? 'sold' : 'paused'}.</Text>
          )}
        </View>

        <SocialBar listing={listing} onChange={setData} />

        <AuthorBlock listing={listing} />

        {listing.type === 'item' && listing.condition && (
          <Detail icon="sparkles-outline" text={`Condition: ${listing.condition}`} />
        )}
        {listing.description ? <Text style={styles.description}>{listing.description}</Text> : null}

        {listing.type === 'service' && listing.priceOptions.length > 0 && (
          <Card>
            <Label>PRICES</Label>
            {listing.priceOptions.map((o) => (
              <View key={o.label} style={styles.priceRow}>
                <Text style={styles.priceLabel}>{o.label}</Text>
                <Text style={styles.priceValue}>{formatPrice(o.price)}</Text>
              </View>
            ))}
          </Card>
        )}

        {listing.isMine ? (
          <OwnerPanel listing={listing} onChange={setListing} />
        ) : listing.status === 'active' ? (
          <MessagePanel listing={listing} existingThreadId={myThread?.id ?? null} />
        ) : null}

        <Comments listing={listing} comments={comments} onChange={setData} />

        {!listing.isMine && (
          <Pressable onPress={() => router.push({ pathname: '/report', params: { listingId: listing.id } })}>
            <Text style={styles.reportLink}>Report this post</Text>
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}

function Photos({ listing }: { listing: Listing }) {
  if (listing.photos.length <= 1) {
    return <PostThumb type={listing.type} category={listing.category} photo={listing.photos[0]} />;
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
      {listing.photos.map((p) => (
        <PostThumb key={p} type={listing.type} photo={p} size={220} />
      ))}
    </ScrollView>
  );
}

function Detail({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={18} color={Colors.textSecondary} />
      <Text style={styles.detailText}>{text}</Text>
    </View>
  );
}

function AuthorBlock({ listing }: { listing: Listing }) {
  const a = listing.author;
  if (a.kind === 'profile') {
    return (
      <View style={styles.author}>
        <Avatar name={a.name} photo={a.photo} size={48} />
        <View style={styles.authorText}>
          <View style={styles.authorNameRow}>
            <Text style={styles.authorName}>{a.name}</Text>
            <VerifiedBadge />
          </View>
          {a.college && <Text style={styles.authorMeta}>{a.college} College</Text>}
          {a.bio && <Text style={styles.authorBio}>{a.bio}</Text>}
        </View>
      </View>
    );
  }
  if (a.kind === 'host') {
    return (
      <View style={styles.authorNameRow}>
        <Text style={styles.authorMeta}>Hosted by</Text>
        <Text style={styles.authorName}>{a.name}</Text>
        {a.verified && <VerifiedBadge label="Verified organization" />}
      </View>
    );
  }
  return (
    <View style={styles.authorNameRow}>
      <Ionicons name="shield-checkmark-outline" size={18} color={Colors.success} />
      <Text style={styles.authorMeta}>Posted by a verified Rice student. Names are only shared if someone chooses to share them in a chat.</Text>
    </View>
  );
}

// Message the person who posted. Price, time, and meetup are all worked out in the chat.
function MessagePanel({ listing, existingThreadId }: { listing: Listing; existingThreadId: string | null }) {
  const router = useRouter();
  const requireSignIn = useRequireSignIn();
  const who = listing.type === 'service' ? listing.author.name.split(' ')[0] : 'the seller';
  const [text, setText] = useState(listing.type === 'service' ? "Hi! I'm interested. When are you free?" : 'Hi! Is this still available?');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!text.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const id = existingThreadId ?? (await api.startThread(listing.id)).thread.id;
      await api.sendMessage(id, text.trim());
      router.push(`/thread/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send your message.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={styles.requestCard}>
      <Text style={styles.cardTitle}>Message {who}</Text>
      {existingThreadId && (
        <Button variant="ghost" title="Open your conversation" icon="chatbubbles-outline" onPress={() => router.push(`/thread/${existingThreadId}`)} />
      )}
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Write a message…"
        placeholderTextColor={Colors.textMuted}
        multiline
        maxLength={1000}
        style={styles.messageInput}
      />
      <ErrorText message={error} />
      <Button title="Send message" icon="send" onPress={() => requireSignIn(send)} loading={busy} disabled={!text.trim()} />
      <Text style={styles.finePrint}>Work out price, time, and where to meet in your messages. You pay in person.</Text>
    </Card>
  );
}

function OwnerPanel({ listing, onChange }: { listing: Listing; onChange: (l: Listing) => void }) {
  const router = useRouter();
  const [pending, setPending] = useState<'sold' | 'down' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(which: 'sold' | 'down', fn: () => Promise<void>) {
    setPending(which);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update.');
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <Text style={styles.cardTitle}>This is your post</Text>
      <Text style={styles.detailText}>Messages about it show up in Messages.</Text>
      {listing.type === 'item' && (
        <Button
          variant="secondary"
          icon={listing.status === 'sold' ? 'refresh' : 'checkmark-done'}
          title={listing.status === 'sold' ? 'Mark as available again' : 'Mark as sold'}
          loading={pending === 'sold'}
          onPress={() =>
            run('sold', async () => onChange((await api.setListingStatus(listing.id, listing.status === 'sold' ? 'active' : 'sold')).listing))
          }
        />
      )}
      <Button
        variant="danger"
        icon="trash-outline"
        title="Take down post"
        disabled={pending === 'down'}
        onPress={() =>
          run('down', async () => {
            if (await takeDown(listing.id, listing.title)) router.replace('/profile');
          })
        }
      />
      <ErrorText message={error} />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  photoRow: { gap: Spacing.sm },
  titleBlock: { gap: Spacing.xs },
  title: { ...Typography.title, color: Colors.text },
  price: { ...Typography.title, color: Colors.text },
  statusNote: { ...Typography.body, color: Colors.warning, fontWeight: '600' },
  description: { ...Typography.body, color: Colors.text, lineHeight: 22 },
  author: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  authorText: { flex: 1, gap: 2 },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  authorName: { ...Typography.heading, color: Colors.text },
  authorMeta: { ...Typography.caption, color: Colors.textSecondary, flexShrink: 1 },
  authorBio: { ...Typography.caption, color: Colors.text, marginTop: 2 },
  detail: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  detailText: { ...Typography.body, color: Colors.textSecondary, flexShrink: 1 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel: { ...Typography.body, color: Colors.text },
  priceValue: { ...Typography.body, fontWeight: '600', color: Colors.text },
  cardTitle: { ...Typography.heading, color: Colors.text },
  requestCard: { borderColor: Colors.primary, borderWidth: 1.5, gap: Spacing.lg },
  section: { gap: Spacing.sm },
  row: { gap: Spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  messageInput: {
    ...Typography.body,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  finePrint: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  locationBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.warningSoft,
  },
  locationText: { ...Typography.caption, color: Colors.warning, fontWeight: '600' },
  locationOpen: { backgroundColor: Colors.successSoft },
  locationTextOpen: { color: Colors.success },
  locationSub: { ...Typography.caption, color: Colors.textSecondary },
  flex: { flex: 1 },
  flex2: { flex: 2 },
  bold: { fontWeight: '700', color: Colors.text },
  eventActions: { flexDirection: 'row', gap: Spacing.sm },
  update: { borderLeftWidth: 3, borderLeftColor: Colors.primary, paddingLeft: Spacing.md, gap: 2 },
  updateMeta: { ...Typography.caption, fontWeight: '600', color: Colors.text },
  updateBody: { ...Typography.body, color: Colors.text },
  updateInput: { gap: Spacing.sm },
  input: {
    ...Typography.body,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm, backgroundColor: Colors.surface },
  tagText: { ...Typography.caption, color: Colors.text },
  notice: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', padding: Spacing.md },
  reportLink: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', textDecorationLine: 'underline' },
});
