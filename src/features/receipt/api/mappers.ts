import type { AmendmentProposal, Leg, Receipt, ReceiptTransaction } from '../types';

type LegRow = {
  transaction_leg_id: number | null;
  transaction_leg_order: number;
  instrument_name: string;
  quantity: number;
  settlement_datetime: string | null;
  expiry_datetime: string | null;
  is_excluded?: boolean | null;
};

export type ReceiptRow = {
  receipt_id: string;
  agreement_datetime: string;
  confirmation_datetime: string | null;
  declined_datetime: string | null;
  positive_user_id: string | null;
  negative_user_id: string | null;
  unregistered_counterparty_user_id: string | null;
  shared_notes: string | null;
  personal_notes: string | null;
  receipt_personal_annotations: { tags: string[]; personal_notes: string | null }[];
  transaction_legs: LegRow[];
  pending_amendment_id: number | null;
};

export type ProposalRow = {
  amendment_id: number;
  by_me: boolean;
  agreement_datetime: string;
  shared_notes: string | null;
  legs: LegRow[];
};

/** Legs sharing a transaction_leg_order form one transaction. Legs without an id (new in a proposal) keep their given order, after saved ones. */
function toTransactions(rows: LegRow[], sign: 1 | -1): ReceiptTransaction[] {
  const idOf = (l: LegRow) => l.transaction_leg_id ?? Number.MAX_SAFE_INTEGER;
  const legs = [...rows].sort(
    (a, b) => a.transaction_leg_order - b.transaction_leg_order || idOf(a) - idOf(b)
  );

  const groups = new Map<number, Leg[]>();
  for (const l of legs) {
    const group = groups.get(l.transaction_leg_order) ?? [];
    group.push({
      transactionLegId: l.transaction_leg_id ?? undefined,
      transactionLegOrder: l.transaction_leg_order,
      instrument: l.instrument_name,
      quantity: sign * l.quantity,
      settlementDatetime: l.settlement_datetime ? new Date(l.settlement_datetime) : null,
      expiryDatetime: l.expiry_datetime ? new Date(l.expiry_datetime) : null,
      isExcluded: l.is_excluded ?? false,
    });
    groups.set(l.transaction_leg_order, group);
  }
  return [...groups.values()].map((legs) => ({ legs }));
}

export const toProposal = (row: ProposalRow): AmendmentProposal => ({
  amendmentId: row.amendment_id,
  byMe: row.by_me,
  agreementDatetime: new Date(row.agreement_datetime),
  sharedNotes: row.shared_notes ?? '',
  transactions: toTransactions(row.legs, 1), // the database already put the signs in this viewer's view
});

export type LinkedInfo = {
  name: string | null;
  publicId: string | null;
  unregisteredId: string | null;
  identifier: string | null;
};

export function toReceipt(row: ReceiptRow, viewerId: string, linked?: LinkedInfo): Receipt {
  // legs are stored from the positive user's point of view; flip for the negative user
  const isNegativeParty = row.positive_user_id !== viewerId;
  const sign = isNegativeParty ? -1 : 1;
  const confirmation = row.confirmation_datetime ? new Date(row.confirmation_datetime) : null;

  return {
    receiptId: row.receipt_id,
    agreementDatetime: new Date(row.agreement_datetime),
    confirmationDatetime: confirmation,
    declinedDatetime: row.declined_datetime ? new Date(row.declined_datetime) : null,
    isNegativeParty,
    counterpartyName:
      row.positive_user_id === row.negative_user_id ? 'Self' : linked?.name ?? 'Central User',
    counterpartyPublicId: linked?.publicId ?? null,
    unregisteredCounterpartyId: linked?.unregisteredId ?? null,
    counterpartyIdentifier: linked?.identifier ?? null,
    sharedNotes: row.shared_notes ?? '',
    personalNotes: row.receipt_personal_annotations?.[0]?.personal_notes ?? '',
    tags: row.receipt_personal_annotations?.[0]?.tags ?? [],
    transactions: toTransactions(row.transaction_legs, sign),
    pendingAmendmentId: row.pending_amendment_id ?? null,
  };
}