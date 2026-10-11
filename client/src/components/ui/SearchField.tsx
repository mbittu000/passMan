import { Pressable, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/theme/theme';

export type SearchFieldProps = Omit<TextInputProps, 'style'> & {
  containerStyle?: ViewStyle;
};

/**
 * Rounded vault search field with a leading search icon and a clear button.
 */
export function SearchField({ value, onChangeText, placeholder = 'Search vault', containerStyle, ...rest }: SearchFieldProps) {
  return (
    <View style={[styles.row, containerStyle]}>
      <Ionicons name="search-outline" size={18} color={theme.colors.textFaint} style={styles.icon} />
      <TextInput
        {...rest}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textFaint}
        style={styles.input}
        selectionColor={theme.colors.accent}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={placeholder}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={10}
          onPress={() => onChangeText?.('')}
        >
          <Ionicons name="close-circle" size={18} color={theme.colors.textFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    minHeight: 48,
  },
  icon: { marginRight: theme.spacing.sm },
  input: {
    flex: 1,
    color: theme.colors.text,
    ...theme.typography.body,
    paddingVertical: theme.spacing.sm,
  },
});
