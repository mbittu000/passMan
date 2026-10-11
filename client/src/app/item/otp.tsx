import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ServiceLogo } from '@/components/ServiceLogo';
import { Button } from '@/components/ui/Button';
import { CopyControl } from '@/components/ui/CopyControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { GroupCard } from '@/components/ui/GroupCard';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { generateTotp } from '@/lib/otp/totp';
import { useVault } from '@/lib/store/vault';
import { theme } from '@/theme/theme';

/**
 * One-time code screen. Codes are generated entirely offline from the stored
 * secret — no backend, no network, nothing leaves the device.
 */
export default function OtpScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const item = useVault((s) => s.items.find((i) => i.id === id));

  const secret = (item?.payload.fields.totp ?? '').replace(/[\s-]+/g, '');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const code = useMemo(() => {
    if (!secret) return null;
    try {
      return generateTotp(secret, now);
    } catch {
      return null;
    }
  }, [secret, now]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(id ? `/item/${id}` : '/(tabs)/vault');
  };

  if (!item) {
    return (
      <ScreenContainer style={styles.center}>
        <Text style={styles.missing}>This item is no longer available.</Text>
        <Button label="Back to vault" variant="secondary" onPress={() => router.replace('/(tabs)/vault')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <IconButton icon="chevron-back" accessibilityLabel="Back" onPress={goBack} />
          <Text style={styles.topTitle}>One-time code</Text>
          <View style={styles.topSpacer} />
        </View>

        <View style={styles.hero}>
          <ServiceLogo title={item.payload.title || 'Login'} size={64} />
          <Text style={styles.title}>{item.payload.title || 'Untitled login'}</Text>
        </View>

        {code ? (
          <GroupCard style={styles.card}>
            <View style={styles.codeRow}>
              <Text style={styles.code} selectable>
                {code.code.slice(0, 3)} {code.code.slice(3)}
              </Text>
              <CopyControl value={code.code} label="One-time code" />
            </View>
            <View style={styles.countRow}>
              <View style={styles.countTrack}>
                <View style={[styles.countFill, { width: `${Math.round((code.secondsLeft / 30) * 100)}%` }]} />
              </View>
              <Text style={styles.countText}>{code.secondsLeft}s</Text>
            </View>
          </GroupCard>
        ) : (
          <EmptyState
            icon="key-outline"
            title="No authenticator secret"
            message="Add a TOTP secret to this login to generate codes here."
            action={
              <Button
                label="Edit login"
                icon="create-outline"
                onPress={() => router.push(`/item/editor?id=${item.id}`)}
              />
            }
          />
        )}

        <Text style={styles.caption}>
          Codes refresh every 30 seconds and are generated offline on this device. The secret itself is never shown
          here.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: theme.spacing.lg },
  center: { alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg, padding: theme.spacing.xl },
  missing: { ...theme.typography.body, color: theme.colors.textMuted },
  content: { paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xxxl },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  topTitle: { ...theme.typography.heading, color: theme.colors.text },
  topSpacer: { width: 40 },
  hero: { alignItems: 'center', gap: theme.spacing.md, marginVertical: theme.spacing.lg },
  title: { ...theme.typography.title, color: theme.colors.text, textAlign: 'center' },
  card: { paddingVertical: theme.spacing.lg },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  code: {
    ...theme.typography.mono,
    fontSize: 34,
    letterSpacing: 4,
    color: theme.colors.accent,
  },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  countTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surfaceHigh,
    overflow: 'hidden',
  },
  countFill: { height: 4, borderRadius: 2, backgroundColor: theme.colors.accent },
  countText: { ...theme.typography.monoSmall, color: theme.colors.textFaint, minWidth: 28, textAlign: 'right' },
  caption: {
    ...theme.typography.caption,
    color: theme.colors.textFaint,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
});
