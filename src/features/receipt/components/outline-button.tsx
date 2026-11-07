import { ColorValue, StyleSheet, Text, TouchableOpacity } from 'react-native';

export function OutlineButton(p: {
  label: string;
  color: ColorValue;
  onPress: () => void;
  disabled?: boolean;
  faded?: boolean;
  marginTop?: number;
}) {
  return (
    <TouchableOpacity
      style={[styles.outlineButton, { borderColor: p.color }, p.faded && { opacity: 0.6 }, p.marginTop !== undefined && { marginTop: p.marginTop }]}
      activeOpacity={0.7}
      disabled={p.disabled}
      onPress={p.onPress}
    >
      <Text style={[styles.outlineButtonText, { color: p.color }]}>{p.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outlineButton: { marginTop: 12, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderRadius: 6 },
  outlineButtonText: { fontSize: 13, fontFamily: 'Courier', fontWeight: '600' },
});