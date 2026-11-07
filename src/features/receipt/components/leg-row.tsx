import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';
import { formatDatetime } from '@/utils/datetime';
import { formatQty, qtyColor } from '@/utils/format-numbers';
import { FMT } from '../constants';
import { legDates } from '../utils/legs';
import type { Leg, LegDateField } from '../types';
import { Palette, TAP_SLOP } from '@/constants/theme';

function DateSegment({ emptyLabel, setLabel, date, onPress, onClear }: {
  emptyLabel: string;
  setLabel: string;
  date: Date | null;
  onPress: () => void;
  onClear: () => void;
}) {
  const colors = useTheme();
  return (
    <View style={styles.segment}>
      <TouchableOpacity
        style={[styles.segmentButton, { paddingHorizontal: date ? 8 : 24 }]}
        activeOpacity={0.7}
        onPress={onPress}
      >
        <Text
          style={[styles.segmentLabel, { color: date ? colors.text : colors.muted }]}
          numberOfLines={1}
        >
          {date ? `${setLabel}: ${formatDatetime(date, FMT.chip)}` : emptyLabel}
        </Text>
      </TouchableOpacity>
      {date && (
        <TouchableOpacity onPress={onClear} style={styles.segmentClear} hitSlop={TAP_SLOP}>
          <Text style={[styles.segmentClearText, { color: colors.danger }]}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function DateSegments({ leg, onPressDate, onClearDate }: {
  leg: Leg;
  onPressDate: (field: LegDateField) => void;
  onClearDate: (field: LegDateField) => void;
}) {
  const colors = useTheme();
  return (
    <View style={[styles.segments, { borderColor: colors.border }]}>
      <DateSegment
        emptyLabel="Settle"
        setLabel="Settles"
        date={leg.settlementDatetime}
        onPress={() => onPressDate('settlement')}
        onClear={() => onClearDate('settlement')}
      />
      <View style={[styles.dividerV, { backgroundColor: colors.border }]} />
      <DateSegment
        emptyLabel="Expiry"
        setLabel="Expires"
        date={leg.expiryDatetime}
        onPress={() => onPressDate('expiry')}
        onClear={() => onClearDate('expiry')}
      />
    </View>
  );
}

function ExcludeToggle({ excluded, onToggle }: {
  excluded: boolean;
  onToggle: () => void;
}) {
  const colors = useTheme();
  return (
    <TouchableOpacity
      style={[styles.excludeToggle, { borderColor: excluded ? Palette.amber : colors.border }]}
      activeOpacity={0.7}
      onPress={onToggle}
      hitSlop={TAP_SLOP}
    >
      <Text style={[styles.excludeToggleText, { color: excluded ? Palette.amber : colors.text }]}>
        {excluded ? 'Excluded' : 'Included'}
      </Text>
    </TouchableOpacity>
  );
}

type LegRowProps = {
  leg: Leg;
  editable: boolean;
  qtyText: string | undefined;
  pickerField: LegDateField | null;
  onFocus: () => void;
  onInstrument: (value: string) => void;
  onQuantity: (text: string) => void;
  onPressDate: (field: LegDateField) => void;
  onClearDate: (field: LegDateField) => void;
  onPickerChange: (field: LegDateField, date: Date) => void;
  onToggleExcluded: () => void;
};

export function LegRow(p: LegRowProps) {
  const { leg } = p;
  const colors = useTheme();
  const dark = useColorScheme() === 'dark';
  const { textScale } = useAdaptiveLayout();

  if (!p.editable) {
    const dates = legDates(leg);
    return (
      <View>
        <View style={styles.row}>
          <Text style={[styles.legName, { color: colors.text }]}>{leg.instrument}</Text>
          <Text style={[styles.legQty, { color: qtyColor(leg.quantity, colors) }]}>{formatQty(leg)}</Text>
        </View>
        {(leg.isExcluded || dates !== '') && (
          <View style={styles.metaRow}>
            {leg.isExcluded && <Text style={[styles.excludedLabel, { color: Palette.amber }]}>Excluded</Text>}
            {dates !== '' && <Text style={[styles.legDate, { color: colors.muted }]}>{dates}</Text>}
          </View>
        )}
      </View>
    );
  }

  return (
    <View>
      <View style={styles.row}>
        <BottomSheetTextInput
          style={[styles.legName, styles.legInput, { color: colors.text }]}
          value={leg.instrument}
          onChangeText={p.onInstrument}
          onFocus={p.onFocus}
          placeholder="Instrument"
          placeholderTextColor={colors.muted}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
        />
        <BottomSheetTextInput
          style={[styles.legQty, styles.legQtyInput, { color: qtyColor(leg.quantity, colors), width: 70 * textScale }]}
          value={p.qtyText ?? (leg.quantity === 0 ? '' : String(leg.quantity))}
          onChangeText={p.onQuantity}
          onFocus={p.onFocus}
          placeholder="Qty"
          placeholderTextColor={colors.muted}
          keyboardType="numbers-and-punctuation"
          returnKeyType="done"
        />
      </View>
      
      <View style={styles.controlsRow}>
        <ExcludeToggle excluded={leg.isExcluded} onToggle={p.onToggleExcluded} />
        <DateSegments
          leg={leg}
          onPressDate={p.onPressDate}
          onClearDate={p.onClearDate}
        />
      </View>

      {Platform.OS === 'ios' && p.pickerField && (
        <DateTimePicker
          value={(p.pickerField === 'settlement' ? leg.settlementDatetime : leg.expiryDatetime) ?? new Date()}
          mode="datetime"
          display="inline"
          onValueChange={(_, d) => p.onPickerChange(p.pickerField!, d)}
          themeVariant={dark ? 'dark' : 'light'}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legName: { flex: 1, marginRight: 12, fontSize: 14, fontFamily: 'Courier' },
  legQty: { fontSize: 14, fontFamily: 'Courier', fontWeight: '600', flexShrink: 0 },
  legInput: { padding: 0 },
  legQtyInput: { padding: 0, textAlign: 'right' }, // width set inline with textScale
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 6 },
  segments: { flexDirection: 'row', borderWidth: 1, borderRadius: 6, overflow: 'hidden', flexShrink: 1 },
  segment: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  segmentButton: { paddingVertical: 4, flexShrink: 1 },
  segmentClear: { paddingRight: 6 },
  segmentLabel: { fontSize: 11, fontFamily: 'Courier' },
  segmentValue: { fontSize: 11, fontFamily: 'Courier', marginTop: 1 },
  segmentClearText: { fontSize: 14, fontFamily: 'Courier' },
  dividerV: { width: 1, alignSelf: 'stretch' },
  dividerH: { height: 1, alignSelf: 'stretch' },
  excludeToggle: { borderWidth: 1, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 12, flexShrink: 0 },
  excludeToggleText: { fontSize: 11, fontFamily: 'Courier' },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', columnGap: 12, marginTop: 2 },
  excludedLabel: { fontSize: 12, fontFamily: 'Courier', flexShrink: 0 },
  legDate: { fontSize: 12, fontFamily: 'Courier', flexShrink: 1, marginLeft: 'auto', textAlign: 'right' },
});
