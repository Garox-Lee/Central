import type { Receipt, ReceiptStatus } from '../types';

export const isBlankReceipt = (receipt: Receipt) => receipt.receiptId === '0';

export const getCapabilities = (p: {
  receipt: Receipt;
  status: ReceiptStatus;
  isEditing: boolean;
  isAmending?: boolean;
  pendingAmendment?: { amendmentId: number; byMe: boolean } | null;
  editableProp: boolean;
  hasDelete: boolean;
}) => {
  const { receipt, status, isEditing, isAmending = false, pendingAmendment = null, editableProp, hasDelete } = p;
  const isBlank = isBlankReceipt(receipt);
  const canEditShared = !isBlank && status !== 'confirmed' && !receipt.isNegativeParty && !receipt.declinedDatetime;
  const canAmendNow = !isBlank && status === 'confirmed';
  const canRequestAmendment = canAmendNow && !pendingAmendment;

  return {
    isBlank,
    canEditShared,
    // shared fields: creator before confirmation (Edit details), either party when amending a confirmed receipt
    editable: editableProp || (isEditing && canEditShared) || (isAmending && canAmendNow),
    personalEditable: editableProp || isEditing, // tags + personal notes
    awaitingMe: status === 'unconfirmed' && receipt.isNegativeParty,
    canRequestAmendment,
    canAnswerAmendment: !isEditing && !!pendingAmendment && !pendingAmendment.byMe,
    canWithdrawAmendment: !isEditing && !!pendingAmendment && pendingAmendment.byMe,
    canEdit: !isEditing && !isBlank,
    canDelete: !isEditing && !isBlank && hasDelete && status !== 'confirmed' && !receipt.isNegativeParty,
  };
};

export type Capabilities = ReturnType<typeof getCapabilities>;