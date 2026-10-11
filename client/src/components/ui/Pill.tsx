import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme/theme';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const toneStyles: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: 'rgba(255,255,255,0.06)', fg: theme.colors.textMuted },
  brand: { bg: 'rgba(166,255,242,0.14)', fg: theme.colors.accent },
  info: { bg: 'rgba(90,200,250,0.12)', fg: theme.colors.info },
  success: { bg: 'rgba(61,220,151,0.14)', fg: theme.colors.success },
  warning: { bg: 'rgba(255,200,87,0.14)', fg: theme.colors.warning },
  danger: { bg: 'rgba(255,92,122,0.14)', fg: theme.colors.danger },
};

export function Pill({
  label,
  tone = 'neutral',
  onPress,
}: {
  label: string;
  tone?: Tone;
  onPress?: () => void;
}) {
  const t = toneStyles[tone];
  const body = (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => (pressed ? styles.pressed : undefined)}
      >
        {body}
      </Pressable>
    );
  }
  return body;
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    ...theme.typography.caption,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pressed: { opacity: 0.7 },
});