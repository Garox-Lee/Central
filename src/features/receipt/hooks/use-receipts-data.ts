import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import * as api from '../api/receipts';
import { hasPersonalChanges, hasSharedChanges } from '../utils/changes';
import type { AmendmentOutcome, NewReceipt, Receipt } from '../types';

export function useReceiptsData(userId: string | null) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (id: string): Promise<Receipt[] | null> => {
    setFailed(false);
    try {
      const next = await api.fetchReceipts(id);
      setReceipts(next);
      setLoaded(true);
      return next;
    } catch {
      setFailed(true);
      setLoaded(true);
      return null;
    }
  }, []);

  useEffect(() => {
    setReceipts([]);
    setLoaded(false);
    if (userId) load(userId);
  }, [userId, load]);

  const refresh = useCallback(async () => {
    return userId ? await load(userId) : null;
  }, [userId, load]);

  // live updates: reload when a receipt I'm part of changes, and whenever the app returns to the foreground
  const receiptsRef = useRef<Receipt[]>([]);
  receiptsRef.current = receipts;

  useEffect(() => {
    if (!userId) return;
    const id = userId;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const reload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        load(id);
      }, 300); // coalesce bursts of events into one reload
    };

    const unsubscribe = api.subscribeToReceipts(id, reload, (receiptId) =>
      receiptsRef.current.some((r) => r.receiptId === receiptId)
    );

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reload();
    });

    return () => {
      if (timer) clearTimeout(timer);
      appSub.remove();
      unsubscribe();
    };
  }, [userId, load]);

  // ----- mutations: call the api, then reload -----

  const reloadAfterChange = useCallback(async () => {
    if (userId) await load(userId);
  }, [userId, load]);

  const addReceipt = useCallback(
    async (input: NewReceipt) => {
      await api.createReceipt(input);
      await reloadAfterChange();
    },
    [reloadAfterChange]
  );

  const updateReceipt = useCallback(
    async (receiptId: string, input: NewReceipt) => {
      const original = receiptsRef.current.find((r) => r.receiptId === receiptId);
      const sharedChanged = !original || hasSharedChanges(original, input);
      const personalChanged = !original || hasPersonalChanges(original, input);

      if (!sharedChanged && !personalChanged) return; // nothing to save

      if (sharedChanged && original?.confirmationDatetime) {
        // a confirmed receipt is never edited directly: shared changes go to the counterparty as an amendment
        await api.requestAmendment(receiptId, input);
        if (personalChanged) await api.updateReceiptPersonal(receiptId, input);
      } else if (sharedChanged) {
        await api.updateReceiptShared(receiptId, input);
      } else {
        await api.updateReceiptPersonal(receiptId, input);
      }

      await reloadAfterChange();
    },
    [reloadAfterChange]
  );

  const deleteReceipt = useCallback(
    async (receiptId: string) => {
      await api.deleteReceipt(receiptId);
      await reloadAfterChange();
    },
    [reloadAfterChange]
  );

  const confirmReceipt = useCallback(
    async (receiptId: string) => {
      await api.confirmReceipt(receiptId);
      await reloadAfterChange();
    },
    [reloadAfterChange]
  );

  const declineReceipt = useCallback(
    async (receiptId: string) => {
      await api.declineReceipt(receiptId);
      await reloadAfterChange();
    },
    [reloadAfterChange]
  );

  const resolveAmendment = useCallback(
    async (amendmentId: number, outcome: AmendmentOutcome) => {
      await api.resolveAmendment(amendmentId, outcome);
      await reloadAfterChange();
    },
    [reloadAfterChange]
  );

  // Read the proposal first (once withdrawn it is no longer pending), then withdraw it.
  // No reload: a withdrawal changes nothing the list shows.
  const withdrawForEdit = useCallback(async (receiptId: string, amendmentId: number) => {
    const proposal = await api.fetchPendingAmendment(receiptId);
    if (!proposal || proposal.amendmentId !== amendmentId) throw new Error('amendment is no longer pending');
    await api.resolveAmendment(amendmentId, 'withdrawn');
    return proposal;
  }, []);

  return { receipts, loaded, failed, refresh, addReceipt, updateReceipt, deleteReceipt, confirmReceipt, declineReceipt, resolveAmendment, withdrawForEdit };
}