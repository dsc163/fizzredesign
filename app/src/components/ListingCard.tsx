import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { ComponentProps } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Category, Listing } from '@/database';

// Shown in place of a photo for listings without images.
const categoryIcons: Record<Category, ComponentProps<typeof Ionicons>['name']> = {
  Textbooks: 'book-outline',
  Furniture: 'bed-outline',
  Electronics: 'headset-outline',
  Clothing: 'shirt-outline',
  Bikes: 'bicycle-outline',
  Tickets: 'ticket-outline',
  Dorm: 'home-outline',
};

function formatPrice(price: number) {
  return Number.isInteger(price) ? `$${price}` : `$${price.toFixed(2)}`;
}

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    // Equal-width grid cell; the link inside sizes to it.
    <View style={styles.cell}>
      <Link href={`/listing/${listing.id}`} asChild>
        <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
          <View style={styles.image}>
            {listing.images[0] ? (
              <Image source={{ uri: listing.images[0] }} style={styles.photo} />
            ) : (
              <Ionicons
                name={listing.category ? categoryIcons[listing.category] : 'pricetag-outline'}
                size={36}
                color={Colors.textMuted}
              />
            )}
          </View>
          <Text style={styles.price}>{formatPrice(listing.price)}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {listing.title}
          </Text>
          {listing.condition && <Text style={styles.meta}>{listing.condition}</Text>}
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  card: {
    gap: Spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  image: {
    aspectRatio: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  price: {
    ...Typography.heading,
    color: Colors.text,
  },
  title: {
    ...Typography.body,
    color: Colors.text,
  },
  meta: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
