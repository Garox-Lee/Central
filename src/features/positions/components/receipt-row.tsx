import { memo } from 'react';
import { useTheme } from '@/hooks/use-theme';

import { ColorValue, StyleSheet, TouchableOpacity, View } from 'react-native';
import { CircleX, Clock, FilePenLine, Unlink } from 'lucide-react-native';

import { AppText as Text } from '@/components/app-text';
import { Palette } from '@/constants/theme';
import { formatDatetime } from '@/utils/datetime';
import { formatAmount } from '@/utils/format-numbers';
import { getReceiptStatus } from '@/features/receipt';
import type { ListRow } from '../types';

export const ReceiptRow = memo(function ReceiptRow({
  row, value, showDate, textColor, amountColor, dangerColor, textScale, stacked, iconScale, onPress,
}: {
  row: ListRow; value: number; showDate: boolean; textColor: ColorValue; amountColor: ColorValue; dangerColor: ColorValue;
  textScale: number; stacked: boolean; iconScale: number;
  onPress: (r: ListRow) => void;
}) {
  const colors = useTheme();

  // large text / narrow screen: time + amount on one line, counterparty wraps beneath
  const timeText = formatDatetime(row.datetime, showDate ? 'ddd, dd mmm hh:MM am/pm' : 'hh:MM am/pm');

  const counterpartyEl = (
    <View style={stacked ? styles.counterpartyWrapStacked : styles.counterpartyWrap}>
      <Text
        style={[styles.counterparty, { color: textColor }]}
        numberOfLines={stacked ? undefined : 1}
      >
        {row.counterparty}
      </Text>
      {row.parts.length > 1 && <Text style={[styles.badge, { color: colors.muted }]}>×{row.parts.length}</Text>}
      {!row.receipt.counterpartyPublicId && <Unlink size={14 * iconScale} color={colors.muted as string} />}
      {row.receipt.declinedDatetime && <CircleX size={14 * iconScale} color={dangerColor as string} />}
      {getReceiptStatus(row.receipt) === 'unconfirmed' && <Clock size={14 * iconScale} color={Palette.amber} />}
      {row.parts.some((p) => p.receipt.pendingAmendmentId != null) && (<FilePenLine size={14 * iconScale} color={Palette.amber} /> )}
    </View>
  );

  if (stacked) {
    return (
      <TouchableOpacity style={styles.rowStacked} onPress={() => onPress(row)}>
        <View style={styles.rowStackedTop}>
          <Text style={[styles.time, styles.timeStacked, { color: colors.muted }]}>{timeText}</Text>
          <Text style={[styles.amount, styles.amountStacked, { color: amountColor }]}>{formatAmount(value)}</Text>
        </View>
        {counterpartyEl}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(row)}>
      {/* the time column grows with the text scale so it never clips or wraps awkwardly */}
      <Text style={[styles.time, { width: (showDate ? 124 : 58) * textScale, color: colors.muted }]}>{timeText}</Text>
      {counterpartyEl}
      <Text style={[styles.amount, { color: amountColor }]}>{formatAmount(value)}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  time: { fontSize: 13, fontFamily: 'Courier' }, // width and colour are set inline
  counterpartyWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  counterparty: { fontSize: 15, fontFamily: 'Courier', flexShrink: 1 },
  badge: { fontSize: 11, fontFamily: 'Courier' },
  amount: { fontSize: 15, fontFamily: 'Courier', fontWeight: '600' },

  // stacked rows (large text / narrow screens)
  rowStacked: { paddingVertical: 8, gap: 2 },
  rowStackedTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  timeStacked: { flex: 1, flexShrink: 1 },
  amountStacked: { flexShrink: 0 },
  counterpartyWrapStacked: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
});