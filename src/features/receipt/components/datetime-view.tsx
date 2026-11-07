import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';
import { useNow } from '@/hooks/use-now';
import { formatDatetime } from '@/utils/datetime';
import { formatQty, qtyColor } from '@/utils/format-numbers';
import { FMT } from '../constants';
import { buildDatetimeEvents, buildDatetimeRows, groupEventsByDate } from '../utils/datetime-events';
import type { Receipt } from '../types';
import { NowDivider } from '@/components/now-divider'

// Owns the 60s clock, so only this subtree re-renders each minute.
export const DatetimeView = memo(function DatetimeView({ receipt }: { receipt: Receipt }) {
  const colors = useTheme();
  const { textScale, stacked } = useAdaptiveLayout();
  const now = useNow();
  const groups = useMemo(() => groupEventsByDate(buildDatetimeEvents(receipt)), [receipt]);
  const rows = useMemo(() => buildDatetimeRows(groups, now), [groups, now]);
  const timeWidth = 58 * textScale;

  return (
    <View>
      {rows.map((row) => {
        if (row.type === 'header') {
          return (
            <Text key={`h-${row.dateKey}`} style={[styles.dateGroupHeader, { color: colors.text }]}>
              {row.label}
            </Text>
          );
        }
        if (row.type === 'divider') {
          return <NowDivider key="now-divider" />;
        }

        const { event } = row;
        const time = formatDatetime(event.datetime, FMT.time);
        const qty = <Text style={[styles.legQty, { color: qtyColor(event.quantity, colors) }]}>{formatQty(event)}</Text>;

        // stacked: time + quantity on the first line, instrument wraps beneath
        return stacked ? (
          <View key={row.key} style={styles.eventRowStacked}>
            <View style={styles.eventRowStackedTop}>
              <Text style={[styles.eventTimeStacked, { color: colors.muted }]}>{time}</Text>
              {qty}
            </View>
            <Text style={[styles.instrumentStacked, { color: colors.text }]}>{event.instrument}</Text>
          </View>
        ) : (
          <View key={row.key} style={styles.eventRow}>
            <Text style={[styles.eventTime, { color: colors.muted, width: timeWidth }]}>{time}</Text>
            <Text style={[styles.legName, { color: colors.text }]}>{event.instrument}</Text>
            {qty}
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  legName: { flex: 1, marginRight: 12, fontSize: 14, fontFamily: 'Courier' },
  legQty: { fontSize: 14, fontFamily: 'Courier', fontWeight: '600', flexShrink: 0 },
  dateGroupHeader: { fontSize: 14, fontFamily: 'Courier', fontWeight: '700', marginTop: 6, paddingVertical: 3 },
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  eventTime: { fontSize: 13, fontFamily: 'Courier' }, // width set inline
  eventRowStacked: { paddingVertical: 8, gap: 2 },
  eventRowStackedTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eventTimeStacked: { fontSize: 13, fontFamily: 'Courier', flex: 1, flexShrink: 1 },
  instrumentStacked: { fontSize: 14, fontFamily: 'Courier' },
});