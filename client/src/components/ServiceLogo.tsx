import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { theme } from '@/theme/theme';

/** Restrained tint set for service tiles and separators. */
export const SERVICE_TINTS = [
  '#a6fff2',
  '#5ac8fa',
  '#30d158',
  '#ffcc27',
  '#ff453a',
  '#c7c7cc',
] as const;

/** Recognisable tints for well-known demo services. */
const BRAND_TINTS: Record<string, string> = {
  figma: '#30d158',
  netflix: '#ff453a',
  telegram: '#5ac8fa',
  github: '#c7c7cc',
  google: '#5ac8fa',
  apple: '#c7c7cc',
};

export function tintForKey(key: string): string {
  const lower = key.trim().toLowerCase();
  if (BRAND_TINTS[lower]) return BRAND_TINTS[lower];
  let hash = 0;
  for (let i = 0; i < lower.length; i += 1) {
    hash = (hash * 31 + lower.charCodeAt(i)) >>> 0;
  }
  return SERVICE_TINTS[hash % SERVICE_TINTS.length];
}

export type ServiceLogoProps = {
  title: string;
  size?: number;
  tint?: string;
  style?: ViewStyle;
};

/**
 * Service logo tile: first letter on a soft tint. Calm and consistent for
 * every service, with recognisable tints for well-known brands.
 */
export function ServiceLogo({ title, size = 44, tint, style }: ServiceLogoProps) {
  const color = tint ?? tintForKey(title);
  const letter = (title.trim()[0] ?? '?').toUpperCase();
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: `${color}26`,
          borderColor: `${color}45`,
        },
        style,
      ]}
      accessibilityLabel={`${title} logo`}
    >
      <Text style={[styles.letter, { color, fontSize: size * 0.44 }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  letter: { ...theme.typography.bodyStrong, fontWeight: '800' },
});
