import { useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { OverflowMenu } from '@/components/OverflowMenu';
import { SecurityBanner } from '@/components/SecurityBanner';
import { SecretValue } from '@/components/SecretValue';
import { ServiceLogo, tintForKey } from '@/components/ServiceLogo';
import { Button } from '@/components/ui/Button';
import { GroupCard } from '@/components/ui/GroupCard';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Toggle } from '@/components/ui/Toggle';
import { toast } from '@/components/ui/toast.store';
import { categoryById, useCategories } from '@/lib/categories/store';
import { itemIdentifier, linkedWebsitesOf, templateFor } from '@/lib/items/types';
import { useVault } from '@/lib/store/vault';
import { VaultRepository } from '@/lib/vault/repository';
import { theme } from '@/theme/theme';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const item = useVault((s) => s.items.find((i) => i.id === id));
  const toggleFavorite = useVault((s) => s.toggleFavorite);
  const categories = useCategories((s) => s.categories);

  const [menuOpen, setMenuOpen] = useState(false);

  const tpl = useMemo(() => templateFor(item?.payload.type ?? 'custom'), [item?.payload.type]);

  if (!item) {
    return (
      <ScreenContainer style={styles.center}>
        <Text style={styles.missing}>This item is no longer available.</Text>
        <Button label="Back to vault" variant="secondary" onPress={() => router.replace('/(tabs)/vault')} />
      </ScreenContainer>
    );
  }

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/vault');
  };

  const copyValue = async (value: string, label: string) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    if (process.env.EXPO_OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    toast(`${label} copied`, 'success');
  };

  const openWebsite = async (raw: string) => {
    const url = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        toast('This link cannot be opened', 'danger');
        return;
      }
      await Linking.openURL(url);
    } catch {
      toast('This link cannot be opened', 'danger');
    }
  };

  const confirmDelete = () => {
    const doDelete = async () => {
      try {
        await VaultRepository.remove(item.id);
        toast('Item deleted', 'success');
        goBack();
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Could not delete item', 'danger');
      }
    };
    if (Platform.OS === 'web') {
      void doDelete();
      return;
    }
    Alert.alert('Delete item', 'This removes the item. Cloud items are removed from all devices.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void doDelete() },
    ]);
  };

  const setSync = async (enabled: boolean) => {
    try {
      await VaultRepository.updateLogin(item.id, {
        syncAllDevices: enabled,
        storage: enabled ? 'cloud' : 'local',
      });
      toast(enabled ? 'Syncing to all devices' : 'Kept on this device only', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update sync', 'danger');
    }
  };

  const visibleFields = tpl.fields.filter((f) => f.key in item.payload.fields);
  const websites = linkedWebsitesOf(item);
  const primaryWebsite = websites[0] ?? '';
  const storage = item.payload.storage ?? 'cloud';
  const synced = item.payload.syncAllDevices ?? storage !== 'local';
  const category = categoryById(categories, item.payload.categoryId);
  const tint = category?.color ?? tintForKey(item.payload.title || '?');
  const username = item.payload.fields.username ?? '';
  const password = item.payload.fields[item.payload.type === 'password' ? 'password' : (tpl.primaryField ?? '')] ?? '';

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <IconButton icon="chevron-back" accessibilityLabel="Back" onPress={goBack} />
          <View style={styles.topActions}>
            <IconButton
              icon={item.payload.favorite ? 'star' : 'star-outline'}
              iconColor={item.payload.favorite ? theme.colors.warning : undefined}
              accessibilityLabel={item.payload.favorite ? 'Remove from favorites' : 'Add to favorites'}
              onPress={() => toggleFavorite(item.id)}
            />
            <IconButton
              icon="create-outline"
              accessibilityLabel="Edit"
              onPress={() => router.push(`/item/editor?id=${item.id}`)}
            />
            <IconButton icon="ellipsis-horizontal" accessibilityLabel="More actions" onPress={() => setMenuOpen(true)} />
          </View>
        </View>

        <View style={styles.hero}>
          <ServiceLogo title={item.payload.title || tpl.label} size={72} tint={tint} />
          <Text style={styles.title}>{item.payload.title || tpl.label}</Text>
          {itemIdentifier(item) ? <Text style={styles.subtitle}>{itemIdentifier(item)}</Text> : null}
          <View style={styles.metaRow}>
            {item.payload.demo ? (
              <View style={styles.demoPill}>
                <Text style={styles.demoText}>DEMO DATA</Text>
              </View>
            ) : null}
            {category ? (
              <View style={styles.categoryPill}>
                <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                <Text style={styles.categoryText}>{category.name}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text style={styles.sectionLabel}>Details</Text>
        <GroupCard style={styles.card}>
          {visibleFields.map((field) => (
            <SecretValue
              key={field.key}
              flush
              label={field.label}
              value={item.payload.fields[field.key] ?? ''}
              kind={field.kind}
              mono={field.mono}
              trailing={
                field.kind === 'url' && item.payload.fields[field.key] ? (
                  <Pressable
                    hitSlop={10}
                    accessibilityLabel="Open website"
                    onPress={() => openWebsite(item.payload.fields[field.key])}
                  >
                    <Ionicons name="open-outline" size={18} color={theme.colors.info} />
                  </Pressable>
                ) : undefined
              }
            />
          ))}
          {item.payload.custom?.map((custom) => (
            <SecretValue
              key={custom.id}
              flush
              label={custom.label}
              value={custom.value}
              kind={custom.secret ? 'secret' : 'text'}
            />
          ))}
        </GroupCard>

        {item.payload.breachDemo ? (
          <SecurityBanner
            demo
            title="Password found in a data breach"
            message="Illustrative demo content — no live breach check was performed."
            actionLabel="Update now"
            onAction={() => router.push(`/item/editor?id=${item.id}`)}
            style={styles.banner}
          />
        ) : null}

        <Text style={styles.sectionLabel}>Storage &amp; Security</Text>
        <GroupCard style={styles.card}>
          <SettingsRow
            icon="cloud-outline"
            iconTone="blue"
            title="Storage"
            subtitle={storage === 'local' ? 'This device only' : 'Cloud Sync'}
            chevron
            onPress={() => router.push(`/item/editor?id=${item.id}`)}
          />
          <SettingsRow
            icon="sync-outline"
            iconTone="mint"
            title="Available on all devices"
            subtitle={synced ? 'On' : 'Off'}
            right={
              <Toggle
                value={synced}
                accessibilityLabel="Available on all devices"
                onValueChange={(value) => void setSync(value)}
              />
            }
          />
          {item.payload.type === 'password' ? (
            <SettingsRow
              icon="key-outline"
              iconTone="mint"
              title="2FA / OTP"
              subtitle="Authenticator codes for this login"
              chevron
              onPress={() => router.push(`/item/otp?id=${item.id}`)}
            />
          ) : null}
        </GroupCard>

        <View style={styles.notesHeader}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <Pressable hitSlop={8} onPress={() => router.push(`/item/editor?id=${item.id}`)}>
            <Text style={styles.editNotes}>{item.payload.notes ? 'Edit' : 'Add'}</Text>
          </Pressable>
        </View>
        <GroupCard style={styles.card}>
          {item.payload.notes ? (
            <Text style={styles.notes}>{item.payload.notes}</Text>
          ) : (
            <Text style={styles.notesEmpty}>No notes yet.</Text>
          )}
        </GroupCard>

        <Text style={styles.updated}>Updated {new Date(item.updatedAt * 1000).toLocaleString()}</Text>
      </ScrollView>

      <OverflowMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={item.payload.title || tpl.label}
        options={[
          ...(username
            ? [{ label: 'Copy username', icon: 'person-outline' as const, onSelect: () => void copyValue(username, 'Username') }]
            : []),
          ...(password
            ? [{ label: 'Copy password', icon: 'key-outline' as const, onSelect: () => void copyValue(password, 'Password') }]
            : []),
          ...(primaryWebsite
            ? [{ label: 'Open website', icon: 'open-outline' as const, onSelect: () => void openWebsite(primaryWebsite) }]
            : []),
          {
            label: item.payload.favorite ? 'Remove from favorites' : 'Add to favorites',
            icon: 'star-outline' as const,
            onSelect: () => void toggleFavorite(item.id),
          },
          { label: 'Delete', icon: 'trash-outline' as const, destructive: true, onSelect: confirmDelete },
        ]}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: theme.spacing.lg },
  center: { alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg, padding: theme.spacing.xl },
  missing: { ...theme.typography.body, color: theme.colors.textMuted },
  content: { paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xxxl },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  topActions: { flexDirection: 'row', gap: theme.spacing.sm },
  hero: { alignItems: 'center', gap: theme.spacing.sm, marginVertical: theme.spacing.lg },
  title: { ...theme.typography.title, color: theme.colors.text, textAlign: 'center' },
  subtitle: { ...theme.typography.body, color: theme.colors.textMuted, textAlign: 'center' },
  metaRow: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
  demoPill: {
    backgroundColor: 'rgba(255,204,39,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,204,39,0.4)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  demoText: { ...theme.typography.micro, color: theme.colors.warning },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceHigh,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryText: { ...theme.typography.caption, color: theme.colors.textMuted, fontWeight: '600' },
  sectionLabel: {
    ...theme.typography.label,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: theme.spacing.xs,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  card: {},
  banner: { marginTop: theme.spacing.lg },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
    marginRight: theme.spacing.xs,
  },
  editNotes: { ...theme.typography.bodyStrong, color: theme.colors.accent },
  notes: { ...theme.typography.body, color: theme.colors.text, paddingVertical: theme.spacing.sm },
  notesEmpty: { ...theme.typography.body, color: theme.colors.textFaint, paddingVertical: theme.spacing.sm },
  updated: { ...theme.typography.caption, color: theme.colors.textFaint, textAlign: 'center', marginTop: theme.spacing.xl },
});
