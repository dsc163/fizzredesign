import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api, Listing, ThreadStatus } from '@/api/client';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { TimePicker } from '@/components/TimePicker';
import { Avatar, Button, Card, Chip, ErrorText, Label, Loading, PostThumb, TypeLabel, VerifiedBadge } from '@/components/ui';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { formatDateTime, formatDay, formatPrice, formatTime } from '@/lib/format';

const QUICK_MESSAGES = ['Is this still available?', 'Are you free this week?'];

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [myThread, setMyThread] = useState<{ id: string; status: ThreadStatus } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await api.listing(id);
      setListing(result.listing);
      setMyThread(result.myThread);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this listing.');
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (error && !listing) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Listing unavailable" message={error} />
      </Screen>
    );
  }
  if (!listing) return <Loading />;

  const backTitle = { service: 'Service', item: 'Goods', event: 'Event', wanted: 'Wanted', lost: 'Lost & Found', found: 'Lost & Found' }[listing.type];

  return (
    <Screen>
      <Stack.Screen options={{ title: backTitle }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Photos listing={listing} />
        <View style={styles.titleBlock}>
          <TypeLabel type={listing.type} extra={listing.type === 'event' ? null : listing.category} />
          <Text style={styles.title}>{listing.title}</Text>
          {listing.type === 'item' && <Text style={styles.price}>{formatPrice(listing.price)}</Text>}
          {listing.status !== 'active' && (
            <Text style={styles.statusNote}>This listing is {listing.status === 'sold' ? 'sold' : 'paused'}.</Text>
          )}
        </View>

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

        {listing.type === 'event' && <EventInfo listing={listing} />}
        {listing.type === 'wanted' && listing.details.needed_by && (
          <Detail icon="time-outline" text={`Needed by ${formatDateTime(listing.details.needed_by)}`} />
        )}
        {listing.type === 'wanted' && listing.price ? (
          <Detail icon="cash-outline" text={`Offering ${formatPrice(listing.price)}`} />
        ) : null}
        {listing.type === 'lost' && (
          <>
            {listing.details.last_seen && <Detail icon="location-outline" text={`Last seen ${listing.details.last_seen}`} />}
            {listing.price ? <Detail icon="gift-outline" text={`${formatPrice(listing.price)} finder's tip`} /> : null}
          </>
        )}
        {listing.type === 'found' && listing.details.found_at && (
          <Detail icon="location-outline" text={`Found at ${listing.details.found_at}`} />
        )}

        {listing.isMine ? (
          <OwnerPanel listing={listing} onChange={setListing} />
        ) : listing.type === 'item' || listing.type === 'service' ? (
          listing.status === 'active' ? (
            myThread && myThread.status !== 'declined' ? (
              <Card>
                <Text style={styles.cardTitle}>
                  {myThread.status === 'open' ? 'You have a conversation about this' : 'You have a request in progress'}
                </Text>
                <Button title="Open conversation" icon="chatbubbles-outline" onPress={() => router.push(`/thread/${myThread.id}`)} />
              </Card>
            ) : (
              <RequestPanel listing={listing} existingThreadId={myThread?.id ?? null} />
            )
          ) : null
        ) : (
          <Text style={styles.notice}>
            {listing.type === 'event'
              ? 'RSVPs are coming soon in this test version.'
              : 'Responding to Wanted and Lost & Found posts is coming soon in this test version.'}
          </Text>
        )}

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
      <Text style={styles.authorMeta}>Posted by a verified Rice student. Names are shared once a request is accepted.</Text>
    </View>
  );
}

function EventInfo({ listing }: { listing: Listing }) {
  const d = listing.details;
  return (
    <Card>
      {d.starts_at && (
        <Text style={styles.cardTitle}>
          {formatDay(d.starts_at)} · {formatTime(d.starts_at)}
          {d.ends_at ? ` to ${formatTime(d.ends_at)}` : ''}
        </Text>
      )}
      <View style={styles.locationBox}>
        <Ionicons name="location-outline" size={16} color={Colors.warning} />
        <Text style={styles.locationText}>
          {d.area}
          {d.location_note ? `. ${d.location_note}.` : ''}
        </Text>
      </View>
      {d.entry && <Text style={styles.detailText}>Entry: {d.entry}</Text>}
      <View style={styles.tags}>
        {(d.tags ?? []).map((t) => (
          <View key={t} style={styles.tag}>
            <Text style={styles.tagText}>{t}</Text>
          </View>
        ))}
        <View style={styles.tag}>
          <Text style={styles.tagText}>{d.rsvps ?? 0} going</Text>
        </View>
      </View>
    </Card>
  );
}

