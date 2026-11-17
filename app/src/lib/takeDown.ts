import { api } from '@/api/client';

import { confirm } from './confirm';

// Ask once, then take the post down. Resolves true if it was removed.
export async function takeDown(id: string, title: string) {
  const ok = await confirm('Take down this post?', `"${title}" will disappear from Fizz for everyone.`, 'Take down');
  if (!ok) return false;
  await api.removeListing(id);
  return true;
}
