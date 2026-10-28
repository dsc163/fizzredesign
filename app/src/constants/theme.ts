// Central design tokens. Change colors, spacing, and type here so every
// screen picks them up.

export const Colors = {
  background: '#FFFFFF',
  surface: '#F4F4F5',
  border: '#E4E4E7',
  text: '#18181B',
  textSecondary: '#71717A',
  textMuted: '#A1A1AA',
  primary: '#1D4ED8',
  primarySoft: '#EFF4FF',
  // Backdrop behind the centered phone-width column on web.
  webBackdrop: '#F4F4F5',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const Typography = {
  title: { fontSize: 22, fontWeight: '700' },
  heading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
} as const;

// Mobile-first: on web the app renders in a column no wider than this.
export const MaxAppWidth = 480;
