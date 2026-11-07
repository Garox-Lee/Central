import { View, StyleSheet } from "react-native";
import Svg, { Line, Circle } from "react-native-svg";
import { useTheme } from "@/hooks/use-theme";

export default function CentralLogo({ size = 1 }: { size?: number }) {
  const { primary } = useTheme();
  const dim = 40 * size;

  return (
    <View style={styles.row}>
      <Svg width={dim} height={dim} viewBox="0 0 120 120">
        <Line x1="60" y1="60" x2="60" y2="20" stroke={primary} strokeWidth="3" />
        <Line x1="60" y1="60" x2="100" y2="60" stroke={primary} strokeWidth="3" />
        <Line x1="60" y1="60" x2="60" y2="100" stroke={primary} strokeWidth="3" />
        <Line x1="60" y1="60" x2="20" y2="60" stroke={primary} strokeWidth="3" />

        <Circle cx="60" cy="60" r="14" fill={primary} />
        <Circle cx="60" cy="15" r="14" fill={primary} />
        <Circle cx="105" cy="60" r="14" fill={primary} />
        <Circle cx="60" cy="105" r="14" fill={primary} />
        <Circle cx="15" cy="60" r="14" fill={primary} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});