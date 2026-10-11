import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { GroupCard } from '@/components/ui/GroupCard';
import { IconBadge } from '@/components/ui/IconBadge';
import { IconButton } from '@/components/ui/IconButton';
import { PasswordField } from '@/components/ui/PasswordField';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Toggle } from '@/components/ui/Toggle';
import { toast } from '@/components/ui/toast.store';
import { useCategories } from '@/lib/categories/store';
import { generatePassword, DEFAULT_PASSWORD_OPTIONS } from '@/lib/items/generator';
import {
  CustomField,
  emptyPayload,
  FieldDef,
  ITEM_TYPE_ORDER,
  ItemType,
  templateFor,
  TypeTemplate,
} from '@/lib/items/types';
import { useVault } from '@/lib/store/vault';
import { useSession } from '@/lib/store/session';
import { normalizeWebsiteUrl, VaultRepository } from '@/lib/vault/repository';
import { theme } from '@/theme/theme';

type StorageChoice = 'device' | 'cloud';

const VALID_TYPES = new Set<ItemType>(ITEM_TYPE_ORDER);

export default function ItemEditorScreen() {
  const { id, type: typeParam } = useLocalSearchParams<{ id?: string; type?: string }>();
  const router = useRouter();
  const items = useVault((s) => s.items);
  const createItem = useVault((s) => s.createItem);
  const updateItem = useVault((s) => s.updateItem);
  const vaultKey = useSession((s) => s.vaultKey);
  const categories = useCategories((s) => s.categories);
  const loadCategories = useCategories((s) => s.load);

  const existing = useMemo(() => items.find((i) => i.id === id), [items, id]);
  const isEdit = Boolean(existing);

  const initialType: ItemType =
    existing?.payload.type ?? (typeParam && VALID_TYPES.has(typeParam as ItemType) ? (typeParam as ItemType) : 'password');

  const [type, setType] = useState<ItemType>(initialType);
  const [showTypes, setShowTypes] = useState(false);
  const [title, setTitle] = useState(existing?.payload.title ?? '');
  const [notes, setNotes] = useState(existing?.payload.notes ?? '');
  const [fields, setFields] = useState<Record<string, string>>(
    existing?.payload.fields ?? emptyPayload(initialType).fields,
  );
  const [custom, setCustom] = useState<CustomField[]>(existing?.payload.custom ?? []);
  const [tags, setTags] = useState((existing?.payload.tags ?? []).join(', '));

  // Login-specific state (Keychain "New login" layout).
  const [username, setUsername] = useState(existing?.payload.fields.username ?? '');
  const [password, setPassword] = useState(
    existing?.payload.fields[existing?.payload.type === 'password' ? 'password' : ''] ?? '',
  );
  const [website, setWebsite] = useState(existing?.payload.fields.url ?? '');
  const [linked, setLinked] = useState<string[]>(existing?.payload.linkedWebsites ?? []);
  const [storage, setStorage] = useState<StorageChoice>(
    (existing?.payload.storage ?? 'cloud') === 'local' ? 'device' : 'cloud',
  );
  const [categoryId, setCategoryId] = useState<string | undefined>(existing?.payload.categoryId);
  const [showCategories, setShowCategories] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [linkedError, setLinkedError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const tpl: TypeTemplate = useMemo(() => templateFor(type), [type]);
  const isLogin = type === 'password';

  useEffect(() => {
    if (vaultKey) void loadCategories();
  }, [vaultKey, loadCategories]);

  useFocusEffect(
    useCallback(() => {
      if (vaultKey) void loadCategories();
    }, [vaultKey, loadCategories]),
  );

  const changeType = (next: ItemType) => {
    setType(next);
    setShowTypes(false);
    if (!isEdit) {
      setFields(emptyPayload(next).fields);
    } else {
      setFields((prev) => {
        const base = emptyPayload(next).fields;
        for (const key of Object.keys(base)) base[key] = prev[key] ?? '';
        return base;
      });
    }
  };

  const setField = (key: string, value: string) => setFields((prev) => ({ ...prev, [key]: value }));

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/vault');
  };

  const saveLogin = async () => {
    if (!vaultKey) {
      toast('Vault is locked', 'danger');
      return;
    }
    setUsernameError(null);
    setPasswordError(null);
    setWebsiteError(null);
    setLinkedError(null);

    if (!username.trim()) {
      setUsernameError('Enter an email or username');
      return;
    }
    if (!password) {
      setPasswordError('Enter a password');
      return;
    }
    let normalizedWebsite = '';
    if (website.trim()) {
      const parsed = normalizeWebsiteUrl(website);
      if (!parsed) {
        setWebsiteError('Enter a valid website, e.g. example.com');
        return;
      }
      normalizedWebsite = parsed;
    }
    const normalizedLinked: string[] = [];
    for (const raw of linked) {
      if (!raw.trim()) continue;
      const parsed = normalizeWebsiteUrl(raw);
      if (!parsed) {
        setLinkedError(`“${raw.trim()}” is not a valid website`);
        return;
      }
      if (parsed !== normalizedWebsite && !normalizedLinked.includes(parsed)) normalizedLinked.push(parsed);
    }

    const derivedTitle = title.trim() || titleFromWebsite(normalizedWebsite, username.trim());
    setSaving(true);
    try {
      if (isEdit && existing) {
        await VaultRepository.updateLogin(existing.id, {
          title: derivedTitle,
          username: username.trim(),
          password,
          website: normalizedWebsite,
          linkedWebsites: normalizedLinked,
          categoryId,
          storage: storage === 'device' ? 'local' : 'cloud',
          syncAllDevices: storage === 'cloud',
          notes,
        });
        toast('Login updated', 'success');
        goBack();
      } else {
        const newId = await VaultRepository.createLogin({
          title: derivedTitle,
          username: username.trim(),
          password,
          website: normalizedWebsite,
          linkedWebsites: normalizedLinked,
          categoryId,
          storage: storage === 'device' ? 'local' : 'cloud',
          syncAllDevices: storage === 'cloud',
          notes: notes.trim() || undefined,
        });
        toast('Login saved', 'success');
        router.replace(`/item/${newId}`);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save login', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const saveGeneric = async () => {
    if (!vaultKey) {
      toast('Vault is locked', 'danger');
      return;
    }
    const trimmedTitle = title.trim() || tpl.label;
    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = {
      type,
      title: trimmedTitle,
      notes: notes.trim() || undefined,
      favorite: existing?.payload.favorite ?? false,
      tags: tagList,
      fields,
      custom: custom.filter((c) => c.label.trim()),
    };
    setSaving(true);
    try {
      if (isEdit && existing) {
        await updateItem(existing.id, payload);
        toast('Item updated', 'success');
      } else {
        await createItem(type, payload);
        toast('Item saved', 'success');
      }
      goBack();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save item', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const addCustom = () => {
    setCustom((prev) => [...prev, { id: String(Date.now()), label: '', value: '', secret: false }]);
  };

  const updateCustom = (cid: string, patch: Partial<CustomField>) => {
    setCustom((prev) => prev.map((c) => (c.id === cid ? { ...c, ...patch } : c)));
  };

  const removeCustom = (cid: string) => setCustom((prev) => prev.filter((c) => c.id !== cid));

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <ScreenContainer bottom={false}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <IconButton icon="chevron-back" accessibilityLabel="Back" onPress={goBack} />
            <Text style={styles.topTitle}>{isEdit ? (isLogin ? 'Edit login' : 'Edit item') : 'New login'}</Text>
            <Button
              label={isEdit ? 'Save' : 'Save'}
              size="sm"
              fullWidth={false}
              loading={saving}
              onPress={isLogin ? saveLogin : saveGeneric}
            />
          </View>

          {isLogin ? (
            <>
              <GroupCard style={styles.card}>
                <Field
                  label="Email or username"
                  value={username}
                  onChangeText={(v) => {
                    setUsername(v);
                    setUsernameError(null);
                  }}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  error={usernameError}
                  containerStyle={styles.flushField}
                />
                <PasswordField
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setPasswordError(null);
                  }}
                  onGenerate={() => setPassword(generatePassword(DEFAULT_PASSWORD_OPTIONS))}
                  showStrength
                  placeholder="••••••••"
                  error={passwordError}
                  containerStyle={styles.flushField}
                />
                <Field
                  label="Website"
                  value={website}
                  onChangeText={(v) => {
                    setWebsite(v);
                    setWebsiteError(null);
                  }}
                  placeholder="example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  error={websiteError}
                  containerStyle={styles.flushField}
                />
                {linked.map((url, index) => (
                  <View key={index} style={styles.linkedRow}>
                    <View style={styles.linkedField}>
                      <Field
                        label={`Linked website ${index + 1}`}
                        value={url}
                        onChangeText={(v) => {
                          setLinked((prev) => prev.map((u, i) => (i === index ? v : u)));
                          setLinkedError(null);
                        }}
                        placeholder="example.com"
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                        containerStyle={styles.noMargin}
                      />
                    </View>
                    <IconButton
                      icon="trash-outline"
                      variant="danger"
                      size={40}
                      iconSize={18}
                      accessibilityLabel="Remove linked website"
                      onPress={() => setLinked((prev) => prev.filter((_, i) => i !== index))}
                      style={styles.linkedRemove}
                    />
                  </View>
                ))}
                {linkedError ? <Text style={styles.linkedError}>{linkedError}</Text> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add linked website"
                  onPress={() => setLinked((prev) => [...prev, ''])}
                  style={({ pressed }) => [styles.addLink, pressed ? styles.pressed : null]}
                >
                  <Ionicons name="add" size={18} color={theme.colors.accent} />
                  <Text style={styles.addLinkLabel}>Add linked website</Text>
                </Pressable>
              </GroupCard>

              <Text style={styles.sectionLabel}>Storage &amp; Access</Text>
              <GroupCard style={styles.card}>
                <View style={styles.storageBlock}>
                  <SegmentedControl<StorageChoice>
                    accessibilityLabel="Storage"
                    options={[
                      { value: 'device', label: 'This device' },
                      { value: 'cloud', label: 'Cloud Sync' },
                    ]}
                    value={storage}
                    onChange={setStorage}
                  />
                  <Text style={styles.storageHint}>
                    {storage === 'device'
                      ? 'Stays encrypted on this device only.'
                      : 'Syncs encrypted to all your devices.'}
                  </Text>
                </View>
                <SettingsRow
                  icon="sync-outline"
                  iconTone="mint"
                  title="Available on all devices"
                  subtitle={storage === 'cloud' ? 'On' : 'Off'}
                  right={
                    <Toggle
                      value={storage === 'cloud'}
                      accessibilityLabel="Available on all devices"
                      onValueChange={(value) => setStorage(value ? 'cloud' : 'device')}
                    />
                  }
                />
                <SettingsRow
                  icon="folder-outline"
                  iconTone="gray"
                  title="Category"
                  subtitle={selectedCategory ? selectedCategory.name : 'None'}
                  chevron={!showCategories}
                  onPress={() => setShowCategories((v) => !v)}
                />
                {showCategories ? (
                  <View style={styles.categoryList}>
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ selected: !categoryId }}
                      onPress={() => {
                        setCategoryId(undefined);
                        setShowCategories(false);
                      }}
                      style={({ pressed }) => [styles.categoryOption, pressed ? styles.pressed : null]}
                    >
                      <Text style={styles.categoryName}>None</Text>
                      {!categoryId ? (
                        <Ionicons name="checkmark" size={18} color={theme.colors.accent} />
                      ) : null}
                    </Pressable>
                    {categories.map((category) => {
                      const active = category.id === categoryId;
                      return (
                        <Pressable
                          key={category.id}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: active }}
                          accessibilityLabel={category.name}
                          onPress={() => {
                            setCategoryId(category.id);
                            setShowCategories(false);
                          }}
                          style={({ pressed }) => [styles.categoryOption, pressed ? styles.pressed : null]}
                        >
                          <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                          <Text style={styles.categoryName}>{category.name}</Text>
                          {active ? (
                            <Ionicons name="checkmark" size={18} color={theme.colors.accent} />
                          ) : null}
                        </Pressable>
                      );
                    })}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="New category"
                      onPress={() => router.push('/category/new')}
                      style={({ pressed }) => [styles.categoryOption, pressed ? styles.pressed : null]}
                    >
                      <Ionicons name="add" size={18} color={theme.colors.accent} />
                      <Text style={styles.addCategoryLabel}>New category…</Text>
                    </Pressable>
                  </View>
                ) : null}
              </GroupCard>

              {isEdit ? (
                <>
                  <Text style={styles.sectionLabel}>Notes</Text>
                  <GroupCard style={styles.card}>
                    <Field
                      label="Notes"
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Anything worth remembering…"
                      multiline
                      numberOfLines={4}
                    />
                  </GroupCard>
                </>
              ) : null}

              {!isEdit ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="More item types"
                  onPress={() => setShowTypes((v) => !v)}
                  style={styles.moreTypes}
                >
                  <Text style={styles.moreTypesLabel}>
                    {showTypes ? 'Hide other item types' : 'Other item types (API keys, cards, SSH keys…)'}
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : null}

          {(!isLogin || showTypes) && !isEdit ? (
            <View style={styles.typeGrid}>
              {ITEM_TYPE_ORDER.map((t) => {
                const option = templateFor(t);
                const active = t === type;
                return (
                  <Pressable
                    key={t}
                    onPress={() => changeType(t)}
                    style={[styles.typeItem, active ? styles.typeItemActive : null]}
                  >
                    <IconBadge name={option.icon} tone={active ? 'brand' : 'neutral'} size={40} />
                    <Text style={[styles.typeLabel, active ? styles.typeLabelActive : null]} numberOfLines={1}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {(!isLogin || (showTypes && !isEdit)) && (
            <Text style={styles.sectionLabel}>{tpl.label} details</Text>
          )}
          {!isLogin ? (
            <>
              <View style={styles.editTypeRow}>
                <IconBadge name={tpl.icon} tone={tpl.tone} size={40} />
                <Text style={styles.editTypeLabel}>{tpl.label}</Text>
              </View>
              <Card style={styles.card}>
                <Field label="Title" value={title} onChangeText={setTitle} placeholder={tpl.label} />
                {tpl.fields.map((f: FieldDef) => (
                  <View key={f.key}>
                    <Field
                      label={f.label}
                      value={fields[f.key] ?? ''}
                      onChangeText={(v) => setField(f.key, v)}
                      placeholder={f.placeholder}
                      secureToggle={f.kind === 'secret' || f.kind === 'password'}
                      multiline={f.kind === 'multiline'}
                      numberOfLines={f.kind === 'multiline' ? 4 : 1}
                      autoCapitalize={f.kind === 'username' || f.kind === 'text' ? 'none' : 'sentences'}
                      keyboardType={f.kind === 'number' ? 'number-pad' : f.kind === 'url' ? 'url' : 'default'}
                      right={
                        f.kind === 'password' ? (
                          <Pressable
                            hitSlop={10}
                            accessibilityLabel="Generate password"
                            onPress={() => setField(f.key, generatePassword(DEFAULT_PASSWORD_OPTIONS))}
                          >
                            <Ionicons name="refresh-outline" size={18} color={theme.colors.accent} />
                          </Pressable>
                        ) : undefined
                      }
                      hint={f.optional ? 'Optional' : undefined}
                    />
                  </View>
                ))}
              </Card>

              <Text style={styles.sectionLabel}>Custom fields</Text>
              <Card style={styles.card}>
                {custom.map((c) => (
                  <View key={c.id} style={styles.customRow}>
                    <View style={styles.customInputs}>
                      <Field
                        label="Label"
                        value={c.label}
                        onChangeText={(v) => updateCustom(c.id, { label: v })}
                        placeholder="e.g. Recovery email"
                        containerStyle={styles.customField}
                      />
                      <Field
                        label="Value"
                        value={c.value}
                        onChangeText={(v) => updateCustom(c.id, { value: v })}
                        placeholder="Value"
                        secureToggle={c.secret}
                        containerStyle={styles.customField}
                      />
                    </View>
                    <View style={styles.customActions}>
                      <Pressable
                        hitSlop={8}
                        onPress={() => updateCustom(c.id, { secret: !c.secret })}
                        accessibilityLabel="Toggle secret"
                      >
                        <Ionicons
                          name={c.secret ? 'lock-closed-outline' : 'lock-open-outline'}
                          size={18}
                          color={theme.colors.textFaint}
                        />
                      </Pressable>
                      <Pressable hitSlop={8} onPress={() => removeCustom(c.id)} accessibilityLabel="Remove field">
                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                ))}
                <Button label="Add custom field" variant="secondary" icon="add" onPress={addCustom} />
              </Card>

              <Card style={styles.card}>
                <Field
                  label="Tags"
                  value={tags}
                  onChangeText={setTags}
                  placeholder="work, personal, prod"
                  hint="Comma separated"
                />
                <Field
                  label="Notes"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Anything else worth remembering…"
                  multiline
                  numberOfLines={4}
                />
              </Card>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function titleFromWebsite(website: string, fallback: string): string {
  try {
    const host = new URL(website).hostname.replace(/^www\./i, '');
    const first = host.split('.')[0];
    if (first) return first.charAt(0).toUpperCase() + first.slice(1);
  } catch {
    // Fall through to the fallback below.
  }
  return fallback;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  topTitle: { ...theme.typography.heading, color: theme.colors.text },
  card: { marginBottom: theme.spacing.lg },
  flushField: { marginBottom: theme.spacing.sm },
  sectionLabel: {
    ...theme.typography.label,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  linkedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  linkedField: { flex: 1 },
  noMargin: { marginBottom: 0 },
  linkedRemove: { marginTop: 26 },
  linkedError: { ...theme.typography.caption, color: theme.colors.danger, marginTop: theme.spacing.xs },
  addLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  addLinkLabel: { ...theme.typography.bodyStrong, color: theme.colors.accent },
  pressed: { opacity: 0.7 },
  storageBlock: { paddingVertical: theme.spacing.sm },
  storageHint: { ...theme.typography.caption, color: theme.colors.textFaint, marginTop: theme.spacing.sm },
  categoryList: { paddingBottom: theme.spacing.sm },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { ...theme.typography.body, color: theme.colors.text, flex: 1 },
  addCategoryLabel: { ...theme.typography.bodyStrong, color: theme.colors.accent },
  moreTypes: { alignItems: 'center', paddingVertical: theme.spacing.md },
  moreTypesLabel: { ...theme.typography.caption, color: theme.colors.textFaint },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  typeItem: {
    width: '31.5%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  typeItemActive: { borderColor: theme.colors.accent, backgroundColor: 'rgba(166,255,242,0.08)' },
  typeLabel: { ...theme.typography.caption, color: theme.colors.textMuted },
  typeLabelActive: { color: theme.colors.text },
  editTypeRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  editTypeLabel: { ...theme.typography.heading, color: theme.colors.text },
  customRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, marginBottom: theme.spacing.sm },
  customInputs: { flex: 1, flexDirection: 'row', gap: theme.spacing.sm },
  customField: { flex: 1, marginBottom: 0 },
  customActions: { flexDirection: 'row', gap: theme.spacing.md, paddingTop: 28 },
});
