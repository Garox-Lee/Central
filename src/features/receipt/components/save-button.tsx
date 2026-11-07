import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';
import { Palette } from '@/constants/theme';

export function SaveButton({ saving, saved, linked, onPress }: { saving: boolean; saved: boolean; linked: boolean; onPress: () => void }) {
  const colors = useTheme();
  const { iconScale } = useAdaptiveLayout();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: saved ? 1 : 0, duration: 350, useNativeDriver: false }).start();
  }, [saved, anim]);

  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: [colors.text as string, Palette.green] });
  const fg = anim.interpolate({ inputRange: [0, 1], outputRange: [colors.background as string, '#FFFFFF'] });

  const [idle, busy, done] = linked ? ['Send to counterparty', 'Sending…', 'Sent'] : ['Save receipt', 'Saving…', 'Saved'];

  return (
    <TouchableOpacity activeOpacity={0.8} disabled={saving || saved} onPress={onPress}>
      <Animated.View style={[styles.saveButton, { backgroundColor: bg }, saving && { opacity: 0.6 }]}>
        <Animated.Text style={[styles.saveButtonText, { color: fg }]}>{saved ? done : saving ? busy : idle}</Animated.Text>
        {saved && (
          <Animated.View style={{ opacity: anim }}>
            <Check size={16 * iconScale} color="#FFFFFF" strokeWidth={3} />
          </Animated.View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  saveButton: { borderRadius: 8, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  saveButtonText: { fontSize: 14, fontFamily: 'Courier', fontWeight: '700' },
});