import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { CategoryTile } from '@/components/CategoryTile';
import { CredentialRow } from '@/components/CredentialRow';
import { tintForKey } from '@/components/ServiceLogo';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SearchField } from '@/components/ui/SearchField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { toast } from '@/components/ui/toast.store';
import { categoryById, useCategories } from '@/lib/categories/store';
import { itemIdentifier } from '@/lib/items/types';
import { useSession } from '@/lib/store/session';
import { useVault } from '@/lib/store/vault';
import { VaultRepository } from '@/lib/vault/repository';
import { theme } from '@/theme/theme';

type StorageView = 'device' | 'cloud';

export default function VaultScreen() {
  const router = useRouter();
  const vaultKey = useSession((s) => s.vaultKey);
  const items = useVault((s) => s.items);
  const syncing = useVault((s) => s.syncing);
  const loaded = useVault((s) => s.loaded);
  const sync = useVault((s) => s.sync);
  const categories = useCategories((s) => s.categories);
  const loadCategories = useCategories((s) => s.load);

  const [query, setQuery] = useState('');
  const [storageView, setStorageView] = useState<StorageView>('cloud');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (vaultKey) void loadCategories();
  }, [vaultKey, loadCategories]);

  const storageItems = useMemo(
    () =>
      items.filter((item) =>
        storageView === 'device'
          ? (item.payload.storage ?? 'cloud') === 'local'
          : (item.payload.storage ?? 'cloud') !== 'local',
      ),
    [items, storageView],
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of storageItems) {
      const id = item.payload.categoryId ?? '';
      map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [storageItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return storageItems.filter((item) => {
      if (selectedCategory && item.payload.categoryId !== selectedCategory) return false;
      if (!q) return true;
      const category = categoryById(categories, item.payload.categoryId)?.name ?? '';
      const hay = [item.payload.title, itemIdentifier(item), category, ...(item.payload.tags ?? [])]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [storageItems, selectedCategory, query, categories]);

  const passwordCount = useMemo(() => items.filter((i) => i.payload.type === 'password').length, [items]);

  const seedDemo = async () => {
    setSeeding(true);
    try {
      const result = await VaultRepository.seedDemo();
      toast(result.seeded ? `${result.seeded} demo logins added` : 'Demo logins already exist', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not load demo data', 'danger');
    } finally {
      setSeeding(false);
    }
  };

  const tileRows = useMemo(() => {
    const rows: typeof categories[] = [];
    for (let i = 0; i < categories.length; i += 2) rows.push(categories.slice(i, i + 2));
    return rows;
  }, [categories]);

  return (
    <ScreenContainer style={styles.screen}>
      <View style={styles.header}>
        <ScreenHeader
          title="Keychain"
          subtitle={
            passwordCount > 0
              ? `${passwordCount} password${passwordCount === 1 ? '' : 's'} protected`
              : `${items.length} item${items.length === 1 ? '' : 's'} secured`
          }
          right={
            <IconButton
              icon="settings-outline"
              accessibilityLabel="Open settings"
              onPress={() => router.push('/(tabs)/settings')}
            />
          }
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const category = categoryById(categories, item.payload.categoryId);
          return (
            <CredentialRow
              title={item.payload.title || 'Untitled'}
              identifier={itemIdentifier(item)}
              accent={category?.color ?? tintForKey(item.payload.title || '?')}
              onPress={() => router.push(`/item/${item.id}`)}
            />
          );
        }}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={syncing}
            onRefresh={() => sync()}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
        ListHeaderComponent={
          <View>
            <SegmentedControl<StorageView>
              accessibilityLabel="Storage"
              options={[
                { value: 'device', label: 'This device' },
                { value: 'cloud', label: 'Cloud Sync' },
              ]}
              value={storageView}
              onChange={setStorageView}
              style={styles.segmented}
            />

            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>Categories</Text>
              <IconButton
                icon="add"
                size={32}
                iconSize={18}
                accessibilityLabel="Add category"
                onPress={() => router.push('/category/new')}
              />
            </View>
            <View style={styles.tiles}>
              {tileRows.map((row, index) => (
                <View key={index} style={styles.tileRow}>
                  {row.map((category) => (
                    <CategoryTile
                      key={category.id}
                      name={category.name}
                      count={counts.get(category.id) ?? 0}
                      color={category.color}
                      pattern={category.pattern}
                      active={selectedCategory === category.id}
                      onPress={() =>
                        setSelectedCategory((current) => (current === category.id ? null : category.id))
                      }
                    />
                  ))}
                  {row.length === 1 ? <View style={styles.tileSpacer} /> : null}
                </View>
              ))}
            </View>

            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder="Search vault"
              containerStyle={styles.search}
            />

            <Text style={styles.sectionLabel}>All items</Text>
          </View>
        }
        ListEmptyComponent={
          loaded && items.length === 0 ? (
            <EmptyState
              icon="lock-closed-outline"
              title="Your vault is empty"
              message="Save your first login, or explore with clearly-labelled demo data."
              action={
                <View style={styles.emptyActions}>
                  <Button label="Add login" icon="add" onPress={() => router.push('/item/editor')} />
                  <View style={styles.gap} />
                  <Button
                    label="Load demo data"
                    variant="secondary"
                    icon="flask-outline"
                    loading={seeding}
                    onPress={seedDemo}
                  />
                </View>
              }
            />
          ) : loaded ? (
            <EmptyState icon="search-outline" title="No matches" message="Try a different search or filter." />
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: theme.spacing.lg },
  header: { paddingTop: theme.spacing.md },
  list: { paddingBottom: theme.spacing.xxxl, gap: theme.spacing.sm },
  segmented: { marginBottom: theme.spacing.lg },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  sectionLabel: {
    ...theme.typography.label,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tiles: { gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  tileRow: { flexDirection: 'row', gap: theme.spacing.sm },
  tileSpacer: { flex: 1 },
  search: { marginBottom: theme.spacing.lg },
  emptyActions: { width: '100%' },
  gap: { height: theme.spacing.sm },
});
