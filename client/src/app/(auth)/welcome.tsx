import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { theme } from '@/theme/theme';

const FEATURES = [
  { icon: 'key-outline', label: 'Passwords, API keys & tokens' },
  { icon: 'server-outline', label: 'Database strings & SSH keys' },
  { icon: 'scan-outline', label: 'Passkeys, cards & identities' },
] as const;

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScreenContainer>
      <View style={[styles.container, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Ionicons name="shield-checkmark" size={42} color={theme.colors.textInverse} />
          </View>
          <Text style={styles.brand}>Keychain</Text>
          <Text style={styles.tagline}>
            Your encrypted vault for every kind of secret — sealed on this device, synced everywhere.
          </Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={18} color={theme.colors.accent} />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Button label="Create your vault" icon="add" onPress={() => router.push('/(auth)/register')} />
          <View style={styles.gap} />
          <Button
            label="I already have an account"
            variant="secondary"
            onPress={() => router.push('/(auth)/login')}
          />
          <Text style={styles.zero}>Zero-knowledge · Argon2id · AES-256-GCM</Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: theme.spacing.xl, justifyContent: 'space-between' },
  hero: { alignItems: 'center', marginTop: theme.spacing.xxl },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
  },
  brand: {
    ...theme.typography.display,
    color: theme.colors.text,
    marginTop: theme.spacing.xl,
  },
  tagline: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    maxWidth: 320,
  },
  features: { gap: theme.spacing.sm, marginVertical: theme.spacing.xl },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceHigh,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: { ...theme.typography.bodyStrong, color: theme.colors.text },
  footer: { gap: 0 },
  gap: { height: theme.spacing.md },
  zero: {
    ...theme.typography.caption,
    color: theme.colors.textFaint,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    letterSpacing: 0.4,
  },
});
