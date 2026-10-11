import { StyleSheet, Switch, View, ViewStyle } from 'react-native';

import { theme } from '@/theme/theme';

export type ToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: ViewStyle;
};

/**
 * Keychain toggle: mint track when on, charcoal when off.
 */
export function Toggle({ value, onValueChange, accessibilityLabel, disabled = false, style }: ToggleProps) {
  return (
    <View style={[styles.hit, style]}>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="switch"
        trackColor={{ true: 'rgba(166,255,242,0.35)', false: theme.colors.surfaceHigh }}
        thumbColor={value ? theme.colors.accent : theme.colors.textFaint}
        ios_backgroundColor={theme.colors.surfaceHigh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { padding: theme.spacing.xs, margin: -theme.spacing.xs },
});
