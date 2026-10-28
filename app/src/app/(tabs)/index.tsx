import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function BrowseScreen() {
  return (
    <Screen>
      <EmptyState
        icon="storefront-outline"
        title="No listings yet"
        message="Items for sale on your campus will show up here."
      />
    </Screen>
  );
}
