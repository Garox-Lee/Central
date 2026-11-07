import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { aggregateLegs } from '../utils/receipts';
import { formatQty, qtyColor } from '@/utils/format-numbers';
import type { Receipt } from '../types';

export const AggregateView = memo(function AggregateView({ receipt }: { receipt: Receipt }) {
  const colors = useTheme();
  const legs = useMemo(() => aggregateLegs(receipt), [receipt]);

  return (
    <View style={styles.aggList}>
      {legs.map((leg, i) => (
        <View key={i} style={styles.aggRow}>
          <Text style={[styles.txIndex, { color: colors.muted }]}>{i + 1}.</Text>
          <View style={[styles.txLegs, styles.row]}>
            <Text style={[styles.legName, { color: colors.text }]}>{leg.instrument}</Text>
            <Text style={[styles.legQty, { color: qtyColor(leg.quantity, colors) }]}>{formatQty(leg)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txIndex: { fontSize: 14, fontFamily: 'Courier' },
  txLegs: { flex: 1 },
  legName: { flex: 1, marginRight: 12, fontSize: 14, fontFamily: 'Courier' },
  legQty: { fontSize: 14, fontFamily: 'Courier', fontWeight: '600', flexShrink: 0 },
  aggList: { marginTop: 20, gap: 8 },
  aggRow: { flexDirection: 'row', gap: 8 },
});