import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function ProfileScreen() {
  return (
    <Screen>
      <EmptyState
        icon="person-circle-outline"
        title="No listings posted"
        message="Items you put up for sale will show up here."
      />
    </Screen>
  );
}
