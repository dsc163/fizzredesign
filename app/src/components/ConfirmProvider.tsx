import { ReactNode, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { ConfirmRequest, setConfirmHandler } from '@/lib/confirm';

// Renders yes/no questions inside the app. Browser pop-ups (window.confirm) are
// silently blocked in many in-app browsers, which made buttons look broken.
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    setConfirmHandler(setRequest);
    return () => setConfirmHandler(null);
  }, []);

  const answer = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
  };

  return (
    <>
      {children}
      <Modal visible={request !== null} transparent animationType="fade" onRequestClose={() => answer(false)}>
        <Pressable style={styles.backdrop} onPress={() => answer(false)} accessibilityLabel="Cancel">
          <Pressable style={styles.dialog} onPress={() => undefined} accessibilityRole="alert">
            <Text style={styles.title}>{request?.title}</Text>
            <Text style={styles.message}>{request?.message}</Text>
            <View style={styles.buttons}>
              <Pressable
                onPress={() => answer(false)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => answer(true)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.button,
                  request?.destructive ? styles.danger : styles.primary,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.confirmText}>{request?.confirmLabel}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  title: { ...Typography.heading, color: Colors.text },
  message: { ...Typography.body, color: Colors.textSecondary },
  buttons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  button: { flex: 1, height: 46, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  cancel: { backgroundColor: Colors.surface },
  primary: { backgroundColor: Colors.primary },
  danger: { backgroundColor: Colors.danger },
  pressed: { opacity: 0.75 },
  cancelText: { ...Typography.body, fontWeight: '700', color: Colors.text },
  confirmText: { ...Typography.body, fontWeight: '700', color: '#FFFFFF' },
});
