import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CheckCheck, CircleX, Clock, FilePenLine, ScanQrCode, Unlink, X } from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';
import type { CounterpartyLink } from '../hooks/use-counterparty-link';
import type { Receipt } from '../types';
import { getReceiptStatus } from '../utils/receipts';
import { Palette, TAP_SLOP } from '@/constants/theme';
import CounterpartyPickerModal, { type CounterpartyOption } from './counterparty-picker-modal';

type CounterpartyFieldProps = {
  receipt: Receipt;
  editable: boolean;
  isEditing: boolean;
  name: string;
  linkedId: string | null;
  link: CounterpartyLink;
  options: CounterpartyOption[];
  onPick: (name: string, unregisteredId: string | null) => void;
  onFocus: () => void;
};

export function CounterpartyField({ receipt, editable, isEditing, name, linkedId, link, options, onPick, onFocus }: CounterpartyFieldProps) {
  const colors = useTheme();
  const { stacked, iconScale } = useAdaptiveLayout();
  const [pickerOpen, setPickerOpen] = useState(false);
  const iconSize = 22 * iconScale;
  const rowStyle = stacked ? styles.counterpartyInputRowStacked : styles.counterpartyInputRow;

  if (!editable) {
    return (
      <View style={rowStyle}>
        {!receipt.counterpartyPublicId && <Unlink size={iconSize} color={colors.muted as string} />}
        {receipt.declinedDatetime && <CircleX size={iconSize} color={colors.danger as string} />}
        {getReceiptStatus(receipt) === 'unconfirmed' && <Clock size={iconSize} color={Palette.amber} />}
        {receipt.pendingAmendmentId != null && <FilePenLine size={iconSize} color={Palette.amber} />}
        <Text style={[styles.counterpartyText, { color: colors.text, flexShrink: 1 }]} numberOfLines={stacked ? undefined : 1}>
          {receipt.counterpartyName}
        </Text>
      </View>
    );
  }

  const locked = isEditing && !!receipt.counterpartyPublicId;
  const a11yLabel = !linkedId ? 'Scan counterparty QR code' : link.unlinkArmed ? 'Tap to unlink counterparty' : 'Counterparty verified';

  return (
    <View style={rowStyle}>
      <TouchableOpacity
        onPress={link.onIconPress}
        disabled={isEditing}
        activeOpacity={0.7}
        hitSlop={TAP_SLOP}
        accessibilityLabel={a11yLabel}
        accessibilityRole="button"
      >
        {!linkedId ? (
          <ScanQrCode size={iconSize} color={colors.text as string} />
        ) : link.unlinkArmed ? (
          <X size={iconSize} color={colors.danger as string} />
        ) : (
          <CheckCheck size={iconSize} color={Palette.green} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.counterpartyPress}
        disabled={locked}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Choose counterparty"
        onPress={() => setPickerOpen(true)}
      >
        <Text
          style={[styles.counterpartyText, { color: name ? colors.text : colors.muted }]}
          numberOfLines={stacked ? undefined : 1}
        >
          {name || 'Counterparty'}
        </Text>
      </TouchableOpacity>

      <CounterpartyPickerModal
        visible={pickerOpen}
        options={options}
        onSelect={onPick}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  counterpartyText: { fontFamily: 'Courier', fontSize: 20, fontWeight: '700' },
  counterpartyInputRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 12 },
  counterpartyInputRowStacked: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  counterpartyPress: { flex: 1 },
});