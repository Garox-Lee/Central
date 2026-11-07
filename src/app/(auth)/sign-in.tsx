import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';
import { useAuth } from '@/context/auth-context';

import { View, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { AppText as Text } from '@/components/app-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import CentralLogo from '@/components/central-logo';
import { ArrowRight, Eye, EyeOff, Lock } from 'lucide-react-native';
import Constants from 'expo-constants';

const TAP_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export default function SigninScreen() {
  const colors = useTheme();
  const { stacked, iconScale } = useAdaptiveLayout();
  const { signIn, isLoggedIn, lastUsername } = useAuth();

  const [username, setUsername] = useState<string>('');
  const [usernameLocked, setUsernameLocked] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [focusedField, setFocusedField] = useState<'username' | 'password' | null>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const usernameInputRef = useRef<TextInput>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [resetInfoVisible, setResetInfoVisible] = useState<boolean>(false);
  const [confirmSwitchVisible, setConfirmSwitchVisible] = useState<boolean>(false);

  const iconSize = 18 * iconScale;
  const iconGutter = iconSize + 18; // keeps text clear of the lock / eye button
  const modalActionsStyle = stacked ? styles.modalActionsStacked : styles.modalActions;

  // seed username + lock state once the stored auth data has loaded
  useEffect(() => {
    if (isLoggedIn === null) return; // still loading from SecureStore

    if (lastUsername) {
      setUsername(lastUsername);
      setUsernameLocked(true);
    } else {
      setUsername('');
      setUsernameLocked(false);
    }
  }, [isLoggedIn, lastUsername]);

  // focus whichever field is actually editable once we know the lock state
  useEffect(() => {
    if (isLoggedIn === null) return; // still loading, nothing to focus yet

    if (usernameLocked) {
      passwordInputRef.current?.focus();
    } else {
      usernameInputRef.current?.focus();
    }
  }, [isLoggedIn, usernameLocked]);

  const signingIn = useRef(false);
  const handleSignIn = async () => {
    if (signingIn.current) return;
    signingIn.current = true;

    let result;
    try {
      result = await signIn(username, password);
    } finally {
      signingIn.current = false;
    }

    if (result !== 'ok') {
      setError(
        result === 'invalid' ? 'Incorrect username or password'
        : result === 'biometric' ? 'Fingerprint or face scan failed'
        : 'Set up fingerprint or face unlock in your phone settings'
      );
      return;
    }

    router.replace('/(finance)/positions');
  };

  const handleConfirmSwitch = () => {
    setConfirmSwitchVisible(false);
    setPassword('');
    setUsername('');
    setUsernameLocked(false);
  };

  const handleUsernameSubmit = () => {
    setUsernameLocked(true);
    passwordInputRef.current?.focus();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.logoRow, stacked && styles.logoRowStacked]}>
          <CentralLogo size={1.25 * Math.min(iconScale, 1.6)} />
          <Text style={[styles.logoText, { color: colors.text }]}>Central</Text>
        </View>

        <View style={styles.usernameWrapper}>
          {usernameLocked ? (
            <View style={[styles.usernameDisplay, { paddingRight: iconGutter }]}>
              <Text style={[styles.usernameText, { color: colors.text }]}>{username}</Text>
            </View>
          ) : (
            <TextInput
              ref={usernameInputRef}
              style={[
                styles.usernameText,
                styles.usernameInput,
                { color: colors.text, borderBottomColor: colors.border, paddingRight: iconGutter },
                focusedField === 'username' && { borderBottomColor: colors.primary },
              ]}
              placeholder="Username"
              placeholderTextColor={colors.muted}
              value={username}
              onChangeText={setUsername}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="characters"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="done"
              onSubmitEditing={handleUsernameSubmit}
            />
          )}

          {lastUsername && usernameLocked && (
            <TouchableOpacity style={styles.lockButton} onPress={() => setConfirmSwitchVisible(true)} hitSlop={TAP_SLOP}>
              <Lock size={16 * iconScale} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.passwordWrapper}>
          <TextInput
            ref={passwordInputRef}
            style={[
              styles.input,
              { color: colors.text, borderBottomColor: colors.border, paddingRight: iconGutter },
              focusedField === 'password' && { borderBottomColor: colors.primary },
            ]}
            placeholder="Password"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
          />

          {password.length > 0 && (
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((prev) => !prev)} hitSlop={TAP_SLOP}>
              {showPassword ? (
                <EyeOff size={iconSize} color={colors.muted} />
              ) : (
                <Eye size={iconSize} color={colors.muted} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* side by side normally; when stacked the sign-in button goes on top at full width */}
        <View style={stacked ? styles.actionRowStacked : styles.actionRow}>
          <TouchableOpacity onPress={() => setResetInfoVisible(true)} hitSlop={TAP_SLOP}>
            <Text style={[styles.forgotText, stacked && styles.forgotTextStacked, { color: colors.text }]}>
              Forgotten your details?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSignIn}>
            <Text style={[styles.buttonText, { color: colors.text }]}>Sign In</Text>
            <ArrowRight size={16 * iconScale} strokeWidth={2.5} color={colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.versionText, { color: colors.text }]}>v{Constants.expoConfig?.version}</Text>
      </ScrollView>

      {/* confirm switch user modal */}
      <Modal
        visible={confirmSwitchVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmSwitchVisible(false)}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setConfirmSwitchVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Change user?</Text>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>Are you sure you want to change users on this phone?</Text>

            <View style={modalActionsStyle}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonNo, { borderColor: colors.border }]}
                activeOpacity={0.7}
                onPress={() => setConfirmSwitchVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                activeOpacity={0.7}
                onPress={handleConfirmSwitch}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonYesText]}>Yes</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* sign-in error modal */}
      <Modal visible={error.length > 0} transparent animationType="fade" onRequestClose={() => setError('')}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setError('')}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitleMuted, { color: colors.muted }]}>Sign in failed</Text>
            <Text style={[styles.modalSubtitleAccent, { color: colors.danger }]}>{error}</Text>

            <View style={modalActionsStyle}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                activeOpacity={0.7}
                onPress={() => setError('')}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonYesText]}>OK</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={resetInfoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResetInfoVisible(false)}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setResetInfoVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Reset password</Text>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>Contact support to reset your password.</Text>

            <View style={modalActionsStyle}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                activeOpacity={0.7}
                onPress={() => setResetInfoVisible(false)}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonYesText]}>OK</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'flex-start', paddingHorizontal: 35, paddingTop: 45, paddingBottom: 40 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 60 },
  logoRowStacked: { flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  logoText: { fontSize: 25, fontWeight: '600', flexShrink: 1 },
  versionText: { fontSize: 12, fontFamily: 'Courier', letterSpacing: 1, alignSelf: 'flex-end', marginTop: 12, opacity: 0.5 },
  usernameWrapper: { position: 'relative', justifyContent: 'center' },
  usernameText: { fontSize: 15, fontFamily: 'Courier', letterSpacing: 1 },
  usernameDisplay: { paddingHorizontal: 4, paddingVertical: 12, marginBottom: 5, justifyContent: 'center' },
  usernameInput: { backgroundColor: 'transparent', borderBottomWidth: 1, paddingHorizontal: 4, paddingVertical: 12, marginBottom: 5 },
  // the bottom offsets match each field's marginBottom, so the icon centres on the field itself
  lockButton: { position: 'absolute', right: 4, top: 0, bottom: 5, justifyContent: 'center' },
  passwordWrapper: { position: 'relative', justifyContent: 'center' },
  input: { backgroundColor: 'transparent', borderBottomWidth: 1, paddingHorizontal: 4, paddingVertical: 12, fontSize: 15, fontFamily: 'Courier', letterSpacing: 1, marginBottom: 10 },
  eyeButton: { position: 'absolute', right: 4, top: 0, bottom: 10, justifyContent: 'center' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 60 },
  actionRowStacked: { flexDirection: 'column-reverse', alignItems: 'stretch', gap: 20, marginTop: 36 },
  forgotText: { fontSize: 13, fontFamily: 'Courier', letterSpacing: 0.5, opacity: 0.6, flexShrink: 1 },
  forgotTextStacked: { textAlign: 'center' },
  button: { paddingVertical: 10, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  buttonText: { fontSize: 15, fontWeight: '700', letterSpacing: 1, fontFamily: 'Courier' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  modalCard: { width: '100%', borderRadius: 12, padding: 20, gap: 4 },
  modalTitle: { fontSize: 16, fontFamily: 'Courier', fontWeight: '700' },
  modalSubtitle: { fontSize: 13, fontFamily: 'Courier', marginBottom: 16 },
  modalTitleMuted: { fontSize: 13, fontFamily: 'Courier', fontWeight: '700' },
  modalSubtitleAccent: { fontSize: 16, fontFamily: 'Courier', fontWeight: '700', marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalActionsStacked: { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  modalButtonNo: { borderWidth: 1 },
  modalButtonText: { fontSize: 14, fontFamily: 'Courier', fontWeight: '600' },
  modalButtonYesText: { color: '#FFFFFF' },
});