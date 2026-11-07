import Dialog from '@/components/dialog';

type ReceiptDialogsProps = {
  deleteOpen: boolean;
  deleting: boolean;
  deleteError: string | null;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  discardOpen: boolean;
  discardingNew: boolean;
  onKeepEditing: () => void;
  onConfirmDiscard: () => void;
  alertMessage: string | null;
  onCloseAlert: () => void;
};

export function ReceiptDialogs(p: ReceiptDialogsProps) {
  return (
    <>
      <Dialog
        visible={p.deleteOpen}
        title="Delete this receipt?"
        message="This can't be undone."
        error={p.deleteError}
        onRequestClose={p.deleting ? undefined : p.onCloseDelete}
        actions={[
          { label: 'No', variant: 'outline', disabled: p.deleting, onPress: p.onCloseDelete },
          { label: p.deleting ? 'Deleting…' : 'Yes', variant: 'danger', disabled: p.deleting, onPress: p.onConfirmDelete },
        ]}
      />
      <Dialog
        visible={p.discardOpen}
        title={p.discardingNew ? 'Discard this new receipt?' : 'Discard your changes?'}
        message={
          p.discardingNew
            ? "This receipt hasn't been saved. Everything you've entered will be lost."
            : "You have unsaved edits. They'll be lost if you leave now."
        }
        onRequestClose={p.onKeepEditing}
        actions={[
          { label: 'Keep editing', variant: 'outline', onPress: p.onKeepEditing },
          { label: 'Discard', variant: 'danger', onPress: p.onConfirmDiscard },
        ]}
      />
      <Dialog
        visible={p.alertMessage !== null}
        title="Alert Message"
        message={p.alertMessage ?? ''}
        onRequestClose={p.onCloseAlert}
        actions={[{ label: 'Close', variant: 'primary', onPress: p.onCloseAlert }]}
      />
    </>
  );
}