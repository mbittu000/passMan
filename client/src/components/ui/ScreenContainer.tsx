import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/theme/theme';

export type ScreenContainerProps = {
  children: ReactNode;
  style?: ViewStyle;
  /** Apply top safe-area inset. Disable when a child handles it. */
  top?: boolean;
  /** Apply bottom safe-area inset. */
  bottom?: boolean;
};

/**
 * Screen container: near-black background with platform safe-area handling.
 * Screens add their own content padding/scroll on top of this.
 */
export function ScreenContainer({ children, style, top = true, bottom = true }: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        top ? { paddingTop: insets.top } : null,
        bottom ? { paddingBottom: insets.bottom } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
});
