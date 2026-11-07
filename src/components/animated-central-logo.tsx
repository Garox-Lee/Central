import { useTheme } from '@/hooks/use-theme';
import { useEffect, useState } from 'react';

import { View, Animated, StyleSheet } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const BASE_RADIUS = 45;
const BOUNCE_RADIUS = 57;
const NODE_RADIUS = 14;
const MARGIN = 4;

// The viewBox needs to be big enough that the outer edge of a bounced-out
// node (BOUNCE_RADIUS + NODE_RADIUS) never gets clipped, plus a small
// margin. Width/height stay fixed, so this only adds padding -- it doesn't
// make the rendered icon any bigger.
const HALF_VIEWBOX = BOUNCE_RADIUS + NODE_RADIUS + MARGIN;
const VIEWBOX_SIZE = HALF_VIEWBOX * 2;
const CENTER = HALF_VIEWBOX;

// dx/dy = direction from center for each of the four outer nodes.
const OUTER_NODES = [
  { dx: 0, dy: -1 }, // top
  { dx: 1, dy: 0 },  // right
  { dx: 0, dy: 1 },  // bottom
  { dx: -1, dy: 0 }, // left
];

// randomized per node so each bounces on its own independent, drifting rhythm
const randomDuration = () => 650 + Math.random() * 600; // 450-800ms per half-cycle
const randomDelay = () => Math.random() * 400; // 0-400ms initial offset

type Props = {
  size?: number;
};

export default function AnimatedCentralLogo({ size = 1 }: Props) {
  const colors = useTheme();

  const dim = 40 * size;

  const [nodeConfigs] = useState(() =>
    OUTER_NODES.map(({ dx, dy }) => ({
      dx,
      dy,
      value: new Animated.Value(0),
      outDuration: randomDuration(),
      inDuration: randomDuration(),
      delay: randomDelay(),
    }))
  );

  useEffect(() => {
    const loops = nodeConfigs.map(({ value, outDuration, inDuration, delay }) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, { toValue: 1, duration: outDuration, useNativeDriver: false }),
          Animated.timing(value, { toValue: 0, duration: inDuration, useNativeDriver: false }),
        ])
      )
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [nodeConfigs]);

  const orbitNodes = nodeConfigs.map(({ dx, dy, value }) => {
    const radius = value.interpolate({ inputRange: [0, 1], outputRange: [BASE_RADIUS, BOUNCE_RADIUS] });
    return {
      cx: Animated.add(CENTER, Animated.multiply(radius, dx)),
      cy: Animated.add(CENTER, Animated.multiply(radius, dy)),
    };
  });

  return (
    <View style={styles.row}>
      <Svg width={dim} height={dim} viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
        {orbitNodes.map((n, i) => (
          <AnimatedLine key={`line-${i}`} x1={CENTER} y1={CENTER} x2={n.cx} y2={n.cy} stroke={colors.primary} strokeWidth="3" />
        ))}

        <Circle cx={CENTER} cy={CENTER} r={NODE_RADIUS} fill={colors.primary} />

        {orbitNodes.map((n, i) => (
          <AnimatedCircle key={`node-${i}`} cx={n.cx} cy={n.cy} r={NODE_RADIUS} fill={colors.primary} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});