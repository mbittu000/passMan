import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/theme/theme';

export type SettingsRowTone = 'mint' | 'blue' | 'gray' | 'yellow' | 'red' | 'green';

const TONE_COLORS: Record<SettingsRowTone, string> = {
  mint: theme.colors.accent,
  blue: theme.colors.info,
  gray: theme.colors.textMuted,
  yellow: theme.colors.warning,
  red: theme.colors.danger,
  green: theme.colors.success,
};

export type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconTone?: SettingsRowTone;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

/**
 * Grouped settings row: charcoal tile icon, title + subtitle, trailing
 * control or chevron. Whole row is pressable when `onPress` is set.
 */
export function SettingsRow({
  icon,
  iconTone = 'gray',
  title,
  subtitle,
  right,
  chevron,
  destructive = false,
  onPress,
  style,
}: SettingsRowProps) {
  const color = TONE_COLORS[iconTone];
  const body = (
    <View style={[styles.row, style]}>
      <View style={styles.tile}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, destructive ? styles.titleDestructive : null]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron && !right ? (
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textFaint} />
      ) : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    minHeight: 56,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceHigh,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  title: { ...theme.typography.bodyStrong, color: theme.colors.text },
  titleDestructive: { color: theme.colors.danger },
  subtitle: { ...theme.typography.caption, color: theme.colors.textFaint },
  pressed: { opacity: 0.7 },
});
