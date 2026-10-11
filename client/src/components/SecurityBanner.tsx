import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/theme/theme';

export type SecurityBannerProps = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Marks illustrative/demo content that is not backed by a live service. */
  demo?: boolean;
  style?: ViewStyle;
};

/**
 * Security warning banner: yellow on a dark olive surface. Used for
 * security notices. Anything not backed by a live detection service must
 * pass `demo` so it is explicitly labelled as illustrative.
 */
export function SecurityBanner({ title, message, actionLabel, onAction, demo = false, style }: SecurityBannerProps) {
  return (
    <View
      style={[styles.banner, style]}
      accessibilityRole="alert"
      accessibilityLabel={`${demo ? 'Demo illustration. ' : ''}${title}${message ? `. ${message}` : ''}`}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="warning" size={20} color={theme.colors.warning} />
      </View>
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {demo ? (
            <View style={styles.demoPill}>
              <Text style={styles.demoText}>DEMO</Text>
            </View>
          ) : null}
        </View>
        {message ? (
          <Text style={styles.message} numberOfLines={3}>
            {message}
          </Text>
        ) : null}
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onAction}
            hitSlop={8}
            style={({ pressed }) => (pressed ? styles.actionPressed : undefined)}
          >
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.olive,
    borderWidth: 1,
    borderColor: 'rgba(255,204,39,0.35)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,204,39,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' },
  title: { ...theme.typography.bodyStrong, color: theme.colors.warning, flexShrink: 1 },
  demoPill: {
    backgroundColor: 'rgba(255,204,39,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,204,39,0.45)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  demoText: { ...theme.typography.micro, color: theme.colors.warning },
  message: { ...theme.typography.caption, color: '#d9d2a4' },
  action: { ...theme.typography.bodyStrong, color: theme.colors.accent, marginTop: 4 },
  actionPressed: { opacity: 0.7 },
});
