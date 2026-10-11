import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { passwordStrength } from '@/lib/items/generator';
import { useSession } from '@/lib/store/session';
import { theme } from '@/theme/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const register = useSession((s) => s.register);
  const busy = useSession((s) => s.busy);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const strength = passwordStrength(password);
  const canSubmit = email.trim().length > 3 && password.length >= 8 && password === confirm;

  const submit = async () => {
    setError(null);
    if (!email.includes('@')) return setError('Enter a valid email address');
    if (password.length < 8) return setError('Use at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    try {
      await register(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your vault');
    }
  };

  const goBack = () => {
    // `router.back()` is a no-op when this screen was reached via `replace`
    // (e.g. from unlock), so fall back to the welcome screen.
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)/welcome');
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Button label="Back" variant="ghost" icon="chevron-back" fullWidth={false} onPress={goBack} />
            <Text style={styles.title}>Create your vault</Text>
            <Text style={styles.subtitle}>
              Your master password encrypts everything. It is never sent to the server and cannot be
              recovered — keep it safe.
            </Text>
          </View>

          <Field
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Field
            label="Master password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureToggle
            autoCapitalize="none"
            hint={password ? `${strength.label} · ~${strength.bits} bits of entropy` : undefined}
          />
          {password ? (
            <View style={styles.meter}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.meterBar,
                    {
                      backgroundColor:
                        strength.score * 4 > i ? theme.colors[strength.tone === 'brand' ? 'primary' : strength.tone] : theme.colors.surfaceHigh,
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}
          <Field
            label="Confirm password"
            icon="lock-closed-outline"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat your password"
            secureToggle
            autoCapitalize="none"
            error={confirm && confirm !== password ? 'Passwords do not match' : null}
          />

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            label="Create vault"
            icon="shield-checkmark-outline"
            loading={busy}
            disabled={!canSubmit}
            onPress={submit}
            style={styles.cta}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: theme.spacing.xl, paddingTop: theme.spacing.xxxl, paddingBottom: theme.spacing.xxxl },
  header: { marginBottom: theme.spacing.xl },
  title: { ...theme.typography.display, color: theme.colors.text, marginTop: theme.spacing.lg },
  subtitle: { ...theme.typography.body, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
  meter: { flexDirection: 'row', gap: 6, marginTop: -theme.spacing.sm, marginBottom: theme.spacing.lg },
  meterBar: { flex: 1, height: 5, borderRadius: 3 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(255,69,58,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.3)',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  errorText: { ...theme.typography.caption, color: theme.colors.danger, flex: 1 },
  cta: { marginTop: theme.spacing.sm },
});