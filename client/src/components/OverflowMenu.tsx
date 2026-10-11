import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/theme/theme';

export type OverflowOption = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onSelect: () => void;
};

export type OverflowMenuProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: OverflowOption[];
};

/**
 * Bottom-sheet overflow menu (native Modal, no extra dependency).
 */
export function OverflowMenu({ visible, onClose, title, options }: OverflowMenuProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Dismiss menu" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + theme.spacing.lg }]}>
        <View style={styles.handle} />
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {options.map((option) => (
          <Pressable
            key={option.label}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            onPress={() => {
              onClose();
              option.onSelect();
            }}
            style={({ pressed }) => [styles.option, pressed ? styles.optionPressed : null]}
          >
            {option.icon ? (
              <Ionicons
                name={option.icon}
                size={19}
                color={option.destructive ? theme.colors.danger : theme.colors.textMuted}
              />
            ) : null}
            <Text style={[styles.optionLabel, option.destructive ? styles.optionDestructive : null]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={onClose}
          style={({ pressed }) => [styles.cancel, pressed ? styles.optionPressed : null]}
        >
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: theme.colors.overlay },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    alignSelf: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: { ...theme.typography.label, color: theme.colors.textFaint, marginBottom: theme.spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    minHeight: 52,
  },
  optionPressed: { opacity: 0.7 },
  optionLabel: { ...theme.typography.body, color: theme.colors.text },
  optionDestructive: { color: theme.colors.danger },
  cancel: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceHigh,
    borderRadius: theme.radius.md,
  },
  cancelLabel: { ...theme.typography.bodyStrong, color: theme.colors.text },
});
