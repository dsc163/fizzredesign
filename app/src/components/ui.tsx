// Small shared building blocks used across screens.

import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { PostType, resolveUrl } from '@/api/client';
import { Colors, Radius, Spacing, TypeColors, Typography } from '@/constants/theme';
import { initials } from '@/lib/format';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || loading;
  const palette = {
    primary: { bg: Colors.primary, fg: '#FFFFFF', border: Colors.primary },
    secondary: { bg: Colors.background, fg: Colors.text, border: Colors.border },
    ghost: { bg: 'transparent', fg: Colors.primary, border: 'transparent' },
    danger: { bg: Colors.background, fg: Colors.danger, border: Colors.border },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        variant === 'primary' && inactive && styles.buttonDisabled,
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.buttonInner}>
          {icon && <Ionicons name={icon} size={18} color={palette.fg} />}
          <Text style={[styles.buttonText, { color: palette.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}>
      {icon && <Ionicons name={icon} size={14} color={selected ? '#FFFFFF' : Colors.text} />}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={Colors.textMuted}
        {...props}
        style={[styles.input, props.multiline && styles.multiline, props.style]}
      />
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Avatar({ name, photo, size = 44 }: { name: string; photo?: string | null; size?: number }) {
  const uri = resolveUrl(photo);
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials(name) || '?'}</Text>
    </View>
  );
}

export function VerifiedBadge({ label = 'Verified' }: { label?: string }) {
  return (
    <View style={styles.verified}>
      <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
      <Text style={styles.verifiedText}>{label}</Text>
    </View>
  );
}

const TYPE_NAMES: Record<PostType, string> = {
  item: 'Goods',
  service: 'Service',
  event: 'Event',
  wanted: 'Wanted',
  lost: 'Lost',
  found: 'Found',
};

export function TypeLabel({ type, extra }: { type: PostType; extra?: string | null }) {
  const color = TypeColors[type];
  return (
    <View style={[styles.typeLabel, { backgroundColor: color.bg }]}>
      <Text style={[styles.typeLabelText, { color: color.fg }]}>
        {TYPE_NAMES[type].toUpperCase()}
        {extra ? ` · ${extra.toUpperCase()}` : ''}
      </Text>
    </View>
  );
}

const TYPE_ICONS: Record<PostType, IconName> = {
  item: 'pricetag-outline',
  service: 'cut-outline',
  event: 'calendar-outline',
  wanted: 'hand-left-outline',
  lost: 'search-outline',
  found: 'flag-outline',
};

const CATEGORY_ICONS: Record<string, IconName> = {
  Textbooks: 'book-outline',
  Electronics: 'calculator-outline',
  Dorm: 'home-outline',
  Furniture: 'bed-outline',
  Clothing: 'shirt-outline',
  Bikes: 'bicycle-outline',
  Tickets: 'ticket-outline',
  Haircuts: 'cut-outline',
  Tutoring: 'school-outline',
  Photography: 'camera-outline',
  'DJ and Music': 'musical-notes-outline',
  Rentals: 'cube-outline',
  Rides: 'car-outline',
  Parties: 'sparkles-outline',
  Performances: 'mic-outline',
  Sports: 'football-outline',
};

// Photo for a post, or a colored tile with an icon when it has none.
export function PostThumb({
  type,
  category,
  photo,
  size,
  style,
}: {
  type: PostType;
  category?: string | null;
  photo?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const uri = resolveUrl(photo);
  const color = TypeColors[type];
  const box = size ? { width: size, height: size } : { width: '100%' as const, aspectRatio: 4 / 3 };
  if (uri) {
    return <Image source={{ uri }} style={[styles.thumb, box, style as object]} resizeMode="cover" />;
  }
  return (
    <View style={[styles.thumb, box, { backgroundColor: color.bg }, style]}>
      <Ionicons
        name={(category && CATEGORY_ICONS[category]) || TYPE_ICONS[type]}
        size={size ? size * 0.42 : 48}
        color={color.fg}
      />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={Colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  button: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: Colors.textMuted, borderColor: Colors.textMuted },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  buttonText: { ...Typography.heading, fontSize: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipSelected: { backgroundColor: Colors.text, borderColor: Colors.text },
  chipText: { ...Typography.caption, fontWeight: '600', color: Colors.text },
  chipTextSelected: { color: '#FFFFFF' },
  field: { gap: Spacing.sm },
  label: { ...Typography.caption, fontWeight: '600', color: Colors.text },
  input: {
    ...Typography.body,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  hint: { ...Typography.caption, color: Colors.textSecondary },
  avatar: { backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.primary, fontWeight: '700' },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.successSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  verifiedText: { fontSize: 12, fontWeight: '600', color: Colors.success },
  typeLabel: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
  typeLabelText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  thumb: { borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: Colors.background,
  },
  error: { ...Typography.caption, color: Colors.danger },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
});
