import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

import { Listing } from '@/api/client';

export function postUrl(id: string) {
  return `https://darioushclapp.com/fizzredesign/listing/${id}`;
}

// Share a direct link to a post. Returns 'copied' when the link was copied
// instead of opening a share sheet, so the caller can say so.
export async function sharePost(listing: Pick<Listing, 'id' | 'title'>): Promise<'shared' | 'copied' | 'cancelled'> {
  const url = postUrl(listing.id);
  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title: listing.title, text: `${listing.title} on Fizz Marketplace`, url });
        return 'shared';
      } catch {
        return 'cancelled';
      }
    }
    await Clipboard.setStringAsync(url);
    return 'copied';
  }
  const result = await Share.share({ message: `${listing.title} on Fizz Marketplace\n${url}`, url });
  return result.action === Share.dismissedAction ? 'cancelled' : 'shared';
}
