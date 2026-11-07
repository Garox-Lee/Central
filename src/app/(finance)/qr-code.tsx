import { useTheme } from '@/hooks/use-theme';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';
import { useUserDetails } from '@/context/user-context';

import { View, TouchableOpacity, Image, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { User } from 'lucide-react-native';
import QRCodeStyled from 'react-native-qrcode-styled';
import { Palette, TAP_SLOP } from '@/constants/theme';

const BASE_QR = 300;
const CARD_PADDING = 18;
const SCREEN_MARGIN = 24;

export default function QrCodeScreen() {
  const colors = useTheme();
  const { width, height, iconScale } = useAdaptiveLayout();
  const { publicId } = useUserDetails();

  // fit the code to the window: never wider than the screen, never taller than half of it
  const qrSize = Math.max(160, Math.min(BASE_QR, width - 2 * (SCREEN_MARGIN + CARD_PADDING), height * 0.5));
  const k = qrSize / BASE_QR; // the centre logo badge scales with the code

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View />
        <TouchableOpacity
          onPress={() => router.push('/(finance)/user-details')}
          accessibilityLabel="Open profile"
          accessibilityRole="button"
          hitSlop={TAP_SLOP}
          style={styles.userButton}
        >
          <User color={colors.text} size={26 * Math.min(iconScale, 1.5)} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={[styles.glowWrapper, { shadowColor: colors.primary }]}>
          <View style={[styles.qrCard, { backgroundColor: Palette.white }]}>
            <QRCodeStyled
              data={`central:user:${publicId}`}
              style={{ backgroundColor: Palette.white }}
              size={qrSize}
              pieceBorderRadius={2}
              pieceLiquidRadius={4}
              isPiecesGlued
              color={colors.primary}
              outerEyesOptions={{ borderRadius: 12, color: colors.primary }}
              innerEyesOptions={{ borderRadius: 8, color: colors.primary }}
              logo={{
                href: require('@/assets/images/central-logo-white-1.00x.png'),
                scale: 0.5,
                padding: 6,
                hidePieces: true,
              }}
            />
            <View style={[styles.logoBadgeRim, { width: 68 * k, height: 68 * k, borderRadius: 68 * k, backgroundColor: Palette.white }]}>
              <View style={[styles.logoBadge, { width: 60 * k, height: 60 * k, borderRadius: 60 * k, backgroundColor: colors.primary }]}>
                <Image
                  source={require('@/assets/images/central-logo-white-1.00x.png')}
                  style={{ width: 40 * k, height: 40 * k, resizeMode: 'contain' }}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15 },
  userButton: { paddingRight: 5 },
  // flexGrow centres the card when there's room; padding keeps the glow from being clipped when it scrolls
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, paddingHorizontal: SCREEN_MARGIN },
  glowWrapper: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 45, elevation: 24 },
  qrCard: { padding: CARD_PADDING, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  logoBadgeRim: { position: 'absolute', justifyContent: 'center', alignItems: 'center' }, // size and colour set inline
  logoBadge: { position: 'absolute', justifyContent: 'center', alignItems: 'center' }, // size and colour set inline
});