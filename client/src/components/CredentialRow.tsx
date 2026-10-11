import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ServiceLogo } from '@/components/ServiceLogo';
import { theme } from '@/theme/theme';

export type CredentialRowProps = {
  title: string;
  identifier?: string;
  /** Narrow separator bar color. */
  accent: string;
  onPress?: () => void;
  right?: React.ReactNode;
  style?: ViewStyle;
};

/**
 * Credential row: service logo, narrow colored separator, name + identifier,
 * right chevron. Matches the Keychain reference density.
 */
export function CredentialRow({ title, identifier, accent, onPress, right, style }: CredentialRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}${identifier ? `, ${identifier}` : ''}`}
      onPress={() => {
        if (process.env.EXPO_OS !== 'web') {
          Haptics.selectionAsync().catch(() => {});
        }
        onPress?.();
      }}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null, style]}
    >
      <ServiceLogo title={title} size={44} />
      <View style={[styles.separator, { backgroundColor: accent }]} />
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {identifier ? (
          <Text style={styles.identifier} numberOfLines={1}>
            {identifier}
          </Text>
        ) : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={theme.colors.textFaint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    minHeight: 68,
  },
  separator: { width: 3, alignSelf: 'stretch', borderRadius: 2, opacity: 0.9 },
  text: { flex: 1, gap: 2 },
  title: { ...theme.typography.bodyStrong, color: theme.colors.text },
  identifier: { ...theme.typography.caption, color: theme.colors.textFaint },
  pressed: { opacity: 0.75 },
});
