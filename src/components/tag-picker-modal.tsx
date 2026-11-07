import { useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';

export type TagOption = { name: string; count: number };

type Props = {
  visible: boolean;
  tags: TagOption[];
  onConfirm: (tags: string[]) => void;
  onClose: () => void;
};

const SURFACE = 'rgba(128, 128, 128, 0.18)';
const COMMON_LIMIT = 12;

export default function TagPickerModal({ visible, tags, onConfirm, onClose }: Props) {
  const colors = useTheme();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [created, setCreated] = useState<string[]>([]);

  const all = useMemo<TagOption[]>(() => {
    const existing = new Set(tags.map((t) => t.name.toLowerCase()));
    return [...tags, ...created.filter((n) => !existing.has(n.toLowerCase())).map((name) => ({ name, count: 0 }))];
  }, [tags, created]);

  const q = query.trim().toLowerCase();

  const bubbles = useMemo(() => {
    const list = q
      ? all.filter((t) => t.name.toLowerCase().includes(q))
      : [...all].sort((a, b) => b.count - a.count).slice(0, COMMON_LIMIT);
    const picked = selected.map((name) => all.find((t) => t.name === name)).filter(Boolean) as TagOption[];
    return [...picked, ...list.filter((t) => !selected.includes(t.name))];
  }, [all, q, selected]);

  const canCreate = q !== '' && !all.some((t) => t.name.toLowerCase() === q);

  const toggle = (name: string) =>
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  const create = () => {
    const name = query.trim();
    setCreated((prev) => [...prev, name]);
    setSelected((prev) => [...prev, name]);
    setQuery('');
  };

  const handleClose = () => {
    setQuery('');
    setSelected([]);
    onClose();
  };

  const handleOk = () => {
    onConfirm(selected);
    handleClose();
  };

  const handleSubmit = () => {
    if (canCreate) create();
    else if (q && bubbles[0]) toggle(bubbles[0].name);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {}}
        >
          <View style={[styles.bar, { borderColor: colors.border, backgroundColor: SURFACE }]}>
            <Search size={16} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSubmit}
              placeholder="Search or create tags"
              placeholderTextColor={colors.muted}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              blurOnSubmit={false}
              style={[styles.input, { color: colors.text }]}
            />
          </View>

          <View style={[styles.bubbleSection, { borderColor: colors.border }]}>
            <View style={styles.bubbles}>
              {bubbles.map((t) => {
                const on = selected.includes(t.name);
                return (
                  <TouchableOpacity
                    key={t.name}
                    onPress={() => toggle(t.name)}
                    activeOpacity={0.7}
                    style={[
                      styles.bubble,
                      { borderColor: on ? colors.primary : colors.border, backgroundColor: SURFACE },
                    ]}
                  >
                    <Text style={[styles.bubbleText, { color: on ? colors.primary : colors.text }]}>{t.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            {canCreate && (
              <TouchableOpacity onPress={create} activeOpacity={0.7} style={styles.createRow}>
                <Text style={[styles.createText, { color: colors.primary }]}>+ Create “{query.trim()}”</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleOk}
              activeOpacity={0.8}
              disabled={selected.length === 0}
              style={[styles.okButton, { backgroundColor: colors.primary }, selected.length === 0 && { opacity: 0.4 }]}
            >
              <Text style={styles.okText}>{selected.length > 0 ? `OK (${selected.length})` : 'OK'}</Text>
            </TouchableOpacity>
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
  input: { flex: 1, fontSize: 14, fontFamily: 'Courier', paddingVertical: 4 },

  bubbleSection: { marginTop: 6, borderWidth: 1, borderRadius: 8, padding: 10, backgroundColor: SURFACE },
  bubbles: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  bubble: { borderWidth: 1, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
  bubbleText: { fontSize: 13, fontFamily: 'Courier' },

  createRow: { marginTop: 12, paddingVertical: 4 },
  createText: { fontSize: 13, fontFamily: 'Courier', fontWeight: '600' },

  okButton: { alignSelf: 'flex-end', marginTop: 16, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 28, alignItems: 'center' },
  okText: { fontSize: 14, fontFamily: 'Courier', fontWeight: '700', color: '#FFFFFF' },
});