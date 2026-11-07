import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

/** Android has no datetime mode: chain the date dialog into the time dialog. */
export const pickDateTimeAndroid = (initial: Date, onPick: (date: Date) => void) =>
  DateTimePickerAndroid.open({
    value: initial,
    mode: 'date',
    onValueChange: (_, d) => {
      if (!d) return;
      DateTimePickerAndroid.open({
        value: d,
        mode: 'time',
        onValueChange: (_, t) => t && onPick(t),
      });
    },
  });