import { useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export type DialogAction = {
  label: string;
  onPress: () => void;
  variant?: 'outline' | 'danger' | 'primary' | 'text';
  disabled?: boolean;
};

type DialogProps = {
  visible: boolean;
  message: string;
  title?: string;
  error?: string | null;
  actions: DialogAction[];
  onRequestClose?: () => void; // backdrop tap + Android back; omit to make it non-dismissable
};

export default function Dialog({ visible, message, title, error, actions, onRequestClose }: DialogProps) {
  const colors = useTheme();

  // keep the last message so the text doesn't blank out during the fade-out
  const lastMessage = useRef(message);
  if (visible) lastMessage.current = message;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onRequestClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.card, { backgroundColor: colors.background }]}>
          {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
          <Text style={[styles.message, { color: title ? colors.muted : colors.text }]}>{lastMessage.current}</Text>
          {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

          <View style={styles.actions}>
            {actions.map((a) => {
              const variant = a.variant ?? 'outline';
              const filled = variant === 'danger' || variant === 'primary';
              const compact = actions.length === 1;
              
              return (
                <TouchableOpacity
                  key={a.label}
                  style={[
                    variant === 'text' ? styles.textButton : compact ? styles.buttonCompact : styles.button,
                    variant === 'outline' && { borderWidth: 1, borderColor: colors.border },
                    variant === 'danger' && { backgroundColor: colors.danger },
                    variant === 'primary' && { backgroundColor: colors.primary },
                    a.disabled && { opacity: 0.6 },
                  ]}
                  activeOpacity={0.7}
                  disabled={a.disabled}
                  onPress={a.onPress}
                  hitSlop={variant === 'text' ? 8 : undefined}
                >
                  <Text style={[styles.buttonText, { color: filled ? '#FFFFFF' : colors.text }]}>
                    {a.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  card: { width: '100%', borderRadius: 12, padding: 20, gap: 4 },
  title: { fontSize: 16, fontFamily: 'Courier', fontWeight: '700' },
  message: { fontSize: 13, fontFamily: 'Courier', marginBottom: 16 },
  error: { fontSize: 12, fontFamily: 'Courier', marginBottom: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  button: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  buttonCompact: { paddingVertical: 8, paddingHorizontal: 20, minWidth: 72, borderRadius: 8, alignItems: 'center' },
  textButton: { paddingVertical: 4, paddingHorizontal: 4 },
  buttonText: { fontSize: 14, fontFamily: 'Courier', fontWeight: '600' },
});