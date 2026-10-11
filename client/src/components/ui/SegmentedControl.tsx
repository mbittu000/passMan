import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

import { theme } from '@/theme/theme';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedControlProps<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

/**
 * iOS-style segmented selector. Used for storage selection
 * (This device / Cloud Sync). Restrained: charcoal track, lighter thumb.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.track, style]} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            onPress={() => {
              if (process.env.EXPO_OS !== 'web') {
                Haptics.selectionAsync().catch(() => {});
              }
              onChange(option.value);
            }}
            style={[styles.option, active ? styles.optionActive : null]}
          >
            <Text style={[styles.label, active ? styles.labelActive : null]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 4,
    gap: 4,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    minHeight: 44,
  },
  optionActive: {
    backgroundColor: theme.colors.surfaceHigh,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.textFaint,
    fontWeight: '600',
  },
  labelActive: { color: theme.colors.text },
});
