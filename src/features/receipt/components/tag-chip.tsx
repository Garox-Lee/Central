import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';

type Props = { label: string; onRemove?: () => void; struck?: boolean };

export function TagChip({ label, onRemove, struck }: Props) {
  const dark = useColorScheme() === 'dark';
  const { iconScale } = useAdaptiveLayout();
  const bg = dark ? 'rgba(96, 165, 250, 0.22)' : 'rgba(96, 165, 250, 0.2)';
  const fg = dark ? '#93C5FD' : '#1D4ED8';

  return (
    <View style={[styles.chip, !onRemove && styles.chipReadOnly, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }, struck && styles.struck]}>{label}</Text>
      {onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
          accessibilityLabel={`Remove tag ${label}`}
          accessibilityRole="button"
        >
          <X size={13 * iconScale} color={fg} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingVertical: 4, paddingLeft: 12, paddingRight: 8 },
  chipReadOnly: { paddingRight: 12 },
  text: { fontSize: 13, fontFamily: 'Courier', fontWeight: '600' },
  struck: { textDecorationLine: 'line-through' },
});