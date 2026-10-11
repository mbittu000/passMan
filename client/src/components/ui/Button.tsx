import { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { theme } from '@/theme/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  fullWidth = true,
  disabled,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const isDisabled = disabled || loading;

  const animate = (to: number) => {
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const height = size === 'lg' ? 56 : size === 'sm' ? 40 : 50;

  return (
    <Animated.View
      style={[
        { transform: [{ scale }] },
        fullWidth ? styles.fullWidth : null,
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
        onPress={(e) => {
          if (process.env.EXPO_OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
          onPress?.(e);
        }}
        style={[
          styles.base,
          { height, borderRadius: theme.radius.md },
          variant === 'primary' ? styles.primary : null,
          variant === 'secondary' ? styles.secondary : null,
          variant === 'ghost' ? styles.ghost : null,
          variant === 'danger' ? styles.danger : null,
          isDisabled ? styles.disabled : null,
        ]}
        {...rest}
      >
        <View style={styles.inner}>
          {loading ? (
            <ActivityIndicator color={variant === 'primary' ? theme.colors.onPrimary : theme.colors.text} />
          ) : (
            <>
              {icon && label ? (
                <Ionicons
                  name={icon}
                  size={size === 'sm' ? 16 : 18}
                  color={iconColor(variant)}
                  style={styles.iconLeft}
                />
              ) : null}
              {icon && !label ? (
                <Ionicons name={icon} size={size === 'sm' ? 16 : 20} color={iconColor(variant)} />
              ) : null}
              {label ? (
                <Text
                  style={[
                    styles.label,
                    { fontSize: size === 'sm' ? 14 : 15 },
                    variant === 'ghost' || variant === 'secondary' ? styles.labelAlt : null,
                    variant === 'danger' ? styles.labelDanger : null,
                  ]}
                >
                  {label}
                </Text>
              ) : null}
              {iconRight ? (
                <Ionicons
                  name={iconRight}
                  size={size === 'sm' ? 16 : 18}
                  color={iconColor(variant)}
                  style={styles.iconRight}
                />
              ) : null}
            </>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function iconColor(variant: Variant) {
  if (variant === 'primary') return theme.colors.onPrimary;
  if (variant === 'danger') return theme.colors.danger;
  return theme.colors.text;
}

const styles = StyleSheet.create({
  fullWidth: { width: '100%' },
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.lg,
  },
  primary: {
    backgroundColor: theme.colors.primary,
    ...theme.shadow.glow,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
  label: {
    color: theme.colors.onPrimary,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelAlt: { color: theme.colors.text },
  labelDanger: { color: theme.colors.danger },
  secondary: {
    backgroundColor: theme.colors.surfaceHigh,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ghost: { backgroundColor: 'transparent' },
  danger: {
    backgroundColor: 'rgba(255,69,58,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.4)',
  },
  disabled: { opacity: 0.5 },
});
