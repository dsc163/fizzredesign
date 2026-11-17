import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Listing } from '@/api/client';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { formatDay, formatPrice, formatTime, shortName } from '@/lib/format';

import { PostThumb, TypeLabel } from './ui';

// The extra word in the type label, e.g. "SERVICE · HAIRCUTS" or "EVENT · TONIGHT".
function labelExtra(listing: Listing) {
  const d = listing.details;
  switch (listing.type) {
    case 'event':
      return d.starts_at ? formatDay(d.starts_at) : null;
    case 'wanted':
      return d.needed_by ? `by ${formatTime(d.needed_by)}` : null;
    case 'lost':
      return listing.price ? `${formatPrice(listing.price)} tip` : null;
    default:
      return listing.category;
  }
}

function subtitle(listing: Listing) {
  const d = listing.details;
  switch (listing.type) {
    case 'service':
      return `${shortName(listing.author.name)}${
        listing.author.kind === 'profile' && listing.author.college ? ` · ${listing.author.college}` : ''
      } · from ${formatPrice(listing.price)}`;
    case 'item':
      return `Verified Rice student${listing.condition ? ` · ${listing.condition}` : ''}`;
    case 'event':
      return `${d.starts_at ? formatTime(d.starts_at) : ''}${d.area ? ` · ${d.area}` : ''}`;
    case 'wanted':
      return `${listing.price ? `Offering ${formatPrice(listing.price)} · ` : ''}Verified Rice student`;
    case 'lost':
      return d.last_seen ? `Last seen ${d.last_seen}` : 'Verified Rice student';
    case 'found':
      return d.found_at ? `Found at ${d.found_at}` : 'Verified Rice student';
  }
}

function footer(listing: Listing) {
  if (listing.type !== 'event') return null;
  const d = listing.details;
  return `${d.host_name ?? 'Anonymous'}${d.host_verified ? ' ✓' : ''} · ${d.rsvps ?? 0} going`;
}

export function PostCard({ listing }: { listing: Listing }) {
  const showPrice = listing.type === 'item';
  const extra = footer(listing);
  return (
    <Link href={`/listing/${listing.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <View style={styles.card}>
        <PostThumb type={listing.type} category={listing.category} photo={listing.photos[0]} size={64} />
        <View style={styles.body}>
          <TypeLabel type={listing.type} extra={labelExtra(listing)} />
          <Text style={styles.title} numberOfLines={2}>
            {listing.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle(listing)}
          </Text>
          {extra && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {extra}
            </Text>
          )}
          {(listing.stats.likes > 0 || listing.stats.comments > 0 || listing.stats.saved) && (
            <Text style={styles.stats}>
              {listing.stats.likes > 0 ? `♥ ${listing.stats.likes}   ` : ''}
              {listing.stats.comments > 0 ? `💬 ${listing.stats.comments}   ` : ''}
              {listing.stats.saved ? 'Saved' : ''}
            </Text>
          )}
        </View>
        {showPrice && <Text style={styles.price}>{formatPrice(listing.price)}</Text>}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  // Links render as anchors on web, so the row layout lives on an inner View.
  link: { width: '100%' },
  card: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  pressed: { opacity: 0.7 },
  body: { flex: 1, gap: 3, minWidth: 0 },
  title: { ...Typography.heading, fontSize: 16, color: Colors.text },
  subtitle: { ...Typography.caption, color: Colors.textSecondary },
  price: { ...Typography.heading, color: Colors.text, alignSelf: 'center' },
  stats: { ...Typography.caption, color: Colors.textMuted },
});
