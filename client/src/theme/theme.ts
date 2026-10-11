/**
 * Design tokens for Keychain — premium minimalist dark interface.
 *
 * Near-black background, charcoal cards, hairline dark-gray borders,
 * near-white text with muted gray secondary, and a single pale mint accent.
 * Everything visual references these tokens so the theme stays consistent.
 *
 * NOTE: palette key names are kept stable (indigo and cyan prefixes) so
 * existing code keeps compiling; their values now carry the Keychain mint scale.
 */

export const palette = {
  // Near-black ink
  ink0: '#000000',
  ink1: '#050505',
  ink2: '#0b0b0d',
  ink3: '#1c1c1e',
  ink4: '#242426',
  ink5: '#2c2c2e',

  // Pale mint accent scale
  indigo400: '#c8fff7',
  indigo500: '#a6fff2',
  indigo600: '#6fe3d2',
  cyan300: '#a6fff2',
  cyan400: '#7de8d8',
  cyan500: '#4fd6c4',

  // Semantic
  success: '#30d158',
  warning: '#ffcc27',
  danger: '#ff453a',
  info: '#5ac8fa',

  // Neutrals
  white: '#FFFFFF',
  slate100: '#f5f5f7',
  slate300: '#a7a7b0',
  slate400: '#8e8e93',
  slate500: '#636366',
  slate600: '#48484a',
} as const;

export const colors = {
  background: palette.ink1,
  backgroundElevated: palette.ink2,
  surface: palette.ink3,
  surfaceHigh: palette.ink4,
  border: '#2c2c2e',
  borderStrong: '#3a3a3c',

  primary: palette.indigo500,
  primaryPressed: palette.indigo600,
  accent: '#a6fff2',
  onPrimary: '#050505',

  text: palette.slate100,
  textMuted: palette.slate300,
  textFaint: palette.slate400,
  textInverse: palette.ink1,

  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  info: palette.info,

  // Dark olive surface for security warnings.
  olive: '#2a2a12',

  overlay: 'rgba(0,0,0,0.7)',
  glass: 'rgba(28,28,30,0.92)',
} as const;

export const gradients = {
  brand: [palette.indigo500, palette.cyan400] as const,
  brandSoft: [palette.indigo600, palette.ink3] as const,
  aurora: [palette.indigo500, palette.cyan500, palette.indigo400] as const,
  danger: [palette.danger, '#B23A56'] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.2 },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '700' as const, letterSpacing: -0.1 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '500' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '700' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const, letterSpacing: 0.2 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '600' as const, letterSpacing: 0.6 },
  mono: { fontSize: 13, lineHeight: 20, fontWeight: '500' as const, fontFamily: 'monospace' as const },
  monoSmall: { fontSize: 12, lineHeight: 18, fontWeight: '500' as const, fontFamily: 'monospace' as const },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 3,
  },
  glow: {
    shadowColor: palette.indigo500,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

export const theme = {
  palette,
  colors,
  gradients,
  spacing,
  radius,
  typography,
  shadow,
} as const;

export type Theme = typeof theme;
