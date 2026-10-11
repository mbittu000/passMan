import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { theme } from '@/theme/theme';

export function Divider({ label, style }: { label?: string; style?: ViewStyle }) {
  if (!label) {
    return <View style={[styles.line, style]} />;
  }
  return (
    <View style={[styles.labeled, style]}>
      <View style={styles.line} />
      <Text style={styles.labelText}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  labeled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  labelText: {
    ...theme.typography.caption,
    color: theme.colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});