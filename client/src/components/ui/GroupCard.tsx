import { Fragment, ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { theme } from '@/theme/theme';

export type GroupCardProps = {
  children: ReactNode;
  style?: ViewStyle;
};

/**
 * Grouped card: charcoal container with hairline dividers inserted between
 * children. Used for credential cards, Storage & Access, and settings groups.
 */
export function GroupCard({ children, style }: GroupCardProps) {
  const items = childrenArray(children);
  return (
    <View style={[styles.card, style]}>
      {items.map((child, index) => (
        <Fragment key={index}>
          {child}
          {index < items.length - 1 ? <View style={styles.divider} /> : null}
        </Fragment>
      ))}
    </View>
  );
}

function childrenArray(children: ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  const walk = (node: ReactNode): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node === null || node === undefined || node === false) return;
    out.push(node);
  };
  walk(children);
  return out;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginLeft: 0,
  },
});
