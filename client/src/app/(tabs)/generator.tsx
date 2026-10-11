import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { Pill } from '@/components/ui/Pill';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { toast } from '@/components/ui/toast.store';
import {
  DEFAULT_PASSWORD_OPTIONS,
  DEFAULT_PASSPHRASE_OPTIONS,
  PasswordOptions,
  PassphraseOptions,
  estimateEntropyBits,
  generatePassphrase,
  generatePassword,
  generatePin,
  passwordStrength,
} from '@/lib/items/generator';
import { theme } from '@/theme/theme';

type Mode = 'password' | 'passphrase' | 'pin';

export default function GeneratorScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('password');
  const [pwOpts, setPwOpts] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS);
  const [ppOpts, setPpOpts] = useState<PassphraseOptions>(DEFAULT_PASSPHRASE_OPTIONS);
  const [pinLength, setPinLength] = useState(6);
  const [seed, setSeed] = useState(0);

  const output = useMemo(() => {
    if (mode === 'password') return generatePassword(pwOpts);
    if (mode === 'passphrase') return generatePassphrase(ppOpts);
    return generatePin(pinLength);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pwOpts, ppOpts, pinLength, seed]);

  const strength = mode === 'pin' ? null : passwordStrength(output);
  const bits = estimateEntropyBits(output);

  const copy = async () => {
    await Clipboard.setStringAsync(output);
    if (process.env.EXPO_OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    toast('Copied to clipboard', 'success');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + theme.spacing.md }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Generator" subtitle="Strong, random secrets on demand" />

        <View style={styles.chips}>
          {(['password', 'passphrase', 'pin'] as Mode[]).map((m) => (
            <Pill
              key={m}
              label={m === 'password' ? 'Password' : m === 'passphrase' ? 'Passphrase' : 'PIN'}
              tone={mode === m ? 'brand' : 'neutral'}
              onPress={() => setMode(m)}
            />
          ))}
        </View>

        <Card style={styles.outputCard}>
          <Text style={styles.output} selectable>
            {output}
          </Text>
          {strength ? (
            <View style={styles.strengthRow}>
              <Pill label={strength.label} tone={strength.tone === 'brand' ? 'brand' : strength.tone} />
              <Text style={styles.bits}>~{bits} bits</Text>
            </View>
          ) : (
            <View style={styles.strengthRow}>
              <Pill label="PIN" tone="neutral" />
              <Text style={styles.bits}>{pinLength} digits</Text>
            </View>
          )}
        </Card>

        <View style={styles.actions}>
          <Button label="Copy" icon="copy-outline" fullWidth={false} style={styles.actionBtn} onPress={copy} />
          <Button
            label="Regenerate"
            variant="secondary"
            icon="refresh"
            fullWidth={false}
            style={styles.actionBtn}
            onPress={() => {
              if (process.env.EXPO_OS !== 'web') Haptics.impactAsync().catch(() => {});
              setSeed((s) => s + 1);
            }}
          />
        </View>

        <Divider label="Options" style={styles.divider} />

        {mode === 'password' ? (
          <Card style={styles.optionsCard}>
            <Stepper
              label="Length"
              value={pwOpts.length}
              min={4}
              max={64}
              onChange={(length) => setPwOpts((o) => ({ ...o, length }))}
            />
            <Toggle label="Lowercase (a-z)" value={pwOpts.lowercase} onChange={(v) => setPwOpts((o) => ({ ...o, lowercase: v }))} />
            <Toggle label="Uppercase (A-Z)" value={pwOpts.uppercase} onChange={(v) => setPwOpts((o) => ({ ...o, uppercase: v }))} />
            <Toggle label="Digits (0-9)" value={pwOpts.digits} onChange={(v) => setPwOpts((o) => ({ ...o, digits: v }))} />
            <Toggle label="Symbols (!@#$…)" value={pwOpts.symbols} onChange={(v) => setPwOpts((o) => ({ ...o, symbols: v }))} />
            <Toggle
              label="Exclude ambiguous (Il1O0o)"
              value={pwOpts.excludeAmbiguous}
              onChange={(v) => setPwOpts((o) => ({ ...o, excludeAmbiguous: v }))}
            />
          </Card>
        ) : null}

        {mode === 'passphrase' ? (
          <Card style={styles.optionsCard}>
            <Stepper label="Words" value={ppOpts.words} min={3} max={10} onChange={(words) => setPpOpts((o) => ({ ...o, words }))} />
            <Toggle label="Capitalize" value={ppOpts.capitalize} onChange={(v) => setPpOpts((o) => ({ ...o, capitalize: v }))} />
            <Toggle label="Append number" value={ppOpts.includeNumber} onChange={(v) => setPpOpts((o) => ({ ...o, includeNumber: v }))} />
          </Card>
        ) : null}

        {mode === 'pin' ? (
          <Card style={styles.optionsCard}>
            <Stepper label="Digits" value={pinLength} min={4} max={12} onChange={setPinLength} />
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.palette.indigo500, false: theme.colors.surfaceHigh }}
        thumbColor={theme.colors.text}
      />
    </View>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Button
          label=""
          variant="secondary"
          size="sm"
          fullWidth={false}
          icon="remove"
          onPress={() => onChange(Math.max(min, value - 1))}
        />
        <Text style={styles.stepperValue}>{value}</Text>
        <Button
          label=""
          variant="secondary"
          size="sm"
          fullWidth={false}
          icon="add"
          onPress={() => onChange(Math.min(max, value + 1))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl },
  chips: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  outputCard: { padding: theme.spacing.xl },
  output: {
    ...theme.typography.mono,
    fontSize: 17,
    lineHeight: 26,
    color: theme.colors.text,
    letterSpacing: 0.3,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  bits: { ...theme.typography.caption, color: theme.colors.textFaint },
  actions: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg },
  actionBtn: { flex: 1 },
  divider: { marginVertical: theme.spacing.xl },
  optionsCard: { gap: theme.spacing.lg, padding: theme.spacing.lg },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { ...theme.typography.body, color: theme.colors.textMuted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  stepperValue: { ...theme.typography.bodyStrong, color: theme.colors.text, minWidth: 28, textAlign: 'center' },
});