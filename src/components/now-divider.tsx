import { StyleSheet, View } from 'react-native';

import { Palette } from '@/constants/theme';

export function NowDivider() {
  return (
    <View style={styles.divider}>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { paddingVertical: 0.5 },
  line: { height: StyleSheet.hairlineWidth * 2, marginVertical: 3, backgroundColor: Palette.blue, opacity: 0.65 },
});