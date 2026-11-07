import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import AnimatedCentralLogo from './animated-central-logo';

export default function LoadingScreen() {
  const colors = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AnimatedCentralLogo size={5} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});