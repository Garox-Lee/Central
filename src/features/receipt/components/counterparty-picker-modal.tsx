import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { searchPublicCounterparties, type PublicCounterparty } from '../api/public-counterparties';

export type CounterpartyOption = { id: string; name: string; identifier: string | null; count: number };

type Props = {
  visible: boolean;
  options: CounterpartyOption[];
  onSelect: (name: string, unregisteredId: string | null) => void;
  onClose: () => void;
};

const SURFACE = 'rgba(128, 128, 128, 0.18)';

const ROW_H = 40;
const DROPDOWN_GAP = 6;

export default function CounterpartyPickerModal({ visible, options, onSelect, onClose }: Props) {
  const colors = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<PublicCounterparty[]>([]);
  const typed = query.trim();

  // counterparties with an ABN from everyone, fetched as you type
  useEffect(() => {
    if (typed.length < 2) {
      setRemote([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const found = await searchPublicCounterparties(typed);
      if (!cancelled) setRemote(found);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [typed]);

  const rows = useMemo<CounterpartyOption[]>(() => {
    const q = typed.toLowerCase();
    if (!q) return [];
    const mine = options.filter(
      (o) => o.name.toLowerCase().includes(q) || (o.identifier ?? '').toLowerCase().includes(q)
    );
    const seen = new Set(mine.map((m) => m.id));
    const others = remote
      .filter((r) => !seen.has(r.id))
      .map((r) => ({ id: r.id, name: r.name, identifier: r.identifier, count: 0 }));
    return [...mine, ...others];
  }, [options, remote, typed]);

  const handleClose = () => {
    setQuery('');
    setRemote([]);
    onClose();
  };

  const choose = (name: string, id: string | null) => {
    onSelect(name, id);
    handleClose();
  };

  const submit = () => {
    if (!typed) return;
    if (rows[0]) choose(rows[0].name, rows[0].id);
    else choose(typed, null);
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
                  onSubmitEditing={submit}
                  placeholder="Search counterparties or ABN"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  style={[styles.input, { fontSize: 14, color: colors.text }]}
                />
              </View>

              {typed.length > 0 && (
                <View style={[styles.dropdown, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    style={{ backgroundColor: SURFACE, maxHeight: ROW_H * 6 }}
                  >
                    {/* custom: always a brand-new counterparty, even if the name already exists */}
                    <TouchableOpacity
                      onPress={() => choose(typed, null)}
                      activeOpacity={0.7}
                      style={styles.suggestion}
                    >
                      <Text
                        style={[styles.suggestionLabel, { fontSize: 14, color: colors.text }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        Use "{typed}"
                      </Text>
                      <Text style={[styles.count, { fontSize: 12, color: colors.muted }]}>new</Text>
                    </TouchableOpacity>

                    {rows.map((o) => (
                      <TouchableOpacity
                        key={o.id}
                        onPress={() => choose(o.name, o.id)}
                        activeOpacity={0.7}
                        style={[
                          styles.suggestion,
                          { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                        ]}
                      >
                        <Text
                          style={[styles.suggestionLabel, { fontSize: 14, color: colors.text }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {o.name}
                          {!!o.identifier && (
                            <Text style={{ fontSize: 12, color: colors.muted }}>{`  ${o.identifier}`}</Text>
                          )}
                        </Text>
                        {o.count > 0 && (
                          <Text style={[styles.count, { fontSize: 12, color: colors.muted }]}>{o.count}</Text>
                        )}
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
  right: { flexShrink: 0, maxWidth: '45%', fontFamily: 'Courier' },
});