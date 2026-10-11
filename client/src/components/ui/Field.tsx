import { ReactNode, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/theme/theme';

export type FieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  right?: ReactNode;
  secureToggle?: boolean;
  containerStyle?: ViewStyle;
};

export function Field({
  label,
  hint,
  error,
  icon,
  right,
  secureToggle = false,
  containerStyle,
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));

  const handleFocus = (e: any) => {
    setFocused(true);
    onFocus?.(e);
  };
  const handleBlur = (e: any) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          focused ? styles.inputRowFocused : null,
          error ? styles.inputRowError : null,
        ]}
      >
        {icon ? (
          <Ionicons name={icon} size={18} color={theme.colors.textFaint} style={styles.icon} />
        ) : null}
        <TextInput
          {...rest}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={theme.colors.textFaint}
          style={styles.input}
          selectionColor={theme.palette.cyan400}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show value' : 'Hide value'}
            hitSlop={10}
            onPress={() => setHidden((v) => !v)}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={theme.colors.textFaint}
            />
          </Pressable>
        ) : null}
        {right}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spacing.lg },
  label: {
    ...theme.typography.label,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    minHeight: 52,
  },
  inputRowFocused: {
    borderColor: theme.palette.indigo400,
    backgroundColor: theme.colors.surfaceHigh,
  },
  inputRowError: { borderColor: theme.colors.danger },
  icon: { marginRight: theme.spacing.sm },
  input: {
    flex: 1,
    color: theme.colors.text,
    ...theme.typography.body,
    paddingVertical: theme.spacing.md,
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.textFaint,
    marginTop: theme.spacing.xs,
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    marginTop: theme.spacing.xs,
  },
});