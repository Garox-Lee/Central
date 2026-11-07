import { useRef, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Path } from 'react-native-svg';
import { X } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';

const FRAME = 340;
const RADIUS = 24;
const CORNER = 44;
const THICK = 4;
const DIM = 'rgba(0,0,0,0.6)';

// full-screen rectangle with a rounded-rect hole, filled with the even-odd rule
const dimPath = (w: number, h: number, x: number, y: number, s: number, r: number) =>
  `M0 0H${w}V${h}H0Z ` +
  `M${x + r} ${y}H${x + s - r}A${r} ${r} 0 0 1 ${x + s} ${y + r}` +
  `V${y + s - r}A${r} ${r} 0 0 1 ${x + s - r} ${y + s}` +
  `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + s - r}` +
  `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;

export function QrScannerModal({
  visible, onClose, onScanned,
}: { visible: boolean; onClose: () => void; onScanned: (data: string) => void }) {
  const colors = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const accent = colors.primary as string;

  const holeX = (size.w - FRAME) / 2;
  const holeY = (size.h - FRAME) / 2;

  return (
    <Modal visible={visible} animationType="slide" onShow={() => { handled.current = false; }}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {permission?.granted ? (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => {
                if (handled.current) return;   // the callback fires repeatedly
                handled.current = true;
                onScanned(data);
              }}
            />

            {/* scan frame overlay */}
            <View
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
              onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
            >
              {size.w > 0 && (
                <>
                  <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
                    <Path d={dimPath(size.w, size.h, holeX, holeY, FRAME, RADIUS)} fill={DIM} fillRule="evenodd" />
                  </Svg>

                  <View style={{ position: 'absolute', left: holeX, top: holeY, width: FRAME, height: FRAME }}>
                    <View style={[styles.corner, styles.tl, { borderColor: accent }]} />
                    <View style={[styles.corner, styles.tr, { borderColor: accent }]} />
                    <View style={[styles.corner, styles.bl, { borderColor: accent }]} />
                    <View style={[styles.corner, styles.br, { borderColor: accent }]} />
                  </View>

                  <Text style={[styles.hint, { top: holeY + FRAME + 24 }]}>Align the QR code within the frame</Text>
                </>
              )}
            </View>
          </>
        ) : (
          <Pressable onPress={requestPermission} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff' }}>Tap to allow camera</Text>
          </Pressable>
        )}

        <Pressable
          onPress={onClose}
          hitSlop={16}
          accessibilityLabel="Close scanner"
          accessibilityRole="button"
          style={{ position: 'absolute', top: 56, right: 24 }}
        >
          <X size={28} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hint: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 14 },
  corner: { position: 'absolute', width: CORNER, height: CORNER },
  tl: { top: 0, left: 0, borderTopWidth: THICK, borderLeftWidth: THICK, borderTopLeftRadius: RADIUS },
  tr: { top: 0, right: 0, borderTopWidth: THICK, borderRightWidth: THICK, borderTopRightRadius: RADIUS },
  bl: { bottom: 0, left: 0, borderBottomWidth: THICK, borderLeftWidth: THICK, borderBottomLeftRadius: RADIUS },
  br: { bottom: 0, right: 0, borderBottomWidth: THICK, borderRightWidth: THICK, borderBottomRightRadius: RADIUS },
});