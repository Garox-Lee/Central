import { forwardRef } from 'react';
import { Text, TextInput, TextProps, TextInputProps } from 'react-native';

export const MAX_FONT_MULTIPLIER = 1.5;

export function AppText(props: TextProps) {
  return <Text maxFontSizeMultiplier={MAX_FONT_MULTIPLIER} {...props} />;
}

export const AppTextInput = forwardRef<TextInput, TextInputProps>((props, ref) => (
  <TextInput ref={ref} maxFontSizeMultiplier={MAX_FONT_MULTIPLIER} {...props} />
));
AppTextInput.displayName = 'AppTextInput';