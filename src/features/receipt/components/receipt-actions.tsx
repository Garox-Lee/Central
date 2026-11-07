import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { Capabilities } from '../utils/capabilities';
import type { AmendmentOutcome, Busy } from '../types';
import { OutlineButton } from './outline-button';
import { SaveButton } from './save-button';
import { Palette } from '@/constants/theme';

type ReceiptActionsProps = {
  caps: Capabilities;
  isEditing: boolean;
  isAmending: boolean;
  linked: boolean;
  pending: Busy | null;
  saved: boolean;
  onSave: () => void;
  onSaveChanges: () => void;
  onCancelEdit: () => void;
  onConfirm: () => void;
  onDecline: () => void;
  onAmend: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onResolveAmendment: (outcome: AmendmentOutcome) => void;
  onWithdrawAndEdit: () => void;
};

export function ReceiptActions(p: ReceiptActionsProps) {
  const colors = useTheme();
  const { caps, isEditing, pending, saved } = p;
  const busy = pending !== null;
  const saving = pending === 'save';

  return (
    <>
      {caps.editable && !isEditing && (
        <View style={styles.saveBlock}>
          <SaveButton saving={saving} saved={saved} linked={p.linked} onPress={p.onSave} />
        </View>
      )}

      {isEditing && (
        <View style={styles.saveBlock}>
          <OutlineButton
            label={
              saved
                ? p.isAmending ? 'Sent' : 'Saved'
                : saving
                  ? p.isAmending ? 'Sending…' : 'Saving…'
                  : p.isAmending ? 'Send to counterparty' : 'Save changes'
            }
            color={Palette.amber}
            marginTop={0}
            faded={saving || saved}
            disabled={busy || saved}
            onPress={p.onSaveChanges}
          />
          <OutlineButton label="Cancel" color={colors.danger} onPress={p.onCancelEdit} />
        </View>
      )}

      {caps.awaitingMe && !isEditing && (
        <>
          <OutlineButton
            label={pending === 'confirm' ? 'Confirming…' : 'Confirm receipt'}
            color={Palette.green}
            faded={pending === 'confirm'}
            disabled={busy}
            onPress={p.onConfirm}
          />
          <OutlineButton
            label={pending === 'decline' ? 'Declining…' : 'Decline'}
            color={colors.danger}
            faded={pending === 'decline'}
            disabled={busy}
            onPress={p.onDecline}
          />
        </>
      )}

      {caps.canAnswerAmendment && (
        <>
          <OutlineButton
            label={pending === 'amend_accepted' ? 'Accepting…' : 'Accept amendment'}
            color={Palette.green}
            faded={pending === 'amend_accepted'}
            disabled={busy}
            onPress={() => p.onResolveAmendment('accepted')}
          />
          <OutlineButton
            label={pending === 'amend_declined' ? 'Declining…' : 'Decline amendment'}
            color={colors.danger}
            faded={pending === 'amend_declined'}
            disabled={busy}
            onPress={() => p.onResolveAmendment('declined')}
          />
        </>
      )}

      {caps.canWithdrawAmendment && (
        <>
          <OutlineButton
            label={pending === 'withdraw_edit' ? 'Withdrawing…' : 'Withdraw and edit'}
            color={Palette.amber}
            faded={pending === 'withdraw_edit'}
            disabled={busy}
            onPress={p.onWithdrawAndEdit}
          />
          <OutlineButton
            label={pending === 'amend_withdrawn' ? 'Withdrawing…' : 'Withdraw amendment'}
            color={colors.danger}
            faded={pending === 'amend_withdrawn'}
            disabled={busy}
            onPress={() => p.onResolveAmendment('withdrawn')}
          />
        </>
      )}

      {caps.canRequestAmendment && !isEditing && <OutlineButton label="Request Amendment" color={Palette.amber} onPress={p.onAmend} />}
      {caps.canEdit && <OutlineButton label="Edit details" color={Palette.amber} onPress={p.onEdit} />}
      {caps.canDelete && <OutlineButton label="Delete receipt" color={colors.danger} onPress={p.onDelete} />}
    </>
  );
}

const styles = StyleSheet.create({
  saveBlock: { marginTop: 24 },
});