import { FlatList, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ListingCard } from '@/components/ListingCard';
import { Screen } from '@/components/Screen';
import { Spacing } from '@/constants/theme';
import { useListings } from '@/database';

export default function BrowseScreen() {
  const listings = useListings();

  return (
    <Screen>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingCard listing={item} />}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          <EmptyState
            icon="storefront-outline"
            title="No listings yet"
            message="Items for sale on your campus will show up here."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  row: {
    gap: Spacing.md,
  },
});
