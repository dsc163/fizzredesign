import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

// Run `load` when the screen gains focus and again every `intervalMs` while
// it stays focused. Messages use this to pick up the other person's replies.
export function usePolling(load: () => Promise<unknown> | void, intervalMs: number) {
  const loadRef = useRef(load);
  loadRef.current = load;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const tick = () => {
        if (active) Promise.resolve(loadRef.current()).catch(() => undefined);
      };
      tick();
      const timer = setInterval(tick, intervalMs);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, [intervalMs])
  );
}
