import { useEffect, useRef, useState } from 'react';

import { SAVE_CLOSE_DELAY_MS } from '../constants';
import type { AmendmentOutcome, AmendmentProposal, Busy, NewReceipt, Props } from '../types';

type ActionDeps = Pick<Props, 'onSave' | 'onUpdate' | 'onDelete' | 'onConfirm' | 'onDecline' | 'onResolveAmendment' | 'onWithdrawForEdit'> & {
  receiptId: string;
  close: () => void;
  notify: (message: string) => void;
};

export function useReceiptActions({ receiptId, onSave, onUpdate, onDelete, onConfirm, onDecline, onResolveAmendment, onWithdrawForEdit, close, notify }: ActionDeps) {
  const [pending, setPending] = useState<Busy | null>(null); // only one async action at a time
  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  /** Runs fn with `pending` set; resolves true on success, false on failure. */
  const run = async (kind: Busy, fn: () => void | Promise<void>) => {
    setPending(kind);
    try {
      await fn();
      return true;
    } catch {
      return false;
    } finally {
      setPending(null);
    }
  };

  // ----- save / update -----
  const submit = async (fn: () => void | Promise<void>, validationError: string | null, failMessage: string) => {
    if (pending || saved) return;
    if (validationError) return notify(validationError);
    if (!(await run('save', fn))) return notify(failMessage);
    setSaved(true);
    closeTimer.current = setTimeout(close, SAVE_CLOSE_DELAY_MS); // sheet slides down; onClose unmounts
  };

  const save = (values: NewReceipt, validationError: string | null) =>
    submit(async () => { await onSave?.(values); }, validationError, 'Could not save. Try again.');

  const saveChanges = (values: NewReceipt, validationError: string | null) => {
    if (!validationError && !onUpdate) return notify('Saving changes is not available yet.');
    return submit(async () => { await onUpdate!(receiptId, values); }, validationError, 'Could not save changes. Try again.');
  };

  // ----- confirm / decline -----
  const respond = async (
    kind: Busy,
    handler: ((id: string) => void | Promise<void>) | undefined,
    unavailable: string,
    failed: string
  ) => {
    if (pending) return;
    if (!handler) return notify(unavailable);
    if (!(await run(kind, () => handler(receiptId)))) return notify(failed);
    close();
  };

  const confirm = () => respond('confirm', onConfirm, 'Confirming is coming soon.', 'Could not confirm. Try again.');
  const decline = () => respond('decline', onDecline, 'Declining is coming soon.', 'Could not decline. Try again.');
  const resolveAmendment = (amendmentId: number, outcome: AmendmentOutcome) =>
    respond(
      `amend_${outcome}`,
      onResolveAmendment && (() => onResolveAmendment(amendmentId, outcome)),
      'Amendments are not available yet.',
      `Could not ${outcome === 'accepted' ? 'accept' : outcome === 'declined' ? 'decline' : 'withdraw'} the amendment. Try again.`
    );

  const withdrawForEdit = async (amendmentId: number) => {
    if (pending) return null;
    if (!onWithdrawForEdit) {
      notify('Amendments are not available yet.');
      return null;
    }
    let proposal = null as AmendmentProposal | null;
    const ok = await run('withdraw_edit', async () => {
      proposal = await onWithdrawForEdit(receiptId, amendmentId);
    });
    if (!ok) notify('Could not withdraw the amendment. Try again.');
    return ok ? proposal : null;
  };

  // ----- delete -----
  const openDelete = () => {
    setDeleteError(null);
    setDeleteOpen(true);
  };
  const closeDelete = () => setDeleteOpen(false);

  const confirmDelete = async () => {
    if (pending || !onDelete) return;
    setDeleteError(null);
    if (!(await run('delete', () => onDelete(receiptId)))) return setDeleteError('Could not delete. Try again.');
    setDeleteOpen(false);
    close();
  };

  return { pending, saved, deleteOpen, deleteError, save, saveChanges, confirm, decline, resolveAmendment, openDelete, closeDelete, confirmDelete, withdrawForEdit };
}