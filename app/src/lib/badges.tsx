import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';

type Badges = { notifications: number; messages: number; refresh: () => void };

const BadgeContext = createContext<Badges>({ notifications: 0, messages: 0, refresh: () => undefined });

// Unread counts for the Messages tab and the notification bell, refreshed every 10 seconds.
export function BadgeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ notifications: 0, messages: 0 });

  const refresh = useCallback(() => {
    if (!user) return;
    api.badges().then(setCounts).catch(() => undefined);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCounts({ notifications: 0, messages: 0 });
      return;
    }
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => clearInterval(timer);
  }, [user, refresh]);

  const value = useMemo(() => ({ ...counts, refresh }), [counts, refresh]);
  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>;
}

export function useBadges() {
  return useContext(BadgeContext);
}
