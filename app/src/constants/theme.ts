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
  success: '#15803D',
  successSoft: '#ECFDF3',
  warning: '#B45309',
  warningSoft: '#FFF7E6',
  danger: '#B91C1C',
  dangerSoft: '#FEF2F2',
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

// Label colors for each post type, matching the PRD mockups.
export const TypeColors: Record<string, { fg: string; bg: string }> = {
  item: { fg: '#1D4ED8', bg: '#EFF4FF' },
  service: { fg: '#15803D', bg: '#ECFDF3' },
  event: { fg: '#6D28D9', bg: '#F3EEFF' },
  wanted: { fg: '#B45309', bg: '#FFF7E6' },
  lost: { fg: '#B91C1C', bg: '#FEF2F2' },
  found: { fg: '#0F766E', bg: '#ECFDF9' },
};

// Night-out palette for the Events tab.
export const Party = {
  bg: '#0E0A1C',
  card: '#1A1433',
  cardBorder: '#2F2657',
  text: '#FFFFFF',
  textSecondary: '#C4BCE6',
  muted: '#8479AD',
  pink: '#FF3D9A',
  purple: '#8B5CF6',
  cyan: '#22D3EE',
  yellow: '#FACC15',
  green: '#34D399',
  gradient: ['#FF3D9A', '#8B5CF6'] as const,
  glow: ['#FF3D9A', '#8B5CF6', '#22D3EE'] as const,
} as const;
