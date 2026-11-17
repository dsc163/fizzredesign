import { Alert, Platform } from 'react-native';

export type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  destructive: boolean;
  resolve: (ok: boolean) => void;
};

let handler: ((request: ConfirmRequest) => void) | null = null;

// ConfirmProvider registers itself here so questions render inside the app.
export function setConfirmHandler(next: ((request: ConfirmRequest) => void) | null) {
  handler = next;
}

// A yes/no question. Shown as an in-app dialog when ConfirmProvider is mounted,
// with the native alert (phones) or browser dialog (web) as a fallback.
export function confirm(
  title: string,
  message: string,
  confirmLabel = 'OK',
  options: { destructive?: boolean } = {}
): Promise<boolean> {
  if (handler) {
    const show = handler;
    return new Promise((resolve) => show({ title, message, confirmLabel, destructive: Boolean(options.destructive), resolve }));
  }
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : true);
  }
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: options.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ])
  );
}
