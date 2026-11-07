import { useState } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';

import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { pickDateTimeAndroid } from '../utils/platform-pickers';
import type { ActiveLegPicker, LegDateField, LegOps, ReceiptTransaction } from '../types';
import { LegRow } from './leg-row';
import { TAP_SLOP } from '@/constants/theme';
import { calcGST, findAudQty } from '../utils/legs';

type LegsViewProps = {
  transactions: ReceiptTransaction[];
  qtyText: Record<string, string>;
  editable: boolean;
  canAddTransaction: boolean;
  ops: LegOps;
  onFocus: () => void;
  onAlert: (message: string) => void;
};

export function LegsView({ transactions, qtyText, editable, canAddTransaction, ops, onFocus, onAlert }: LegsViewProps) {
  const colors = useTheme();
  const { textScale } = useAdaptiveLayout();
  const [armedTx, setArmedTx] = useState<number | null>(null); // tap a tx number twice to delete it
  const [picker, setPicker] = useState<ActiveLegPicker | null>(null); // inline iOS picker target
  const gutter = { width: 18 * textScale };

  const focus = () => {
    setArmedTx(null);
    onFocus();
  };

  const pressGst = (tx: number) => {
    const aud = findAudQty(transactions[tx]);
    if (aud === null) return;
    ops.setGST(tx, calcGST(aud));
    focus();
  };

  const applyDate = (tx: number, leg: number, field: LegDateField, date: Date | null) => {
    const error = ops.setDate(tx, leg, field, date);
    if (error) {
      onAlert(error);
      setPicker(null);
    }
  };

  const openDate = (tx: number, leg: number, field: LegDateField) => {
    if (!editable) return;
    if (Platform.OS === 'android') {
      const current = transactions[tx]?.legs[leg];
      const initial = (field === 'settlement' ? current?.settlementDatetime : current?.expiryDatetime) ?? new Date();
      pickDateTimeAndroid(initial, (d) => applyDate(tx, leg, field, d));
      return;
    }
    setPicker({ txIndex: tx, legIndex: leg, field });
    focus();
  };

  const clearDate = (tx: number, leg: number, field: LegDateField) => {
    applyDate(tx, leg, field, null);
    setPicker(null);
  };

  const pressTxIndex = (tx: number) => {
    if (armedTx === tx) {
      ops.deleteTransaction(tx);
      setArmedTx(null);
    } else {
      setArmedTx(tx);
    }
  };

  const renderGutter = (tx: number, leg: number) => {
    if (leg > 0) {
      return (
        editable && (
          <TouchableOpacity onPress={() => ops.deleteLeg(tx, leg)} activeOpacity={0.7} hitSlop={6}>
            <Text style={[styles.legRowDeleteText, { color: colors.danger }]}>✕</Text>
          </TouchableOpacity>
        )
      );
    }
    const armed = armedTx === tx;
    const label = <Text style={[styles.txIndex, { color: armed ? colors.danger : colors.muted }]}>{armed ? '✕' : `${tx + 1}.`}</Text>;
    return editable ? (
      <TouchableOpacity onPress={() => pressTxIndex(tx)} hitSlop={TAP_SLOP}>
        {label}
      </TouchableOpacity>
    ) : (
      label
    );
  };

  return (
    <View style={styles.list}>
      {transactions.map((tx, i) => (
        <View key={i} style={styles.txGroup}>
          {tx.legs.map((leg, j) => (
            <View key={j} style={styles.legLine}>
              <View style={[styles.txIndexGutter, gutter]}>{renderGutter(i, j)}</View>
              <View style={styles.txLegs}>
                <LegRow
                  leg={leg}
                  editable={editable}
                  qtyText={qtyText[`${i}-${j}`]}
                  pickerField={picker?.txIndex === i && picker.legIndex === j ? picker.field : null}
                  onFocus={focus}
                  onInstrument={(v) => ops.setInstrument(i, j, v)}
                  onQuantity={(v) => ops.setQuantity(i, j, v)}
                  onPressDate={(field) => openDate(i, j, field)}
                  onClearDate={(field) => clearDate(i, j, field)}
                  onPickerChange={(field, d) => applyDate(i, j, field, d)}
                  onToggleExcluded={() => {
                    ops.setExcluded(i, j, !leg.isExcluded);
                    focus();
                  }}
                />
              </View>
            </View>
          ))}

          {editable && (() => {
            const gstEnabled = findAudQty(tx) !== null;
            return (
              <View style={styles.legLine}>
                <View style={[styles.txIndexGutter, gutter]} />
                <TouchableOpacity
                  style={[styles.gstButton, { borderColor: colors.border, opacity: gstEnabled ? 1 : 0.35 }]}
                  activeOpacity={0.7}
                  disabled={!gstEnabled}
                  onPress={() => pressGst(i)}
                >
                  <Text style={[styles.addToTxText, { color: colors.text }]}>GST</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addToTxButton, { borderColor: colors.border }]}
                  activeOpacity={0.7}
                  onPress={() => ops.addLeg(i)}
                >
                  <Text style={[styles.addToTxText, { color: colors.text }]}>+ Add</Text>
                </TouchableOpacity>
              </View>
            );
          })()}
        </View>
      ))}

      {canAddTransaction && (
        <TouchableOpacity style={[styles.addLegButton, { borderColor: colors.border }]} activeOpacity={0.7} onPress={ops.addTransaction}>
          <Text style={[styles.addLegText, { color: colors.text }]}>+ Add leg</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 20, gap: 14 },
  txGroup: { flexDirection: 'column', gap: 4 },
  legLine: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  txIndex: { fontSize: 14, fontFamily: 'Courier', lineHeight: 18 },
  txLegs: { flex: 1 },
  txIndexGutter: { alignItems: 'flex-start' },
  legRowDeleteText: { fontSize: 14, fontFamily: 'Courier', lineHeight: 18 },
  addLegButton: { borderWidth: 1, borderRadius: 8, paddingVertical: 7, alignItems: 'center', marginTop: 4 },
  addLegText: { fontSize: 14, fontFamily: 'Courier', fontWeight: '600' },
  addToTxButton: { flex: 13, borderWidth: 1, borderRadius: 6, paddingVertical: 6, alignItems: 'center', marginTop: 4 },
  addToTxText: { fontSize: 11, fontFamily: 'Courier', fontWeight: '600' },
  gstButton: { flex: 2, borderWidth: 1, borderRadius: 6, paddingVertical: 6, alignItems: 'center', marginTop: 4 },
});