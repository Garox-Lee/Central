import { StyleSheet, Text, View } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';

import { useTheme } from '@/hooks/use-theme';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';

type NoteFieldProps = {
  label: string;
  editable: boolean;
  value: string;
  savedValue?: string | null;
  placeholder: string;
  onChange: (text: string) => void;
  onFocus: () => void;
};

export function NoteField({ label, editable, value, savedValue, placeholder, onChange, onFocus }: NoteFieldProps) {
  const colors = useTheme();
  const { stacked } = useAdaptiveLayout();

  return (
    <View style={stacked ? styles.notesRowStacked : styles.row}>
      <Text style={[styles.statusText, { color: colors.muted }]}>{label}</Text>
      {editable ? (
        <BottomSheetTextInput
          style={[stacked ? styles.valueInputStacked : styles.valueInput, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          value={value}
          onChangeText={onChange}
          onFocus={onFocus}
          returnKeyType="done"
        />
      ) : (
        <Text style={[styles.value, stacked && styles.valueStacked, { color: savedValue ? colors.text : colors.muted }]}>
          {savedValue || '--'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notesRowStacked: { flexDirection: 'column', alignItems: 'stretch', gap: 4 },
  statusText: { fontSize: 14, fontFamily: 'Courier', flexShrink: 0 },
  value: { fontSize: 14, fontFamily: 'Courier', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  valueStacked: { textAlign: 'left' },
  valueInput: { flex: 1, padding: 0, marginLeft: 20, textAlign: 'right', fontSize: 14, fontFamily: 'Courier', fontWeight: '600' },
  valueInputStacked: { padding: 0, textAlign: 'left', fontSize: 14, fontFamily: 'Courier', fontWeight: '600' },
});