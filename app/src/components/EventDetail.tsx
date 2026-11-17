import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { api, Listing, ListingResponse, resolveUrl } from '@/api/client';
import { Party, Radius, Spacing, Typography } from '@/constants/theme';
import { dateTile, formatDay, formatTime } from '@/lib/format';
import { useRequireSignIn } from '@/lib/requireSignIn';
import { toggleRsvp } from '@/lib/rsvp';
import { takeDown } from '@/lib/takeDown';

import { Comments, SocialBar } from './social';
import { Avatar } from './ui';

function calendarLink(listing: Listing) {
  const d = listing.details;
  const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = d.starts_at ?? Date.now();
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: listing.title,
    dates: `${stamp(start)}/${stamp(d.ends_at ?? start + 7200000)}`,
    details: `${listing.description}\n\nFrom Fizz Marketplace`,
    location: d.address ?? d.area ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function EventDetail({ data, onChange }: { data: ListingResponse; onChange: (r: ListingResponse) => void }) {
  const router = useRouter();
  const requireSignIn = useRequireSignIn();
  const { listing, updates, comments, attendees } = data;
  const d = listing.details;
  const tile = dateTile(d.starts_at ?? Date.now());
  const going = Boolean(d.my_going);
  const photo = resolveUrl(listing.photos[0]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const live = d.starts_at && d.ends_at && Date.now() >= d.starts_at && Date.now() < d.ends_at;

  async function run(fn: () => Promise<ListingResponse | null>) {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      if (result) onChange(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  let locationText: string;
  if (d.address) locationText = d.address;
  else if (d.visibility === 'reveal' && d.reveal_at)
    locationText = going
      ? `Revealed to you ${formatDay(d.reveal_at).toLowerCase()} at ${formatTime(d.reveal_at)}`
      : `Revealed to RSVPs ${formatDay(d.reveal_at).toLowerCase()} at ${formatTime(d.reveal_at)}`;
  else locationText = 'Exact spot shared with RSVPs';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.heroImage} />
        ) : (
          <LinearGradient colors={Party.glow} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroImage}>
            <Ionicons name="sparkles" size={64} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
        )}
        <LinearGradient colors={['transparent', Party.bg]} style={styles.heroFade} />
      </View>

      <View style={styles.titleRow}>
        <LinearGradient colors={Party.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
          <Text style={styles.tileWeekday}>{tile.weekday}</Text>
          <Text style={styles.tileDay}>{tile.day}</Text>
          <Text style={styles.tileMonth}>{tile.month}</Text>
        </LinearGradient>
        <View style={styles.flex}>
          {live && (
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.live}>HAPPENING NOW</Text>
            </View>
          )}
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.host}>
            by <Text style={styles.hostName}>{d.host_name ?? 'Anonymous'}</Text>
            {d.host_verified ? <Text style={styles.verified}> ✓ verified</Text> : null}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Row icon="time" color={Party.pink}>
          {formatDay(d.starts_at ?? 0)} · {formatTime(d.starts_at ?? 0)}
          {d.ends_at ? ` to ${formatTime(d.ends_at)}` : ''}
        </Row>
        <View style={[styles.location, d.address ? styles.locationOpen : styles.locationLocked]}>
          <Ionicons name={d.address ? 'location' : 'lock-closed'} size={18} color={d.address ? Party.cyan : Party.yellow} />
          <View style={styles.flex}>
            <Text style={[styles.locationMain, { color: d.address ? Party.cyan : Party.yellow }]}>{locationText}</Text>
            {d.area && d.address !== d.area && <Text style={styles.locationSub}>{d.area}</Text>}
            {!d.address && !going && !listing.isMine && <Text style={styles.locationSub}>RSVP to get the exact location.</Text>}
          </View>
        </View>
        {d.entry && (
          <Row icon="ticket" color={Party.yellow}>
            {d.entry}
          </Row>
        )}
        <View style={styles.tags}>
          {(d.tags ?? []).map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
          <View style={[styles.tag, styles.goingTag]}>
            <Text style={[styles.tagText, { color: Party.cyan }]}>{d.rsvps ?? 0} going</Text>
          </View>
          {d.named_rsvps && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>Named RSVPs</Text>
            </View>
          )}
        </View>
      </View>

      {listing.description ? <Text style={styles.description}>{listing.description}</Text> : null}

      {!listing.isMine && (
        <View style={styles.actions}>
          <Pressable
            style={styles.flex2}
            onPress={() => requireSignIn(() => run(() => toggleRsvp(listing)))}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={going ? 'Cancel RSVP' : 'RSVP'}>
            {going ? (
              <View style={styles.goingButton}>
                <Ionicons name="checkmark-circle" size={20} color={Party.green} />
                <Text style={styles.goingButtonText}>You're going</Text>
              </View>
            ) : (
              <LinearGradient colors={Party.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.rsvpButton}>
                <Text style={styles.rsvpText}>RSVP</Text>
              </LinearGradient>
            )}
          </Pressable>
          <Pressable
            style={[styles.flex, styles.calButton]}
            onPress={() => Linking.openURL(calendarLink(listing))}
            accessibilityRole="button"
            accessibilityLabel="Add to calendar">
            <Ionicons name="calendar" size={18} color={Party.text} />
            <Text style={styles.calText}>Cal</Text>
          </Pressable>
        </View>
      )}
      {going && !listing.isMine && (
        <Text style={styles.finePrint}>
          We'll remind you the day before and 1 hour before. Change reminders in Profile → Edit profile.
        </Text>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.section}>
        <SocialBar listing={listing} onChange={onChange} variant="party" />
      </View>

      {listing.isMine && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>You're hosting</Text>
          <Text style={styles.body}>
            {d.rsvps ?? 0} going.{' '}
            {d.named_rsvps ? 'Named RSVPs are on, so you can see who.' : 'RSVPs are anonymous for this event.'}
          </Text>
          {attendees && attendees.length > 0 && (
            <View style={styles.guests}>
              {attendees.map((a, i) => (
                <View key={i} style={styles.guest}>
                  <Avatar name={a.name} photo={a.photo} size={28} />
                  <Text style={styles.guestName}>{a.name}</Text>
                </View>
              ))}
            </View>
          )}
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Post a live update, e.g. Doors open!"
            placeholderTextColor={Party.muted}
            style={styles.input}
            maxLength={500}
          />
          <Pressable
            disabled={!draft.trim() || busy}
            onPress={() => run(() => api.postUpdate(listing.id, draft.trim())).then(() => setDraft(''))}
            accessibilityRole="button">
            <LinearGradient
              colors={draft.trim() ? Party.gradient : [Party.cardBorder, Party.cardBorder]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.postButton}>
              <Text style={styles.rsvpText}>Post update</Text>
            </LinearGradient>
          </Pressable>
          <Text style={styles.finePrint}>Everyone who RSVP'd or saved this event gets notified.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              if (await takeDown(listing.id, listing.title).catch(() => false)) router.replace('/events');
            }}
            style={styles.takeDown}>
            <Ionicons name="trash-outline" size={16} color={Party.pink} />
            <Text style={styles.takeDownText}>Take down event</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live updates</Text>
        {updates.length === 0 ? (
          <Text style={styles.body}>No updates from the host yet.</Text>
        ) : (
          updates.map((u) => (
            <View key={u.id} style={styles.update}>
              <Text style={styles.updateMeta}>
                HOST · {formatDay(u.createdAt).toUpperCase()} {formatTime(u.createdAt)}
              </Text>
              <Text style={styles.updateBody}>{u.body}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Comments listing={listing} comments={comments} onChange={onChange} variant="party" title="The thread" />
      </View>

      {!listing.isMine && (
        <Pressable onPress={() => router.push({ pathname: '/report', params: { listingId: listing.id } })}>
          <Text style={styles.report}>Report this event</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function Row({ icon, color, children }: { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.rowText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Party.bg },
  content: { paddingBottom: Spacing.xxl * 2, gap: Spacing.lg },
  flex: { flex: 1 },
  flex2: { flex: 2 },
  hero: { height: 200 },
  heroImage: { width: '100%', height: 200, alignItems: 'center', justifyContent: 'center' },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 },
  titleRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, marginTop: -40, alignItems: 'flex-end' },
  tile: { width: 66, height: 76, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  tileWeekday: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  tileDay: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', lineHeight: 32 },
  tileMonth: { color: '#FFE4F1', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Party.green },
  live: { color: Party.green, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  title: { fontSize: 26, fontWeight: '900', color: Party.text, lineHeight: 30 },
  host: { ...Typography.caption, color: Party.muted, marginTop: 2 },
  hostName: { color: Party.textSecondary, fontWeight: '700' },
  verified: { color: Party.green, fontWeight: '700' },
  card: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Party.card,
    borderWidth: 1,
    borderColor: Party.cardBorder,
    gap: Spacing.md,
  },
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  rowText: { ...Typography.body, color: Party.text, fontWeight: '600', flex: 1 },
  location: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  locationOpen: { borderColor: 'rgba(34,211,238,0.4)', backgroundColor: 'rgba(34,211,238,0.08)' },
  locationLocked: { borderColor: 'rgba(250,204,21,0.4)', backgroundColor: 'rgba(250,204,21,0.08)' },
  locationMain: { ...Typography.body, fontWeight: '700' },
  locationSub: { ...Typography.caption, color: Party.textSecondary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: Party.cardBorder },
  goingTag: { backgroundColor: 'rgba(34,211,238,0.15)' },
  tagText: { ...Typography.caption, color: Party.textSecondary, fontWeight: '600' },
  description: { ...Typography.body, color: Party.textSecondary, lineHeight: 22, paddingHorizontal: Spacing.lg },
  actions: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  rsvpButton: { height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  rsvpText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  goingButton: {
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Party.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  goingButtonText: { color: Party.green, fontSize: 16, fontWeight: '800' },
  calButton: {
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Party.card,
    borderWidth: 1,
    borderColor: Party.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  calText: { color: Party.text, fontWeight: '700' },
  finePrint: { ...Typography.caption, color: Party.muted, paddingHorizontal: Spacing.lg },
  error: { ...Typography.caption, color: Party.pink, paddingHorizontal: Spacing.lg },
  section: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { ...Typography.heading, color: Party.text, fontWeight: '800' },
  body: { ...Typography.body, color: Party.textSecondary },
  guests: { gap: Spacing.sm },
  guest: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  guestName: { ...Typography.body, color: Party.text },
  input: {
    ...Typography.body,
    color: Party.text,
    borderWidth: 1,
    borderColor: Party.cardBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Party.bg,
  },
  postButton: { height: 46, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  update: { borderLeftWidth: 3, borderLeftColor: Party.pink, paddingLeft: Spacing.md, gap: 2 },
  updateMeta: { fontSize: 11, fontWeight: '800', color: Party.pink, letterSpacing: 0.5 },
  updateBody: { ...Typography.body, color: Party.text },
  takeDown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm },
  takeDownText: { ...Typography.caption, fontWeight: '800', color: Party.pink },
  report: { ...Typography.caption, color: Party.muted, textAlign: 'center', textDecorationLine: 'underline' },
});
