import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useSession } from '@/lib/store/session';
import { theme } from '@/theme/theme';

export default function UnlockScreen() {
  const router = useRouter();
  const session = useSession((s) => s.session);
  const busy = useSession((s) => s.busy);
  const error = useSession((s) => s.error);
  const biometricAvailable = useSession((s) => s.biometricAvailable);
  const unlockWithPassword = useSession((s) => s.unlockWithPassword);
  const unlockWithBiometric = useSession((s) => s.unlockWithBiometric);
  const clearError = useSession((s) => s.clearError);

  const [password, setPassword] = useState('');

  useEffect(() => {
    if (biometricAvailable) {
      void unlockWithBiometric();
    }
  }, [biometricAvailable, unlockWithBiometric]);

  const submit = async () => {
    clearError();
    try {
      await unlockWithPassword(password);
      setPassword('');
    } catch {
      // error surfaced via store
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.logo}>
              <Ionicons name="lock-closed" size={30} color={theme.colors.textInverse} />
            </View>
            <Text style={styles.title}>Vault locked</Text>
            <Text style={styles.subtitle}>{session?.email ?? ''}</Text>
          </View>

          <Field
            label="Master password"
            icon="key-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your master password"
            secureToggle
            autoCapitalize="none"
            autoFocus={!biometricAvailable}
            onSubmitEditing={submit}
            error={error}
          />

          <Button label="Unlock" icon="lock-open-outline" loading={busy} onPress={submit} />

          {biometricAvailable ? (
            <>
              <View style={styles.gap} />
              <Button
                label="Unlock with biometrics"
                variant="secondary"
                icon="finger-print-outline"
                onPress={() => unlockWithBiometric()}
              />
            </>
          ) : null}

          <View style={styles.gap} />
          <Button
            label="Use a different account"
            variant="ghost"
            icon="swap-horizontal-outline"
            onPress={() => router.replace('/(auth)/login')}
          />
          <Button
            label="Create a new vault"
            variant="ghost"
            icon="person-add-outline"
            onPress={() => router.replace('/(auth)/register')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: theme.spacing.xl, paddingTop: theme.spacing.xxxl + theme.spacing.xl },
  hero: { alignItems: 'center', marginBottom: theme.spacing.xxl },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.accent,
  },
  title: { ...theme.typography.display, fontSize: 30, color: theme.colors.text },
  subtitle: { ...theme.typography.body, color: theme.colors.textMuted, marginTop: theme.spacing.xs },
  gap: { height: theme.spacing.md },
});