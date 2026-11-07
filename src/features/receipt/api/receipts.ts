import { supabase } from '@/lib/supabase';
import type { AmendmentOutcome, AmendmentProposal, NewReceipt, Receipt } from '../types';
import { toProposal, toReceipt, type LinkedInfo, type ProposalRow, type ReceiptRow } from './mappers';

const positions = () => supabase.schema('positions');

/** Logs and throws, so callers (and the sheet) see a failure. */
const check = (name: string, error: { message: string } | null) => {
  if (error) {
    console.log(`${name} failed:`, JSON.stringify(error));
    throw new Error(error.message);
  }
};

const legPayload = (input: NewReceipt, withIds: boolean) =>
  input.transactions.flatMap((tx, txIndex) =>
    tx.legs.map((leg) => ({
      ...(withIds && { transaction_leg_id: leg.transactionLegId ?? null }),
      transaction_leg_order: txIndex + 1,
      instrument_name: leg.instrument.trim(),
      quantity: leg.quantity,
      settlement_datetime: leg.settlementDatetime ? leg.settlementDatetime.toISOString() : null,
      expiry_datetime: leg.expiryDatetime ? leg.expiryDatetime.toISOString() : null,
      is_excluded: leg.isExcluded,
    }))
  );

// ----- read -----

export async function fetchReceipts(userId: string): Promise<Receipt[]> {
  const { data, error } = await positions()
    .from('receipts')
    .select(`
      receipt_id, agreement_datetime, confirmation_datetime, declined_datetime, pending_amendment_id, positive_user_id, negative_user_id,
      shared_notes,
      receipt_personal_annotations ( tags, personal_notes ),
      transaction_legs (
        transaction_leg_id, transaction_leg_order, instrument_name,
        quantity, settlement_datetime, expiry_datetime, is_excluded
      )
    `)
    .or(`positive_user_id.eq.${userId},and(negative_user_id.eq.${userId},declined_datetime.is.null)`)
    .order('agreement_datetime', { ascending: false });

  check('receipts load', error);

  const { data: names, error: namesError } = await positions().rpc('get_counterparty_names');
  if (namesError) console.log('counterparty names failed to load:', JSON.stringify(namesError));

  const linkedByReceipt = new Map<string, LinkedInfo>(
    ((names ?? []) as {
      receipt_id: string;
      display_name: string | null;
      counterparty_public_id: string | null;
      unregistered_counterparty_id: string | null;
      counterparty_identifier: string | null;
    }[]).map((n) => [
      n.receipt_id,
      {
        name: n.display_name,
        publicId: n.counterparty_public_id,
        unregisteredId: n.unregistered_counterparty_id,
        identifier: n.counterparty_identifier,
      },
    ])
  );

  return (data as unknown as ReceiptRow[]).map((r) => toReceipt(r, userId, linkedByReceipt.get(r.receipt_id)));
}

// ----- write -----

export async function createReceipt(input: NewReceipt) {
  const { error } = await positions().rpc('create_receipt', {
    p_agreement_datetime: input.agreementDatetime.toISOString(),
    p_counterparty_name: input.counterpartyName,
    p_counterparty_public_id: input.counterpartyPublicId,
    p_unregistered_counterparty_public_id: input.unregisteredCounterpartyId ?? null,
    p_shared_notes: input.sharedNotes,
    p_personal_notes: input.personalNotes,
    p_tags: input.tags ?? [],
    p_legs: legPayload(input, false),
  });
  check('create_receipt', error);
}

export async function updateReceiptShared(receiptId: string, input: NewReceipt) {
  const { error } = await positions().rpc('update_receipt', {
    p_receipt_id: receiptId,
    p_agreement_datetime: input.agreementDatetime.toISOString(),
    p_counterparty_name: input.counterpartyName,
    p_shared_notes: input.sharedNotes,
    p_personal_notes: input.personalNotes,
    p_tags: input.tags ?? [],
    p_legs: legPayload(input, true),
  });
  check('update_receipt', error);
}

export async function requestAmendment(receiptId: string, input: NewReceipt) {
  const { error } = await positions().rpc('request_amendment', {
    p_receipt_id: receiptId,
    p_agreement_datetime: input.agreementDatetime.toISOString(),
    p_shared_notes: input.sharedNotes,
    p_legs: legPayload(input, true),
  });
  check('request_amendment', error);
}

export async function updateReceiptPersonal(receiptId: string, input: NewReceipt) {
  const { error } = await positions().rpc('update_receipt_personal', {
    p_receipt_id: receiptId,
    p_tags: input.tags ?? [],
    p_personal_notes: input.personalNotes,
  });
  check('update_receipt_personal', error);
}

export async function deleteReceipt(receiptId: string) {
  const { error } = await positions().rpc('delete_receipt', { p_receipt_id: receiptId });
  check('delete_receipt', error);
}

export async function confirmReceipt(receiptId: string) {
  const { error } = await positions().rpc('confirm_receipt', { p_receipt_id: receiptId });
  check('confirm_receipt', error);
}

export async function declineReceipt(receiptId: string) {
  const { error } = await positions().rpc('decline_receipt', { p_receipt_id: receiptId });
  check('decline_receipt', error);
}

// ----- live updates -----

/** Calls onChange when a receipt I'm part of changes. Returns the unsubscribe function. */
export function subscribeToReceipts(userId: string, onChange: () => void, holdsReceipt: (receiptId: string) => boolean) {
  const channel = supabase
    .channel(`receipts:${userId}`)
    // a receipt someone sent me
    .on('postgres_changes', { event: 'INSERT', schema: 'positions', table: 'receipts', filter: `negative_user_id=eq.${userId}` }, onChange)
    // confirmed / declined / changed, from either side
    .on('postgres_changes', { event: 'UPDATE', schema: 'positions', table: 'receipts', filter: `positive_user_id=eq.${userId}` }, onChange)
    .on('postgres_changes', { event: 'UPDATE', schema: 'positions', table: 'receipts', filter: `negative_user_id=eq.${userId}` }, onChange)
    // withdrawn: delete events can't be filtered and only carry the id, so only reload if I hold that receipt
    .on('postgres_changes', { event: 'DELETE', schema: 'positions', table: 'receipts' }, (payload) => {
      const deletedId = (payload.old as { receipt_id?: string }).receipt_id;
      if (deletedId && holdsReceipt(deletedId)) onChange();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function resolveAmendment(amendmentId: number, outcome: AmendmentOutcome) {
  const { error } = await positions().rpc('resolve_amendment', { p_amendment_id: amendmentId, p_outcome: outcome });
  check('resolve_amendment', error);
}

export async function fetchPendingAmendment(receiptId: string): Promise<AmendmentProposal | null> {
  const { data, error } = await positions().rpc('get_pending_amendment', { p_receipt_id: receiptId });
  check('get_pending_amendment', error);
  const row = (data as ProposalRow[] | null)?.[0];
  return row ? toProposal(row) : null;
}