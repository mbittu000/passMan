import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Field, FieldProps } from '@/components/ui/Field';
import { passwordStrength } from '@/lib/items/generator';
import { theme } from '@/theme/theme';

export type PasswordFieldProps = Omit<FieldProps, 'secureToggle' | 'secureTextEntry'> & {
  /** Show a one-tap generator button. */
  onGenerate?: () => void;
  /** Show a thin strength meter under the input. */
  showStrength?: boolean;
};

/**
 * Password input with reveal toggle, optional generator action, and an
 * optional restrained strength meter.
 */
export function PasswordField({
  label = 'Password',
  value,
  onGenerate,
  showStrength = false,
  ...rest
}: PasswordFieldProps) {
  const text = typeof value === 'string' ? value : '';
  const strength = showStrength && text ? passwordStrength(text) : null;

  return (
    <View>
      <Field
        label={label}
        value={value}
        secureToggle
        autoCapitalize="none"
        autoCorrect={false}
        right={
          onGenerate ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Generate password"
              hitSlop={10}
              onPress={onGenerate}
              style={styles.generate}
            >
              <Ionicons name="refresh-outline" size={18} color={theme.colors.accent} />
            </Pressable>
          ) : undefined
        }
        {...rest}
      />
      {strength ? (
        <View style={styles.meterRow} accessibilityLabel={`Password strength: ${strength.label}`}>
          <View style={styles.meterTrack}>
            <View
              style={[
                styles.meterFill,
                { width: `${Math.round(strength.score * 100)}%`, backgroundColor: strengthColor(strength.tone) },
              ]}
            />
          </View>
          <Text style={styles.meterLabel}>{strength.label}</Text>
        </View>
      ) : null}
    </View>
  );
}

function strengthColor(tone: 'danger' | 'warning' | 'success' | 'brand'): string {
  if (tone === 'brand') return theme.colors.accent;
  if (tone === 'success') return theme.colors.success;
  if (tone === 'warning') return theme.colors.warning;
  return theme.colors.danger;
}

const styles = StyleSheet.create({
  generate: { marginLeft: theme.spacing.sm },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  meterTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surfaceHigh,
    overflow: 'hidden',
  },
  meterFill: { height: 4, borderRadius: 2 },
  meterLabel: { ...theme.typography.caption, color: theme.colors.textFaint, minWidth: 64, textAlign: 'right' },
});
