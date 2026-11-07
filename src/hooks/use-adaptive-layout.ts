// hooks/use-adaptive-layout.ts
import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

const LARGE_TEXT = 1.3;
const HUGE_TEXT = 1.8;
const NARROW_WIDTH = 350;

export function useAdaptiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();

  return useMemo(() => {
    const textScale = Math.max(1, fontScale);
    return {
      width,
      height,
      textScale,
      stacked: textScale >= LARGE_TEXT || width < NARROW_WIDTH,
      huge: textScale >= HUGE_TEXT,
      iconScale: Math.min(textScale, 2),
    };
  }, [width, height, fontScale]);
}