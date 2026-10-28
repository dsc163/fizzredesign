import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function PostScreen() {
  return (
    <Screen>
      <EmptyState
        icon="pricetag-outline"
        title="Post a listing"
        message="The form for selling an item will go here."
      />
    </Screen>
  );
}
