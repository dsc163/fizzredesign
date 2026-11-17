import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Listing, resolveUrl } from '@/api/client';
import { Party, Radius, Spacing, Typography } from '@/constants/theme';
import { dateTile, formatDay, formatTime } from '@/lib/format';
import { toggleRsvp } from '@/lib/rsvp';

export function eventLocation(listing: Listing) {
  const d = listing.details;
  if (d.address) return d.address;
  if (d.visibility === 'reveal' && d.reveal_at) {
    return `${d.area} · revealed ${formatDay(d.reveal_at).toLowerCase()} at ${formatTime(d.reveal_at)}`;
  }
  return `${d.area} · exact spot for RSVPs`;
}

// Event card for the Events tab: calendar tile, glow, and one-tap RSVP.
export function PartyEventCard({ listing, onChange }: { listing: Listing; onChange?: (l: Listing) => void }) {
  const d = listing.details;
  const tile = dateTile(d.starts_at ?? Date.now());
  const going = Boolean(d.my_going);
  const [busy, setBusy] = useState(false);
  const photo = resolveUrl(listing.photos[0]);
  const live = d.starts_at && d.ends_at && Date.now() >= d.starts_at && Date.now() < d.ends_at;

  async function rsvp() {
    setBusy(true);
    try {
      const result = await toggleRsvp(listing);
      if (result) onChange?.(result.listing);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Link href={`/listing/${listing.id}`} asChild>
        <Pressable style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
          {photo && (
            <View>
              <Image source={{ uri: photo }} style={styles.photo} />
              <LinearGradient colors={['transparent', Party.card]} style={styles.photoFade} />
            </View>
          )}
          <View style={styles.row}>
            <LinearGradient colors={Party.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
              <Text style={styles.tileWeekday}>{tile.weekday}</Text>
              <Text style={styles.tileDay}>{tile.day}</Text>
              <Text style={styles.tileMonth}>{tile.month}</Text>
            </LinearGradient>
            <View style={styles.body}>
              {live ? (
                <View style={styles.liveRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.live}>HAPPENING NOW</Text>
                </View>
              ) : (
                <Text style={styles.when}>
                  {formatDay(d.starts_at ?? 0).toUpperCase()} · {formatTime(d.starts_at ?? 0)}
                </Text>
              )}
              <Text style={styles.title} numberOfLines={2}>
                {listing.title}
              </Text>
              <View style={styles.inline}>
                <Ionicons name={d.address ? 'location' : 'lock-closed'} size={13} color={d.address ? Party.cyan : Party.yellow} />
                <Text style={styles.meta} numberOfLines={1}>
                  {eventLocation(listing)}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Link>
      <View style={styles.footer}>
        <Text style={styles.host} numberOfLines={1}>
          {d.host_name ?? 'Anonymous'}
          {d.host_verified ? ' ✓' : ''} · <Text style={styles.going}>{d.rsvps ?? 0} going</Text>
          {listing.stats.likes > 0 ? ` · ♥ ${listing.stats.likes}` : ''}
        </Text>
        {listing.isMine ? (
          <Text style={styles.hosting}>You're hosting</Text>
        ) : going ? (
          <Pressable onPress={rsvp} disabled={busy} accessibilityRole="button" accessibilityLabel="Cancel RSVP" style={styles.goingPill}>
            <Ionicons name="checkmark" size={14} color={Party.green} />
            <Text style={styles.goingText}>Going</Text>
          </Pressable>
        ) : (
          <Pressable onPress={rsvp} disabled={busy} accessibilityRole="button" accessibilityLabel="RSVP">
            <LinearGradient colors={Party.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.rsvp}>
              <Text style={styles.rsvpText}>RSVP</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Party.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Party.cardBorder,
    overflow: 'hidden',
  },
  link: { width: '100%' },
  pressed: { opacity: 0.75 },
  photo: { width: '100%', height: 150 },
  photoFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 60 },
  row: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.md, alignItems: 'center' },
  tile: { width: 58, height: 66, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  tileWeekday: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  tileDay: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', lineHeight: 28 },
  tileMonth: { color: '#FFE4F1', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  body: { flex: 1, gap: 3, minWidth: 0 },
  when: { color: Party.pink, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Party.green },
  live: { color: Party.green, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  title: { ...Typography.heading, fontSize: 18, fontWeight: '800', color: Party.text },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { ...Typography.caption, color: Party.textSecondary, flex: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  host: { ...Typography.caption, color: Party.muted, flex: 1 },
  going: { color: Party.cyan, fontWeight: '700' },
  hosting: { ...Typography.caption, color: Party.yellow, fontWeight: '700' },
  rsvp: { paddingHorizontal: Spacing.xl, paddingVertical: 8, borderRadius: Radius.pill },
  rsvpText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  goingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Party.green,
  },
  goingText: { color: Party.green, fontWeight: '800', fontSize: 13 },
});
