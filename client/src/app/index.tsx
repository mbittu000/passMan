import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { theme } from '@/theme/theme';

/** Entry route. The root layout redirects once the session resolves. */
export default function Index() {
  return (
    <ScreenContainer>
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
