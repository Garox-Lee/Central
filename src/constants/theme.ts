/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';
import { DefaultTheme, DarkTheme } from 'expo-router/react-navigation'; // or '@react-navigation/native'

export const Palette = {
  amber: '#F59E0B',
  green: '#10B981',
  blue: '#60A5FA',
  white: '#FFFFFF', 
} as const;

export const TAP_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

// constants/theme.ts
export const Colors = {
  light: {
    background: '#F5F5F5',
    text: '#0D0D0D',
    grey: '#6B6B6B',
    border: '#D0D0D0',
    primary: '#3B82F6',
    danger: '#EF4444',
    success: '#10B981',
    positiveQuantity: '#10B981',
    negativeQuantity: '#EF4444',
    muted: '#888',
    card: '#FFFFFF',
  },
  dark: {
    background: '#121212',
    text: '#FFFFFF',
    grey: '#888888',
    border: '#2A2A2A',
    primary: '#3B82F6',
    danger: '#EF4444',
    success: '#10B981',
    positiveQuantity: '#10B981',
    negativeQuantity: '#EF4444',
    muted: '#9A9A9A',
    card: '#1E1F20',
  },
} as const;

export const NavLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    card: Colors.light.background, // tab/header bar colour; use Colors.light.card if you want it lighter than screens
    text: Colors.light.text,
    border: Colors.light.border,
    primary: Colors.light.primary,
  },
};

export const NavDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.border,
    primary: Colors.dark.primary,
  },
};

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
