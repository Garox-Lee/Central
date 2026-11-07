import type { CounterpartyOption } from './components/counterparty-picker-modal';

export type Leg = {
  transactionLegId?: number;
  transactionLegOrder: number;
  instrument: string;
  quantity: number;
  settlementDatetime: Date | null;
  expiryDatetime: Date | null;
  isExcluded: boolean;
};

export type ReceiptTransaction = {
  legs: Leg[];
};

export type Receipt = {
  receiptId: string;
  agreementDatetime: Date;
  confirmationDatetime: Date | null;
  declinedDatetime: Date | null;
  counterpartyName: string;
  counterpartyPublicId: string | null;
  unregisteredCounterpartyId?: string | null;
  counterpartyIdentifier?: string | null;
  sharedNotes: string;
  isNegativeParty: boolean;
  tags?: string[];
  personalNotes: string;
  transactions: ReceiptTransaction[];
  pendingAmendmentId?: number | null;
};

export type NewReceipt = {
  counterpartyName: string;
  counterpartyPublicId: string | null;
  unregisteredCounterpartyId?: string | null;
  agreementDatetime: Date;
  tags?: string[];
  sharedNotes: string;
  personalNotes: string;
  transactions: ReceiptTransaction[];
};

export type ReceiptStatus =
  | 'unlinked'
  | 'unconfirmed'
  | 'declined'
  | 'confirmed';

export type Props = {
  receipt: Receipt;
  onClose: () => void;
  editable?: boolean;
  onSave?: (receipt: NewReceipt) => void | Promise<void>;
  onUpdate?: (
    receiptId: string,
    receipt: NewReceipt
  ) => void | Promise<void>;
  onDelete?: (receiptId: string) => void | Promise<void>;
  onConfirm?: (receiptId: string) => void | Promise<void>;
  onDecline?: (receiptId: string) => void | Promise<void>;
  onResolveAmendment?: (amendmentId: number, outcome: AmendmentOutcome) => void | Promise<void>;
  onWithdrawForEdit?: (receiptId: string, amendmentId: number) => Promise<AmendmentProposal | null>;
  counterpartyOptions?: CounterpartyOption[];
};

export type ViewMode = 'aggregate' | 'legs' | 'datetime';

export type Busy = 'save' | 'delete' | 'confirm' | 'decline' | 'withdraw_edit' | `amend_${AmendmentOutcome}`;

export type DatetimeEvent = {
  datetime: Date;
  instrument: string;
  quantity: number;
};

export type DatetimeGroup = {
  dateKey: string;
  label: string;
  events: DatetimeEvent[];
};

export type DatetimeRow =
  | { type: 'header'; dateKey: string; label: string }
  | {
      type: 'event';
      dateKey: string;
      event: DatetimeEvent;
      key: string;
    }
  | { type: 'divider' };

export type LegDateField = 'settlement' | 'expiry';

export type ActiveLegPicker = {
  txIndex: number;
  legIndex: number;
  field: LegDateField;
};

export type FormValues = {
  counterpartyName: string;
  counterpartyPublicId: string | null;
  unregisteredCounterpartyId: string | null;
  agreementDatetime: Date;
  sharedNotes: string;
  personalNotes: string;
  tags: string[];
  transactions: ReceiptTransaction[];
};

export type LegOps = {
  setInstrument: (tx: number, leg: number, value: string) => void;
  setQuantity: (tx: number, leg: number, text: string) => void;
  setDate: (tx: number, leg: number, field: LegDateField, date: Date | null) => string | null;
  addLeg: (tx: number) => void;
  deleteLeg: (tx: number, leg: number) => void;
  deleteTransaction: (tx: number) => void;
  addTransaction: () => void;
  setGST: (txIndex: number, amount: number) => void;
  setExcluded: (tx: number, leg: number, value: boolean) => void;
};

export type TagApi = {
  draft: string;
  change: (text: string) => void;
  commit: (raw: string) => void;
  remove: (tag: string) => void;
  keyPress: (e: { nativeEvent: { key: string } }) => void;
};

export type AmendmentOutcome = 'accepted' | 'declined' | 'withdrawn';

export type AmendmentProposal = {
  amendmentId: number;
  byMe: boolean;
  agreementDatetime: Date;
  sharedNotes: string;
  transactions: ReceiptTransaction[];
};