import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { theme } from '@/theme/theme';

type Variant = 'subtle' | 'ghost' | 'mint' | 'danger';

export type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  variant?: Variant;
  size?: number;
  iconSize?: number;
  iconColor?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: ViewStyle;
};

/**
 * Compact rounded-square icon button (Keychain header/actions).
 * Minimum 36px touch dimension; default 40px.
 */
export function IconButton({
  icon,
  onPress,
  variant = 'subtle',
  size = 40,
  iconSize = 20,
  iconColor,
  accessibilityLabel,
  disabled = false,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? String(icon)}
      accessibilityState={{ disabled }}
      disabled={disabled || !onPress}
      hitSlop={6}
      onPress={(e) => {
        if (process.env.EXPO_OS !== 'web') {
          Haptics.selectionAsync().catch(() => {});
        }
        onPress?.();
        void e;
      }}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: theme.radius.md },
        variant === 'subtle' ? styles.subtle : null,
        variant === 'ghost' ? styles.ghost : null,
        variant === 'mint' ? styles.mint : null,
        variant === 'danger' ? styles.danger : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Ionicons name={icon} size={iconSize} color={iconColor ?? defaultIconColor(variant)} />
    </Pressable>
  );
}

function defaultIconColor(variant: Variant): string {
  if (variant === 'mint') return theme.colors.textInverse;
  if (variant === 'danger') return theme.colors.danger;
  return theme.colors.textMuted;
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  subtle: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ghost: { backgroundColor: 'transparent' },
  mint: { backgroundColor: theme.colors.accent },
  danger: {
    backgroundColor: 'rgba(255,69,58,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.4)',
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
});
