import { useCallback, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Unlink } from 'lucide-react-native';

import { AppText as Text } from '@/components/app-text';
import { useTheme } from '@/hooks/use-theme';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';
import { formatDatetime } from '@/utils/datetime';
import { formatAmount, qtyColor } from '@/utils/format-numbers';
import type { Receipt } from '@/features/receipt';
import type { ListRow } from '../types';

const renderBackdrop = (props: any) => (
  <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
);

type Props = {
  row: ListRow;
  /** Called once the sheet has finished closing; `chosen` is the receipt the user picked, if any. */
  onClose: (chosen: Receipt | null) => void;
};

export function ReceiptPickerSheet({ row, onClose }: Props) {
  const colors = useTheme();
  const { height: screenHeight, stacked, iconScale } = useAdaptiveLayout();
  const sheetRef = useRef<BottomSheet>(null);
  const pending = useRef<Receipt | null>(null); // receipt to open once the sheet has finished closing

  const handleClosed = useCallback(() => onClose(pending.current), [onClose]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      containerStyle={styles.sheetContainer}
      enableDynamicSizing
      maxDynamicContentSize={screenHeight * 0.7}
      enablePanDownToClose
      enableOverDrag={false}
      backdropComponent={renderBackdrop}
      onClose={handleClosed}
      backgroundStyle={{ backgroundColor: colors.background }}
      handleIndicatorStyle={{ backgroundColor: colors.muted }}
    >
      <BottomSheetScrollView contentContainerStyle={[styles.sheetContent, { minHeight: screenHeight * 0.3 }]}>
        <View style={[styles.sheetHeader, stacked && styles.sheetHeaderStacked]}>
          <Text style={[styles.sheetTime, { color: colors.muted }]}>
            {formatDatetime(row.datetime, 'ddd, dd mmm hh:MM am/pm')}
          </Text>
          <View style={stacked ? styles.counterpartyWrapStacked : styles.counterpartyWrap}>
            <Text style={[styles.counterparty, { color: colors.text }]} numberOfLines={stacked ? undefined : 1}>
              {row.counterparty}
            </Text>
            {!row.receipt.counterpartyPublicId && <Unlink size={14 * iconScale} color={colors.muted as string} />}
          </View>
        </View>

        {/* newest agreement first */}
        {[...row.parts]
          .sort((a, b) => b.receipt.agreementDatetime.getTime() - a.receipt.agreementDatetime.getTime())
          .map((p) => (
            <TouchableOpacity
              key={String(p.receipt.receiptId)}
              style={styles.sheetRow}
              onPress={() => {
                pending.current = p.receipt;
                sheetRef.current?.close(); // slides down, then onClose reports the choice
              }}
            >
              <Text style={[styles.counterparty, { color: colors.text }]} numberOfLines={stacked ? undefined : 1}>
                {formatDatetime(p.receipt.agreementDatetime, 'ddd, dd mmm hh:MM am/pm')}
              </Text>
              <Text style={[styles.amount, { color: qtyColor(p.amount, colors) }]}>{formatAmount(p.amount)}</Text>
            </TouchableOpacity>
          ))}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetContainer: { zIndex: 100, elevation: 100 },
  sheetContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, gap: 4 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sheetHeaderStacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  sheetTime: { fontSize: 13, fontFamily: 'Courier' }, // colour set inline
  counterpartyWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  counterpartyWrapStacked: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  counterparty: { fontSize: 15, fontFamily: 'Courier', flexShrink: 1 },
  amount: { fontSize: 15, fontFamily: 'Courier', fontWeight: '600', flexShrink: 0 },
});