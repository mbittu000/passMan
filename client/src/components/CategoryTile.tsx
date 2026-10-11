import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

import { theme } from '@/theme/theme';

export type CategoryPattern = 'rings' | 'grid' | 'waves';

export type CategoryTileProps = {
  name: string;
  count: number;
  /** Hex base color for the tile pattern + active ring. */
  color: string;
  pattern?: CategoryPattern;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

/**
 * Category tile with an abstract digital-pattern graphic (pure RN Views —
 * no extra dependency) and an item count.
 */
export function CategoryTile({ name, count, color, pattern = 'rings', active = false, onPress, style }: CategoryTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${count} items`}
      accessibilityState={{ selected: active }}
      onPress={() => {
        if (process.env.EXPO_OS !== 'web') {
          Haptics.selectionAsync().catch(() => {});
        }
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.tile,
        active ? { ...styles.tileActive, borderColor: `${color}99` } : null,
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      <View style={styles.pattern} pointerEvents="none">
        {pattern === 'rings' ? <Rings color={color} /> : null}
        {pattern === 'grid' ? <Grid color={color} /> : null}
        {pattern === 'waves' ? <Waves color={color} /> : null}
      </View>
      <View style={styles.footer}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.count}>
          {count} item{count === 1 ? '' : 's'}
        </Text>
      </View>
    </Pressable>
  );
}

function Rings({ color }: { color: string }) {
  return (
    <View style={styles.ringsWrap}>
      {[76, 56, 36].map((size) => (
        <View
          key={size}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1.5,
            borderColor: `${color}55`,
            right: -76 / 2 + (76 - size) / 2,
            top: -76 / 2 + (76 - size) / 2,
          }}
        />
      ))}
      <View style={[styles.ringsDot, { backgroundColor: color }]} />
    </View>
  );
}

function Grid({ color }: { color: string }) {
  return (
    <View style={styles.gridWrap}>
      {Array.from({ length: 9 }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i % 4 === 0 ? color : `${color}44`,
          }}
        />
      ))}
    </View>
  );
}

function Waves({ color }: { color: string }) {
  return (
    <View style={styles.wavesWrap}>
      {[52, 40, 28].map((width, i) => (
        <View
          key={width}
          style={{
            width,
            height: 5,
            borderRadius: 3,
            backgroundColor: i === 0 ? color : `${color}44`,
            alignSelf: 'flex-end',
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 108,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  tileActive: { borderWidth: 1.5 },
  pressed: { opacity: 0.8 },
  pattern: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 96,
    height: 80,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  footer: { gap: 2 },
  name: { ...theme.typography.bodyStrong, color: theme.colors.text },
  count: { ...theme.typography.caption, color: theme.colors.textFaint },
  ringsWrap: { width: 96, height: 80 },
  ringsDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    right: 22,
    top: 20,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    width: 40,
    marginTop: 12,
    marginRight: 12,
  },
  wavesWrap: { gap: 6, marginTop: 14, marginRight: 12, alignItems: 'flex-end' },
});
