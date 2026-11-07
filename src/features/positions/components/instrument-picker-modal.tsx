import { useMemo, useRef, useState } from 'react';
import { useTheme } from '@/hooks/use-theme';

import { Modal, View, Text, TextInput, TouchableOpacity, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';

export type InstrumentOption = { name: string; count: number };

type Props = {
  visible: boolean;
  instruments: InstrumentOption[];
  onSelect: (instrument: string) => void;
  onClose: () => void;
};

const SURFACE = 'rgba(128, 128, 128, 0.18)';

const ROW_H = 40;
const DROPDOWN_GAP = 6;

export default function InstrumentPickerModal({ visible, instruments, onSelect, onClose }: Props) {
  const colors = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? instruments.filter((i) => i.name.toLowerCase().includes(q)) : [];
  }, [instruments, query]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const choose = (instrument: string) => {
    onSelect(instrument);
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onShow={() => setTimeout(() => inputRef.current?.focus(), 100)}
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {}}
        >
          <View>
            <View>
              <View style={[styles.bar, { borderColor: colors.border, backgroundColor: SURFACE }]}>
                <Search size={16} color={colors.muted} />
                <TextInput
                  ref={inputRef}
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={() => matches[0] && choose(matches[0].name)}
                  placeholder="Search instruments to show quantities in"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  style={[styles.input, { fontSize: 14, color: colors.text }]}
                />
              </View>

              {matches.length > 0 && (
                <View style={[styles.dropdown, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    style={{ backgroundColor: SURFACE, maxHeight: ROW_H * 6 }}
                  >
                    {matches.map((i, idx) => (
                      <TouchableOpacity
                        key={i.name}
                        onPress={() => choose(i.name)}
                        activeOpacity={0.7}
                        style={[
                          styles.suggestion,
                          idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                        ]}
                      >
                        <Text
                          style={[styles.suggestionLabel, { fontSize: 14, color: colors.text }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {i.name}
                        </Text>
                        <Text style={[styles.count, { fontSize: 12, color: colors.muted }]}>{i.count}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', alignItems: 'center', justifyContent: 'flex-start', padding: 24, paddingTop: 200 },
  card: { width: '100%', maxWidth: 425, borderWidth: 1, borderRadius: 12 },

  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  input: { flex: 1, fontFamily: 'Courier', paddingVertical: 4 },

  dropdown: { marginTop: DROPDOWN_GAP, borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, height: ROW_H, paddingHorizontal: 10 },
  suggestionLabel: { flex: 1, flexShrink: 1, fontFamily: 'Courier' },
  count: { flexShrink: 0, fontFamily: 'Courier' },
});