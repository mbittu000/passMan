import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { GroupCard } from '@/components/ui/GroupCard';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Toggle } from '@/components/ui/Toggle';
import { toast } from '@/components/ui/toast.store';
import { APP_NAME, AUTO_LOCK_MS, VERSION } from '@/lib/config';
import { useSession } from '@/lib/store/session';
import { useVault } from '@/lib/store/vault';
import { VaultRepository } from '@/lib/vault/repository';
import { theme } from '@/theme/theme';

export default function SettingsScreen() {
  const session = useSession((s) => s.session);
  const biometricAvailable = useSession((s) => s.biometricAvailable);
  const enableBiometric = useSession((s) => s.enableBiometric);
  const disableBiometric = useSession((s) => s.disableBiometric);
  const signOut = useSession((s) => s.signOut);
  const lock = useSession((s) => s.lock);
  const changePassword = useSession((s) => s.changePassword);
  const syncing = useVault((s) => s.syncing);
  const lastSync = useVault((s) => s.lastSync);
  const sync = useVault((s) => s.sync);
  const itemCount = useVault((s) => s.items.length);

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showChange, setShowChange] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      await enableBiometric();
      const err = useSession.getState().error;
      toast(err ?? 'Biometric unlock enabled', err ? 'danger' : 'success');
    } else {
      await disableBiometric();
      toast('Biometric unlock disabled', 'neutral');
    }
  };

  const submitPassword = async () => {
    if (newPw.length < 8) return toast('New password must be at least 8 characters', 'danger');
    if (newPw !== confirmPw) return toast('New passwords do not match', 'danger');
    try {
      await changePassword(oldPw, newPw);
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
      setShowChange(false);
      toast('Master password updated', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not change password', 'danger');
    }
  };

  const doSignOut = () => {
    const confirm = async () => {
      await signOut();
      await useVault.getState().reset();
    };
    if (Platform.OS === 'web') {
      void confirm();
      return;
    }
    Alert.alert('Sign out', 'This removes your vault and tokens from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void confirm() },
    ]);
  };

  const loadDemo = async () => {
    setDemoBusy(true);
    try {
      const result = await VaultRepository.seedDemo();
      toast(result.seeded ? `${result.seeded} demo logins added` : 'Demo logins already exist', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not load demo data', 'danger');
    } finally {
      setDemoBusy(false);
    }
  };

  const clearDemo = async () => {
    setDemoBusy(true);
    try {
      const removed = await VaultRepository.clearDemo();
      toast(removed ? `${removed} demo items removed` : 'No demo items to remove', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not remove demo data', 'danger');
    } finally {
      setDemoBusy(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Settings" subtitle={session?.email ?? undefined} />

        <GroupCard style={styles.profile}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(session?.email ?? '?').slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {session?.email ?? 'Not signed in'}
              </Text>
              <Text style={styles.profileMeta}>
                {itemCount} item{itemCount === 1 ? '' : 's'} · {syncing ? 'syncing…' : 'synced'}
              </Text>
            </View>
          </View>
        </GroupCard>

        <Text style={styles.sectionLabel}>Security</Text>
        <GroupCard>
          <SettingsRow
            icon="finger-print-outline"
            iconTone="mint"
            title="Biometric unlock"
            subtitle="Face ID / fingerprint to open your vault"
            right={
              <Toggle
                value={biometricAvailable}
                onValueChange={(value) => void toggleBiometric(value)}
                accessibilityLabel="Biometric unlock"
              />
            }
          />
          <SettingsRow
            icon="timer-outline"
            iconTone="gray"
            title="Auto-lock"
            subtitle={`Locks after ${Math.round(AUTO_LOCK_MS / 60000)} minutes in the background`}
          />
          <SettingsRow
            icon="key-outline"
            iconTone="gray"
            title="Change master password"
            subtitle="Re-wraps your vault key and rotates sessions"
            chevron={!showChange}
            onPress={() => setShowChange((v) => !v)}
          />
          {showChange ? (
            <View style={styles.changeForm}>
              <Field label="Current password" value={oldPw} onChangeText={setOldPw} secureToggle autoCapitalize="none" />
              <Field label="New password" value={newPw} onChangeText={setNewPw} secureToggle autoCapitalize="none" />
              <Field
                label="Confirm new password"
                value={confirmPw}
                onChangeText={setConfirmPw}
                secureToggle
                autoCapitalize="none"
                error={confirmPw && confirmPw !== newPw ? 'Passwords do not match' : null}
              />
              <Button label="Update password" icon="shield-checkmark-outline" onPress={submitPassword} />
            </View>
          ) : null}
        </GroupCard>

        <Text style={styles.sectionLabel}>Sync</Text>
        <GroupCard>
          <SettingsRow
            icon="cloud-outline"
            iconTone="blue"
            title="Sync now"
            subtitle={lastSync ? `Last synced ${formatTime(lastSync)}` : 'Never synced'}
            chevron
            onPress={() => sync()}
          />
          <SettingsRow
            icon="flask-outline"
            iconTone="yellow"
            title="Load demo data"
            subtitle="Clearly-labelled sample logins"
            chevron
            onPress={() => void loadDemo()}
          />
          <SettingsRow
            icon="trash-outline"
            iconTone="gray"
            title="Remove demo data"
            subtitle="Delete all sample logins"
            chevron
            onPress={() => void clearDemo()}
          />
        </GroupCard>

        <Text style={styles.sectionLabel}>Danger zone</Text>
        <GroupCard>
          <SettingsRow
            icon="lock-closed-outline"
            iconTone="gray"
            title="Lock vault"
            subtitle="Require your password or biometrics again"
            chevron
            onPress={lock}
          />
          <SettingsRow
            icon="log-out-outline"
            iconTone="red"
            title="Sign out & erase device data"
            destructive
            chevron
            onPress={doSignOut}
          />
        </GroupCard>
        {demoBusy ? <Text style={styles.working}>Working…</Text> : null}

        <Text style={styles.version}>
          {APP_NAME} v{VERSION}
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function formatTime(unix: number): string {
  const d = new Date(unix * 1000);
  return d.toLocaleString();
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
  profile: { paddingVertical: theme.spacing.lg },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(166,255,242,0.12)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...theme.typography.title, color: theme.colors.accent },
  profileInfo: { flex: 1 },
  profileEmail: { ...theme.typography.bodyStrong, color: theme.colors.text },
  profileMeta: { ...theme.typography.caption, color: theme.colors.textFaint, marginTop: 2 },
  sectionLabel: {
    ...theme.typography.label,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: theme.spacing.xs,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  changeForm: { paddingBottom: theme.spacing.md },
  working: { ...theme.typography.caption, color: theme.colors.textFaint, textAlign: 'center', marginTop: theme.spacing.md },
  version: {
    ...theme.typography.caption,
    color: theme.colors.textFaint,
    textAlign: 'center',
    marginTop: theme.spacing.xxl,
  },
});
