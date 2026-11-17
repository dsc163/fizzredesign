import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api, Listing } from '@/api/client';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { formatDay, formatTime } from '@/lib/format';

import { PostThumb, TypeLabel } from './ui';

export function locationLine(listing: Listing) {
  const d = listing.details;
  if (d.address) return d.address;
  if (d.visibility === 'reveal' && d.reveal_at) {
    return `${d.area} · Location revealed to RSVPs ${formatDay(d.reveal_at).toLowerCase()} at ${formatTime(d.reveal_at)}`;
  }
  return `${d.area} · Exact location shared with RSVPs`;
}

// Event card with one-tap RSVP, as in the PRD's Browse mockup.
export function EventCard({ listing, onChange }: { listing: Listing; onChange?: (l: Listing) => void }) {
  const d = listing.details;
  const [busy, setBusy] = useState(false);
  const going = Boolean(d.my_going);

  async function toggle() {
    setBusy(true);
    try {
      const result = await api.rsvp(listing.id, { going: !going });
      onChange?.(result.listing);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Link href={`/listing/${listing.id}`} asChild>
        <Pressable style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
          <View style={styles.row}>
            <PostThumb type="event" category={listing.category} photo={listing.photos[0]} size={56} />
            <View style={styles.body}>
              <TypeLabel type="event" extra={d.starts_at ? formatDay(d.starts_at) : null} />
              <Text style={styles.title} numberOfLines={2}>
                {listing.title}
              </Text>
              <Text style={styles.meta} numberOfLines={2}>
                {d.starts_at ? `${formatTime(d.starts_at)} · ` : ''}
                {locationLine(listing)}
              </Text>
            </View>
          </View>
        </Pressable>
      </Link>
      <View style={styles.footer}>
        <Text style={styles.host} numberOfLines={1}>
          {d.host_name ?? 'Anonymous'}
          {d.host_verified ? ' ✓' : ''} · {d.rsvps ?? 0} going
        </Text>
        {!listing.isMine && (
          <Pressable
            onPress={toggle}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={going ? 'Cancel RSVP' : 'RSVP'}
            style={({ pressed }) => [styles.rsvp, going && styles.rsvpGoing, pressed && styles.pressed]}>
            <Text style={[styles.rsvpText, going && styles.rsvpTextGoing]}>{going ? 'Going ✓' : 'RSVP'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
  },
  link: { width: '100%' },
  pressed: { opacity: 0.7 },
  row: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  body: { flex: 1, gap: 3, minWidth: 0 },
  title: { ...Typography.heading, fontSize: 16, color: Colors.text },
  meta: { ...Typography.caption, color: Colors.textSecondary },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  host: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
  rsvp: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
  },
  rsvpGoing: { backgroundColor: Colors.successSoft },
  rsvpText: { ...Typography.caption, fontWeight: '700', color: Colors.primary },
  rsvpTextGoing: { color: Colors.success },
});
