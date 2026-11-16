import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api, loadToken, setToken, setUnauthorizedHandler, User } from '@/api/client';

type AuthState = {
  user: User | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { name: string; email: string; password: string; college?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
    });
    (async () => {
      if (await loadToken()) {
        try {
          setUser((await api.me()).user);
        } catch {
          await setToken(null);
        }
      }
      setReady(true);
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await api.login({ email, password });
    await setToken(result.token);
    setUser(result.user);
  }, []);

  const signUp = useCallback(async (input: { name: string; email: string; password: string; college?: string }) => {
    const result = await api.signup(input);
    await setToken(result.token);
    setUser(result.user);
  }, []);

  const signOut = useCallback(async () => {
    await api.logout().catch(() => undefined);
    await setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, signIn, signUp, signOut, setUser }),
    [user, ready, signIn, signUp, signOut]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
