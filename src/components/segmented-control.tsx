import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

type SegmentOption<T extends string> = { key: T; label: string };

type Props<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (key: T) => void;
  fullWidth?: boolean; // stretch segments to fill available width (default true)
  style?: StyleProp<ViewStyle>; // page-specific layout: margins, positioning, etc.
};

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  fullWidth = true,
  style,
}: Props<T>) {
  const colors = useTheme();

  return (
    <View
      style={[
        styles.segmentedControl,
        { borderColor: colors.border },
        !fullWidth && styles.segmentedControlHug,
        style,
      ]}
    >
      {options.map((option) => (
        <TouchableOpacity
          key={option.key}
          style={[
            styles.segment,
            fullWidth && styles.segmentFlex,
            value === option.key && { backgroundColor: colors.border },
          ]}
          activeOpacity={0.7}
          accessibilityRole="button"
          onPress={() => onChange(option.key)}
        >
          <Text
            numberOfLines={1}
            style={[styles.segmentText, { color: colors.text, fontSize: 12 }]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  segmentedControl: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  segmentedControlHug: { alignSelf: 'flex-start' },
  segment: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 10 },
  segmentFlex: { flex: 1, paddingHorizontal: 8 },
  segmentText: { fontFamily: 'Courier', fontWeight: '600', textAlign: 'center' },
});