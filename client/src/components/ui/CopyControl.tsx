import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { IconButton } from '@/components/ui/IconButton';
import { toast } from '@/components/ui/toast.store';
import { theme } from '@/theme/theme';

export type CopyControlProps = {
  /** The exact value to copy. Never logged. */
  value: string;
  /** Human label used in feedback, e.g. "Password". */
  label: string;
  size?: number;
};

/**
 * Copy button. Copies the value to the clipboard and confirms with a toast.
 * The secret itself is never written to logs or analytics.
 */
export function CopyControl({ value, label, size = 36 }: CopyControlProps) {
  const copy = async () => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    if (process.env.EXPO_OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    toast(`${label} copied`, 'success');
  };

  return (
    <IconButton
      icon="copy-outline"
      variant="ghost"
      size={size}
      iconSize={18}
      iconColor={theme.colors.accent}
      accessibilityLabel={`Copy ${label}`}
      onPress={copy}
    />
  );
}
