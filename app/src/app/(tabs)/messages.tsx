import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function MessagesScreen() {
  return (
    <Screen>
      <EmptyState
        icon="chatbubbles-outline"
        title="No messages"
        message="Conversations with buyers and sellers will show up here."
      />
    </Screen>
  );
}
