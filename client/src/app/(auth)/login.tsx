import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useSession } from '@/lib/store/session';
import { theme } from '@/theme/theme';

export default function LoginScreen() {
  const router = useRouter();
  const login = useSession((s) => s.login);
  const busy = useSession((s) => s.busy);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.includes('@')) return setError('Enter a valid email address');
    if (!password) return setError('Enter your password');
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
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
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Button label="Back" variant="ghost" icon="chevron-back" fullWidth={false} onPress={goBack} />
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to decrypt and sync your vault.</Text>
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
            placeholder="Your master password"
            secureToggle
            autoCapitalize="none"
            onSubmitEditing={submit}
          />

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button label="Sign in" icon="log-in-outline" loading={busy} onPress={submit} style={styles.cta} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to Keychain?</Text>
            <Button
              label="Create an account"
              variant="ghost"
              icon="person-add-outline"
              onPress={() => router.replace('/(auth)/register')}
            />
          </View>
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
  footer: { marginTop: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.sm },
  footerText: { ...theme.typography.body, color: theme.colors.textMuted },
});