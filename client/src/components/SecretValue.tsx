import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { toast } from '@/components/ui/toast.store';
import { FieldKind, isSecretKind } from '@/lib/items/types';
import { theme } from '@/theme/theme';

export function SecretValue({
  label,
  value,
  kind = 'text',
  mono,
  flush = false,
  trailing,
}: {
  label: string;
  value: string;
  kind?: FieldKind;
  mono?: boolean;
  /** Render without outer padding/border for use inside grouped cards. */
  flush?: boolean;
  /** Extra action controls appended after reveal/copy. */
  trailing?: ReactNode;
}) {
  const [revealed, setRevealed] = useState(false);
  const secret = isSecretKind(kind);
  const empty = !value;

  const copy = async () => {
    if (empty) return;
    await Clipboard.setStringAsync(value);
    if (process.env.EXPO_OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    toast(`${label} copied`, 'success');
  };

  const display = secret && !revealed ? masked(value) : value;

  return (
    <View style={[styles.wrap, flush ? styles.flush : null]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Text
          style={[styles.value, mono || kind === 'secret' ? styles.mono : null, empty ? styles.empty : null]}
          selectable={!secret || revealed}
          numberOfLines={kind === 'multiline' ? 4 : undefined}
        >
          {empty ? '—' : display}
        </Text>
        <View style={styles.actions}>
          {secret && !empty ? (
            <Pressable hitSlop={10} onPress={() => setRevealed((v) => !v)} accessibilityLabel={revealed ? 'Hide' : 'Reveal'}>
              <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.textFaint} />
            </Pressable>
          ) : null}
          {!empty ? (
            <Pressable hitSlop={10} onPress={copy} accessibilityLabel={`Copy ${label}`}>
              <Ionicons name="copy-outline" size={18} color={theme.palette.cyan300} />
            </Pressable>
          ) : null}
          {trailing}
        </View>
      </View>
    </View>
  );
}

function masked(value: string): string {
  return '•'.repeat(Math.min(Math.max(value.length, 8), 20));
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  flush: { paddingVertical: theme.spacing.sm, borderBottomWidth: 0 },
  label: {
    ...theme.typography.label,
    color: theme.colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
  value: { ...theme.typography.body, color: theme.colors.text, flex: 1 },
  mono: { ...theme.typography.mono, color: theme.palette.cyan300 },
  empty: { color: theme.colors.textFaint },
  actions: { flexDirection: 'row', gap: theme.spacing.lg, paddingTop: 2 },
});