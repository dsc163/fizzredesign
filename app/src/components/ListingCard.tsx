import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { Category, Listing } from '@/database';

// Shown in place of a photo until listings have images.
const categoryIcons: Record<Category, ComponentProps<typeof Ionicons>['name']> = {
  Textbooks: 'book-outline',
  Furniture: 'bed-outline',
  Electronics: 'headset-outline',
  Clothing: 'shirt-outline',
  Bikes: 'bicycle-outline',
  Tickets: 'ticket-outline',
  Dorm: 'home-outline',
};

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    // Equal-width grid cell; the link inside sizes to it.
    <View style={styles.cell}>
      <Link href={`/listing/${listing.id}`} asChild>
        <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
          <View style={styles.image}>
            <Ionicons name={categoryIcons[listing.category]} size={36} color={Colors.textMuted} />
          </View>
          <Text style={styles.price}>${listing.price}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {listing.title}
          </Text>
          <Text style={styles.meta}>{listing.condition}</Text>
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
    marginBottom: Spacing.xs,
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
