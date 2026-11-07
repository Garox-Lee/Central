import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText as Text } from '@/components/app-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';

export type LegalSection = { heading: string; body: string[] };

type Props = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

export default function LegalPage({ title, updated, intro, sections }: Props) {
  const colors = useTheme();
  const { textScale, stacked, iconScale } = useAdaptiveLayout();

  // narrow or large-text screens get slightly tighter side padding so lines aren't a few words wide
  const horizontalPadding = stacked ? 16 : 24;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { paddingHorizontal: horizontalPadding }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20 * iconScale} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={styles.updated}>Last updated {updated}</Text>
          <Text style={[styles.body, { color: colors.text }]}>{intro}</Text>

          {sections.map((section, i) => (
            <View key={section.heading}>
              <Text style={styles.sectionHeader}>{i + 1}. {section.heading}</Text>
              {section.body.map((paragraph, j) => (
                <Text key={j} style={[styles.body, { color: colors.text }]}>{paragraph}</Text>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { paddingTop: 25, paddingBottom: 48 },
  backButton: { alignSelf: 'flex-start' },
  title: { fontSize: 22, fontFamily: 'Courier', fontWeight: '700', marginTop: 30 },
  updated: { fontSize: 13, fontFamily: 'Courier', color: '#888', marginTop: 4, marginBottom: 20 },
  sectionHeader: { fontSize: 12, fontFamily: 'Courier', fontWeight: '700', color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginTop: 24, marginBottom: 8 },
  body: { fontSize: 14, fontFamily: 'Courier', lineHeight: 21, marginBottom: 10 },
});