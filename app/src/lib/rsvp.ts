import { api, Listing, ListingResponse } from '@/api/client';

import { confirm } from './confirm';

// Toggle going, warning first when the host collects names (story 7.7).
export async function toggleRsvp(listing: Listing): Promise<ListingResponse | null> {
  const going = !listing.details.my_going;
  if (going && listing.details.named_rsvps) {
    const ok = await confirm(
      'Your name will be shared',
      `${listing.details.host_name ?? 'The host'} will see your name on their guest list.`,
      'RSVP'
    );
    if (!ok) return null;
  }
  return api.rsvp(listing.id, going);
}
