import { usePathname, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useAuth } from '@/auth/AuthProvider';

// Browsing is open to everyone; actions (post, book, like, RSVP…) ask people to
// sign in first and then bring them back to the same page.
export function useRequireSignIn() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(
    (action: () => unknown) => {
      if (!user) {
        router.push({ pathname: '/welcome', params: { next: pathname } });
        return;
      }
      return action();
    },
    [user, router, pathname]
  );
}
