import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useToast } from '@/components/ui/toast.store';
import { theme } from '@/theme/theme';

export function ToastHost() {
  const { message, tone, hide } = useToast();
  const insets = useSafeAreaInsets();
  const [translate] = useState(() => new Animated.Value(-100));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (message) {
      Animated.parallel([
        Animated.spring(translate, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translate, { toValue: -100, duration: 200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => hide());
      }, 2600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [message, translate, opacity, hide]);

  if (!message) return null;

  const accent =
    tone === 'success' ? theme.colors.success : tone === 'danger' ? theme.colors.danger : theme.palette.indigo400;
  const icon: keyof typeof Ionicons.glyphMap =
    tone === 'success' ? 'checkmark-circle' : tone === 'danger' ? 'alert-circle' : 'information-circle';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { top: insets.top + 8, transform: [{ translateY: translate }], opacity },
      ]}
    >
      <View style={[styles.toast, { borderColor: accent }]}>
        <Ionicons name={icon} size={18} color={accent} />
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    zIndex: 1000,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    maxWidth: 520,
    ...theme.shadow.card,
  },
  text: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text,
    flexShrink: 1,
  },
});