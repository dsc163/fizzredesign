import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen>
      <EmptyState
        icon="pricetag-outline"
        title={`Listing ${id}`}
        message="Listing details will show up here."
      />
    </Screen>
  );
}
