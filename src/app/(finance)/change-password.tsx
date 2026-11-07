
// update auth.users
// set encrypted_password = extensions.crypt('TempPass-change-me', extensions.gen_salt('bf'))
// where email = 'garoxlee@central.invalid';

// update users.users
// set must_change_password = true
// where user_id = (select id from auth.users where email = 'garoxlee@central.invalid');

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useUserContext } from '@/context/user-context';

import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export default function ChangePasswordScreen() {
  const colors = useTheme();
  const { signOut } = useAuth();
  const { userDetails } = useUserContext();
  const mustChange = userDetails?.mustChangePassword ?? false;

  const [current, setCurrent] = useState<string>('');
  const [next, setNext] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [showCurrent, setShowCurrent] = useState<boolean>(false);
  const [showNext, setShowNext] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [doneVisible, setDoneVisible] = useState<boolean>(false);

  const handleUpdate = async () => {
    if (busy) return;
    if (next.length < 8) return setError('Use at least 8 characters');
    if (next !== confirm) return setError('Passwords do not match');
    if (!mustChange && next === current) return setError('New password must be different');

    setBusy(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return setError('Not signed in');

      if (!mustChange) {
        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: current,
        });
        if (reauthError) return setError('Current password is incorrect');
      }

      const bio = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm password change' });
      if (!bio.success) return setError('Fingerprint or face scan failed');

      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) return setError(updateError.message);

      await supabase.schema('users').rpc('clear_must_change_password');
      setDoneVisible(true);
    } finally {
      setBusy(false);
    }
  };

  const handleDone = async () => {
    setDoneVisible(false);
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {!mustChange && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
        )}

        <Text style={[styles.title, { color: colors.text }]}>Change password</Text>

        <View
          style={[styles.fieldWrapper, mustChange && styles.hidden]}
          pointerEvents={mustChange ? 'none' : 'auto'}
        >
          <TextInput
            style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
            placeholder="Current password"
            placeholderTextColor={colors.muted}
            value={current}
            onChangeText={setCurrent}
            secureTextEntry={!showCurrent}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            editable={!mustChange}
            autoFocus={!mustChange}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowCurrent((prev) => !prev)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {showCurrent ? <EyeOff size={18} color={colors.muted} /> : <Eye size={18} color={colors.muted} />}
          </TouchableOpacity>
        </View>

        <View style={styles.fieldWrapper}>
          <TextInput
            style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
            placeholder="New password"
            placeholderTextColor={colors.muted}
            value={next}
            onChangeText={setNext}
            secureTextEntry={!showNext}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoFocus={mustChange}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowNext((prev) => !prev)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {showNext ? <EyeOff size={18} color={colors.muted} /> : <Eye size={18} color={colors.muted} />}
          </TouchableOpacity>
        </View>

        <View style={styles.fieldWrapper}>
          <TextInput
            style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
            placeholder="Confirm password"
            placeholderTextColor={colors.muted}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirm((prev) => !prev)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {showConfirm ? <EyeOff size={18} color={colors.muted} /> : <Eye size={18} color={colors.muted} />}
          </TouchableOpacity>
        </View>

        {error.length > 0 && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleUpdate}>
          <Text style={[styles.buttonText, { color: colors.text }]}>Update</Text>
          <ArrowRight size={16} strokeWidth={2.5} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Modal visible={doneVisible} transparent animationType="fade" onRequestClose={handleDone}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Password updated</Text>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>Please sign in again with your new password.</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                activeOpacity={0.7}
                onPress={handleDone}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonYesText]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 35, paddingTop: 45, gap: 12 },
  title: { fontSize: 25, fontWeight: '600', marginTop: 30, marginBottom: 20 },
  fieldWrapper: { position: 'relative', justifyContent: 'center' },
  input: { borderBottomWidth: 1, paddingHorizontal: 4, paddingVertical: 12, paddingRight: 36, fontSize: 15, fontFamily: 'Courier', letterSpacing: 1 },
  eyeButton: { position: 'absolute', right: 4, top: 14 },
  error: { fontSize: 13, fontFamily: 'Courier', fontWeight: '700' },
  button: { alignSelf: 'flex-end', paddingVertical: 10, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 40 },
  buttonText: { fontSize: 15, fontWeight: '700', letterSpacing: 1, fontFamily: 'Courier' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  modalCard: { width: '100%', borderRadius: 12, padding: 20, gap: 4 },
  modalTitle: { fontSize: 16, fontFamily: 'Courier', fontWeight: '700' },
  modalSubtitle: { fontSize: 13, fontFamily: 'Courier', marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { fontSize: 14, fontFamily: 'Courier', fontWeight: '600' },
  modalButtonYesText: { color: '#FFFFFF' },

  backButton: { position: 'absolute', top: 25, left: 35 },
  hidden: { opacity: 0 },
});
