import { useRef, useState } from 'react';
import { Animated, useWindowDimensions } from 'react-native';

export function useHistoryPage(expandSheet: () => void) {
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -width] });

  const slideTo = (toValue: number, onDone?: () => void) =>
    Animated.timing(anim, { toValue, duration: 280, useNativeDriver: true }).start(onDone);

  return {
    open,
    width,
    translateX,
    openHistory: () => {
      setOpen(true);
      expandSheet(); // history needs the room
      slideTo(1);
    },
    closeHistory: () => slideTo(0, () => setOpen(false)),
  };
}