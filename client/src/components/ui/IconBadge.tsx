import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { theme } from '@/theme/theme';

type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';

/**
 * 1Password-style category tile: a soft tinted rounded square with a colored
 * glyph, rather than a full gradient badge.
 */
const tones: Record<Tone, { bg: string; icon: string }> = {
  brand: { bg: 'rgba(166,255,242,0.12)', icon: theme.colors.accent },
  info: { bg: 'rgba(90,200,250,0.12)', icon: theme.colors.info },
  success: { bg: 'rgba(48,209,88,0.12)', icon: theme.colors.success },
  warning: { bg: 'rgba(255,204,39,0.12)', icon: theme.colors.warning },
  danger: { bg: 'rgba(255,69,58,0.12)', icon: theme.colors.danger },
  neutral: { bg: 'rgba(255,255,255,0.06)', icon: theme.colors.textMuted },
};

export function IconBadge({
  name,
  tone = 'brand',
  size = 44,
  style,
}: {
  name: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  size?: number;
  style?: ViewStyle;
}) {
  const t = tones[tone];
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: t.bg,
          borderColor: t.bg,
        },
        style,
      ]}
    >
      <Ionicons name={name} size={size * 0.5} color={t.icon} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});