function RequestPanel({ listing, existingThreadId }: { listing: Listing; existingThreadId: string | null }) {
  const router = useRouter();
  const isService = listing.type === 'service';
  const [option, setOption] = useState(listing.priceOptions[0]?.label ?? null);
  const [chosenTime, setChosenTime] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = isService ? listing.priceOptions.find((o) => o.label === option)?.price ?? listing.price : listing.price;

  async function threadId() {
    return existingThreadId ?? (await api.startThread(listing.id)).thread.id;
  }

  async function sendQuick(text: string) {
    setError(null);
    setBusy(true);
    try {
      const id = await threadId();
      await api.sendMessage(id, text);
      router.push(`/thread/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send.');
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!chosenTime) return;
    setError(null);
    setBusy(true);
    try {
      const id = await threadId();
      await api.requestThread(id, { proposedTime: chosenTime, optionLabel: option });
      router.push(`/thread/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send your request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={styles.requestCard}>
      <Text style={styles.cardTitle}>{isService ? 'Book a time' : 'Request to buy'}</Text>

      {isService && listing.priceOptions.length > 1 && (
        <View style={styles.section}>
          <Label>CHOOSE A SERVICE</Label>
          <View style={styles.wrap}>
            {listing.priceOptions.map((o) => (
              <Chip
                key={o.label}
                label={`${o.label} · ${formatPrice(o.price)}`}
                selected={option === o.label}
                onPress={() => setOption(o.label)}
              />
            ))}
          </View>
        </View>
      )}

      <TimePicker dayLabel={isService ? 'PICK A DAY' : 'WHEN CAN YOU MEET?'} onChange={setChosenTime} />

      <View style={styles.section}>
        <Label>QUICK MESSAGE</Label>
        <View style={styles.wrap}>
          {QUICK_MESSAGES.map((m) => (
            <Chip key={m} label={m} icon="chatbubble-outline" onPress={() => sendQuick(m)} />
          ))}
        </View>
      </View>

      <ErrorText message={error} />
      <Button
        title={`${isService ? 'Book' : 'Send request'} · ${formatPrice(price)}`}
        onPress={submit}
        loading={busy}
        disabled={!chosenTime}
      />
      <Text style={styles.finePrint}>
        {chosenTime ? `${formatDateTime(chosenTime)}. ` : 'Pick a time to continue. '}
        Names are shared with both of you once {isService ? listing.author.name.split(' ')[0] : 'the seller'} accepts. You
        pay in person.
      </Text>
    </Card>
  );
}

function OwnerPanel({ listing, onChange }: { listing: Listing; onChange: (l: Listing) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function set(status: Listing['status']) {
    setBusy(true);
    setError(null);
    try {
      onChange((await api.setListingStatus(listing.id, status)).listing);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Text style={styles.cardTitle}>This is your listing</Text>
      <Text style={styles.detailText}>
        Requests from buyers show up in Messages. Mark it sold or paused to hide it from Browse.
      </Text>
      <View style={styles.wrap}>
        {(['active', 'paused', 'sold'] as const).map((s) => (
          <Chip
            key={s}
            label={s === 'active' ? 'Active' : s === 'paused' ? 'Paused' : 'Sold'}
            selected={listing.status === s}
            onPress={() => !busy && set(s)}
          />
        ))}
      </View>
      <ErrorText message={error} />
      <Button variant="secondary" title="Go to Messages" icon="chatbubbles-outline" onPress={() => router.push('/messages')} />
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
  finePrint: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  locationBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.warningSoft,
  },
  locationText: { ...Typography.caption, color: Colors.warning, flex: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm, backgroundColor: Colors.surface },
  tagText: { ...Typography.caption, color: Colors.text },
  notice: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', padding: Spacing.md },
  reportLink: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', textDecorationLine: 'underline' },
});
