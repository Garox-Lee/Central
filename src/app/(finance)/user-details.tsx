import { useTheme } from '@/hooks/use-theme';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';
import { useAuth } from '@/context/auth-context';

import { Alert, View, TouchableOpacity, Switch, ScrollView, StyleSheet } from 'react-native';
import { AppText as Text } from '@/components/app-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronRight, Moon, Lock, Fingerprint, FileText, Shield, Cake, MapPinHouse } from 'lucide-react-native';
import { formatDatetime } from '@/utils/datetime';
import { useUserContext } from '@/context/user-context';
import { sendTestNotification } from '@/utils/notifications';
import { useUpdatesSafe, reloadApp } from '@/utils/updates';
import { Palette } from '@/constants/theme';

export default function UserScreen() {
  const { isUpdatePending } = useUpdatesSafe();
  const colors = useTheme();
  const { stacked, iconScale } = useAdaptiveLayout();
  const { signOut } = useAuth();
  const { userDetails, darkMode, setDarkMode, biometrics, setBiometrics } = useUserContext();

  const icon = 18 * iconScale;
  const valueIndent = icon + 12; // lines a stacked value up under its label text

  const switchColors = {
    trackColor: { false: colors.border, true: colors.primary },
    thumbColor: Palette.white,
  };

  // switches grow fast, so cap them; transforms don't affect layout, so add margin to match
  const switchStyle = (base: number) => {
    const s = base * Math.min(iconScale, 1.4);
    return { transform: [{ scaleX: s }, { scaleY: s }], marginRight: Math.max(0, s - 1) * 26 };
  };

  const handleTestNotification = async () => {
    const result = await sendTestNotification();
    if (result === 'denied') {
      Alert.alert('Notifications are off', 'Turn on notifications for Central in your phone settings.');
    } else if (result === 'unsupported') {
      Alert.alert('Development build needed', "Notifications don't work in Expo Go on Android.");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  if (!userDetails) return null;

  const infoValueStyle = [
    styles.rowValue,
    stacked && { marginLeft: valueIndent, textAlign: 'left' as const },
    { color: colors.text },
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View>
          <View style={styles.identityBlock}>
            <Text style={[styles.name, { color: colors.text }]}>
              {userDetails.firstName} {userDetails.lastName}
            </Text>
            <Text style={[styles.userId, { color: colors.muted }]}>#{userDetails.publicId}</Text>
          </View>

          {/* info rows: value beside the label, or beneath it when stacked */}
          <View>
            <View style={[stacked ? styles.rowStacked : styles.row, { borderBottomColor: colors.border }]}>
              <View style={styles.rowLeft}>
                <Cake size={icon} color={colors.text} style={styles.noShrink} />
                <Text style={[styles.rowLabel, { color: colors.text }]}>Birthday</Text>
              </View>
              <Text style={infoValueStyle}>{userDetails.birthday ? formatDatetime(userDetails.birthday, 'dd mmm yyyy') : ''}</Text>
            </View>

            <View style={[stacked ? styles.rowStacked : styles.row, { borderBottomColor: colors.border }]}>
              <View style={styles.rowLeft}>
                <MapPinHouse size={icon} color={colors.text} style={styles.noShrink} />
                <Text style={[styles.rowLabel, { color: colors.text }]}>Address</Text>
              </View>
              <Text style={infoValueStyle}>--</Text>
            </View>
          </View>

          <View>
            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={styles.rowLeft}>
                <Moon size={icon} color={colors.text} style={styles.noShrink} />
                <Text style={[styles.rowLabel, { color: colors.text }]}>Dark Mode</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                {...switchColors}
                style={switchStyle(0.85)}
              />
            </View>
          </View>

          <Text style={[styles.sectionHeader, { color: colors.muted }]}>Privacy</Text>
          <View>
            <TouchableOpacity
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => router.push('/(finance)/change-password')}
            >
              <View style={styles.rowLeft}>
                <Lock size={icon} color={colors.text} style={styles.noShrink} />
                <Text style={[styles.rowLabel, { color: colors.text }]}>Change Password</Text>
              </View>
              <ChevronRight size={icon} color={colors.muted} style={styles.noShrink} />
            </TouchableOpacity>

            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={styles.rowLeft}>
                <Fingerprint size={icon} color={colors.text} style={styles.noShrink} />
                <Text style={[styles.rowLabel, { color: colors.text }]}>Biometrics</Text>
              </View>
              <Switch
                value={biometrics}
                onValueChange={setBiometrics}
                {...switchColors}
                style={switchStyle(1)}
              />
            </View>
          </View>

          <Text style={[styles.sectionHeader, { color: colors.muted }]}>Legal</Text>
          <View>
            <TouchableOpacity
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => router.push('/(finance)/terms-of-service')}
            >
              <View style={styles.rowLeft}>
                <FileText size={icon} color={colors.text} style={styles.noShrink} />
                <Text style={[styles.rowLabel, { color: colors.text }]}>Terms of Service</Text>
              </View>
              <ChevronRight size={icon} color={colors.muted} style={styles.noShrink} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => router.push('/(finance)/privacy-policy')}
            >
              <View style={styles.rowLeft}>
                <Shield size={icon} color={colors.text} style={styles.noShrink} />
                <Text style={[styles.rowLabel, { color: colors.text }]}>Privacy Policy</Text>
              </View>
              <ChevronRight size={icon} color={colors.muted} style={styles.noShrink} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.testButton, { borderColor: colors.border }]}
          onPress={handleTestNotification}
          activeOpacity={0.7}
        >
          <Text style={[styles.testButtonText, { color: colors.text }]}>Send Test Notification</Text>
        </TouchableOpacity>

        {isUpdatePending && (
          <TouchableOpacity
            style={[styles.updateButton, { borderColor: colors.primary }]}
            onPress={() => reloadApp()}
            activeOpacity={0.7}
          >
            <Text style={[styles.testButtonText, { color: colors.text }]}>Update & Restart</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: colors.primary }]}
          onPress={handleSignOut}
        >
          <Text style={[styles.signOutText, { color: colors.text }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  identityBlock: { marginBottom: 24 },
  name: { fontSize: 22, fontFamily: 'Courier', fontWeight: '700' },
  userId: { fontSize: 13, fontFamily: 'Courier', marginTop: 4 },
  sectionHeader: { fontSize: 12, fontFamily: 'Courier', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 24, marginBottom: 4 },

  // minHeight instead of height so wrapped text isn't clipped
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52, paddingVertical: 8, gap: 12, borderBottomWidth: 1 },
  rowStacked: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', minHeight: 52, paddingVertical: 10, gap: 4, borderBottomWidth: 1 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  rowLabel: { fontSize: 15, fontFamily: 'Courier', flexShrink: 1 },
  rowValue: { fontSize: 15, fontFamily: 'Courier', flexShrink: 1, textAlign: 'right' },
  noShrink: { flexShrink: 0 },

  testButton: { paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', marginTop: 32, borderWidth: 1 },
  testButtonText: { fontSize: 15, fontWeight: '700', letterSpacing: 1, fontFamily: 'Courier', textAlign: 'center' },
  updateButton: { paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', marginTop: 12, borderWidth: 1 },
  signOutButton: { paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', marginTop: 12 },
  signOutText: { fontSize: 15, fontWeight: '700', letterSpacing: 1, fontFamily: 'Courier', textAlign: 'center' },
});