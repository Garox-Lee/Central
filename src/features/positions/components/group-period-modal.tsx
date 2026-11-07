import { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Minus, Plus, Calendar } from 'lucide-react-native';
import { formatDatetime } from '@/utils/datetime';
import SegmentedControl from '@/components/segmented-control';
import { Period, PeriodUnit } from '../types';

const UNITS: { key: PeriodUnit; label: string }[] = [
  { key: 'days', label: 'Days' },
  { key: 'months', label: 'Months' },
];

const QUICK_PICKS: Omit<Period, 'anchor'>[] = [
  { count: 1, unit: 'days' },
  { count: 7, unit: 'days' },
  { count: 1, unit: 'months' },
  { count: 3, unit: 'months' },
];

const MIN = 1;
const MAX = 365;

type Props = {
  visible: boolean;
  value: Period;
  onChange: (period: Period) => void;
  onClose: () => void;
};

export default function GroupPeriodModal({ visible, value, onChange, onClose }: Props) {
  const colors = useTheme();
  const dark = useColorScheme() === 'dark';
  const [showPicker, setShowPicker] = useState(false);

  const setCount = (count: number) => onChange({ ...value, count: Math.min(MAX, Math.max(MIN, count)) });
  const setAnchor = (anchor: Date) => onChange({ ...value, anchor });

  const handleClose = () => {
    setShowPicker(false);
    onClose();
  };

  const openAnchorPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: value.anchor,
        mode: 'date',
        onValueChange: (_, d) => {
          if (d) setAnchor(d);
        },
      });
      return;
    }
    setShowPicker((s) => !s);
  };

  const unitLabel = value.unit === 'days' ? 'day' : 'month';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {}}
        >
          <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: colors.text }]}>Group by every</Text>

            <View style={styles.stepper}>
              <TouchableOpacity
                onPress={() => setCount(value.count - 1)}
                disabled={value.count <= MIN}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Decrease"
                style={[styles.stepButton, { borderColor: colors.border, opacity: value.count <= MIN ? 0.4 : 1 }]}
              >
                <Minus size={18} color={colors.text} />
              </TouchableOpacity>

              <Text style={[styles.count, { color: colors.text }]}>{value.count}</Text>

              <TouchableOpacity
                onPress={() => setCount(value.count + 1)}
                disabled={value.count >= MAX}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Increase"
                style={[styles.stepButton, { borderColor: colors.border, opacity: value.count >= MAX ? 0.4 : 1 }]}
              >
                <Plus size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <SegmentedControl
              options={UNITS}
              value={value.unit}
              onChange={(unit) => onChange({ ...value, unit })}
            />

            <View style={styles.quickRow}>
              {QUICK_PICKS.map((p) => {
                const active = p.count === value.count && p.unit === value.unit;
                return (
                  <TouchableOpacity
                    key={`${p.count}-${p.unit}`}
                    onPress={() => onChange({ ...value, ...p })}
                    activeOpacity={0.7}
                    style={[
                      styles.quick,
                      { borderColor: active ? colors.primary : colors.border },
                      active && { backgroundColor: `${colors.primary}22` },
                    ]}
                  >
                    <Text style={[styles.quickText, { color: active ? colors.primary : colors.text }]}>
                      {p.count}{p.unit === 'days' ? 'd' : 'm'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.anchorBlock}>
              <Text style={[styles.label, { color: colors.text }]}>Starting from</Text>
              <TouchableOpacity
                onPress={openAnchorPicker}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Choose anchor date"
                style={[styles.anchorButton, { borderColor: colors.border }]}
              >
                <Calendar size={16} color={colors.text} />
                <Text style={[styles.anchorText, { color: colors.text }]}>
                  {formatDatetime(value.anchor, 'ddd, dd mmm yyyy')}
                </Text>
              </TouchableOpacity>
            </View>

            {Platform.OS === 'ios' && showPicker && (
              <DateTimePicker
                value={value.anchor}
                mode="date"
                display="inline"
                onValueChange={(_, d) => {
                  setAnchor(d);
                  setShowPicker(false);
                }}
                themeVariant={dark ? 'dark' : 'light'}
                accentColor={colors.primary}
              />
            )}

            <Text style={[styles.hint, { color: colors.text }]}>
              Groups run every {value.count} {unitLabel}
              {value.count === 1 ? '' : 's'} before and after this date.
            </Text>

            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.7}
              accessibilityRole="button"
              style={[styles.done, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, maxHeight: '90%', borderWidth: 1, borderRadius: 12 },
  cardContent: { padding: 16, gap: 14 },
  title: { fontSize: 14, fontFamily: 'Courier', fontWeight: '700' },

  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  stepButton: { width: 40, height: 40, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  count: { minWidth: 56, textAlign: 'center', fontSize: 28, fontFamily: 'Courier', fontWeight: '700' },

  quickRow: { flexDirection: 'row', gap: 8 },
  quick: { flex: 1, alignItems: 'center', paddingVertical: 6, borderWidth: 1, borderRadius: 8 },
  quickText: { fontSize: 12, fontFamily: 'Courier', fontWeight: '600' },

  anchorBlock: { gap: 6 },
  label: { fontSize: 12, fontFamily: 'Courier', fontWeight: '700' },
  anchorButton: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  anchorText: { fontSize: 14, fontFamily: 'Courier', fontWeight: '600' },
  hint: { fontSize: 11, fontFamily: 'Courier', opacity: 0.6 },

  done: { alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  doneText: { color: '#fff', fontSize: 14, fontFamily: 'Courier', fontWeight: '700' },
});