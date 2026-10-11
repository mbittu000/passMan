import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { GroupCard } from '@/components/ui/GroupCard';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { toast } from '@/components/ui/toast.store';
import { useCategories } from '@/lib/categories/store';
import { CategoryPattern } from '@/lib/items/types';
import { theme } from '@/theme/theme';

const SWATCHES = ['#a6fff2', '#5ac8fa', '#30d158', '#ffcc27', '#ff453a', '#c7c7cc'] as const;

const PATTERNS: { value: CategoryPattern; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'rings', label: 'Rings', icon: 'ellipse-outline' },
  { value: 'grid', label: 'Grid', icon: 'grid-outline' },
  { value: 'waves', label: 'Waves', icon: 'reorder-three-outline' },
];

export default function NewCategoryScreen() {
  const router = useRouter();
  const add = useCategories((s) => s.add);

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(SWATCHES[0]);
  const [pattern, setPattern] = useState<CategoryPattern>('rings');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Give the category a name');
      return;
    }
    setSaving(true);
    try {
      await add(name, { color, pattern });
      toast(`Category “${name.trim()}” added`, 'success');
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add category');
    } finally {
      setSaving(false);
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
          <View style={styles.topBar}>
            <Button label="Cancel" variant="ghost" fullWidth={false} onPress={() => router.back()} />
            <Text style={styles.title}>New category</Text>
            <Button label="Save" size="sm" fullWidth={false} loading={saving} onPress={save} />
          </View>

          <GroupCard style={styles.card}>
            <Field
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Finance"
              autoFocus
              error={error}
              onSubmitEditing={save}
              returnKeyType="done"
            />
          </GroupCard>

          <Text style={styles.sectionLabel}>Color</Text>
          <View style={styles.swatches}>
            {SWATCHES.map((swatch) => {
              const active = swatch === color;
              return (
                <Pressable
                  key={swatch}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Color ${swatch}`}
                  onPress={() => setColor(swatch)}
                  hitSlop={6}
                  style={[
                    styles.swatch,
                    { backgroundColor: `${swatch}26`, borderColor: active ? swatch : theme.colors.border },
                  ]}
                >
                  <View style={[styles.swatchDot, { backgroundColor: swatch }]} />
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Pattern</Text>
          <View style={styles.patterns}>
            {PATTERNS.map((option) => {
              const active = option.value === pattern;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={option.label}
                  onPress={() => setPattern(option.value)}
                  style={[styles.pattern, active ? styles.patternActive : null]}
                >
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={active ? theme.colors.accent : theme.colors.textFaint}
                  />
                  <Text style={[styles.patternLabel, active ? styles.patternLabelActive : null]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  title: { ...theme.typography.heading, color: theme.colors.text },
  card: { marginBottom: theme.spacing.lg },
  sectionLabel: {
    ...theme.typography.label,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  swatches: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchDot: { width: 18, height: 18, borderRadius: 9 },
  patterns: { flexDirection: 'row', gap: theme.spacing.sm },
  pattern: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  patternActive: { borderColor: theme.colors.accent },
  patternLabel: { ...theme.typography.caption, color: theme.colors.textMuted },
  patternLabelActive: { color: theme.colors.text },
});
