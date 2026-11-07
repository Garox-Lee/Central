import { useCallback, useState } from 'react';

import { newLeg, validateLegDate } from '../utils/legs';
import type { AmendmentProposal, FormValues, Leg, LegOps, NewReceipt, Receipt, ReceiptTransaction, TagApi } from '../types';
import { GST_INSTRUMENT } from '../constants';

const initialValues = (r: Receipt, blank: boolean): FormValues => ({
  counterpartyName: r.counterpartyName,
  counterpartyPublicId: r.counterpartyPublicId ?? null,
  unregisteredCounterpartyId: r.unregisteredCounterpartyId ?? null,
  agreementDatetime: r.agreementDatetime,
  sharedNotes: r.sharedNotes ?? '',
  personalNotes: r.personalNotes,
  tags: r.tags ?? [],
  transactions: blank && r.transactions.length === 0 ? [{ legs: [newLeg(1)] }] : r.transactions,
});

export function useReceiptForm(receipt: Receipt, blank: boolean) {
  const [values, setValues] = useState<FormValues>(() => initialValues(receipt, blank));
  const [qtyText, setQtyText] = useState<Record<string, string>>({}); // raw quantity text, keyed `${tx}-${leg}`
  const [tagDraft, setTagDraft] = useState('');

  const set = useCallback(
    <K extends keyof FormValues>(key: K, value: FormValues[K]) => setValues((p) => ({ ...p, [key]: value })),
    []
  );

  const setCounterparty = useCallback(
    (counterpartyName: string, counterpartyPublicId: string | null, unregisteredCounterpartyId: string | null = null) =>
      setValues((p) => ({ ...p, counterpartyName, counterpartyPublicId, unregisteredCounterpartyId })),
    []
  );

  const setTransactions = useCallback(
    (fn: (prev: ReceiptTransaction[]) => ReceiptTransaction[]) =>
      setValues((p) => ({ ...p, transactions: fn(p.transactions) })),
    []
  );

  // ----- tags -----
  const commitTag = useCallback((raw: string) => {
    const value = raw.trim();
    setTagDraft('');
    if (!value) return;
    setValues((p) =>
      p.tags.some((t) => t.toLowerCase() === value.toLowerCase()) ? p : { ...p, tags: [...p.tags, value] }
    );
  }, []);

  const tagApi: TagApi = {
    draft: tagDraft,
    commit: commitTag,
    change: (text) => (text.endsWith(',') ? commitTag(text.slice(0, -1)) : setTagDraft(text)),
    remove: (tag) => setValues((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) })),
    keyPress: (e) => {
      if (e.nativeEvent.key === 'Backspace' && tagDraft === '') {
        setValues((p) => ({ ...p, tags: p.tags.slice(0, -1) }));
      }
    },
  };

  // ----- legs + transactions -----
  const updateLeg = (tx: number, leg: number, patch: Partial<Leg>) =>
    setTransactions((prev) =>
      prev.map((t, i) =>
        i !== tx ? t : { ...t, legs: t.legs.map((l, j) => (j !== leg ? l : { ...l, ...patch })) }
      )
    );

  const legOps: LegOps = {
    setInstrument: (tx, leg, instrument) => updateLeg(tx, leg, { instrument }),

    setQuantity: (tx, leg, text) => {
      setQtyText((p) => ({ ...p, [`${tx}-${leg}`]: text }));
      const parsed = Number(text);
      updateLeg(tx, leg, { quantity: text === '' || text === '-' || Number.isNaN(parsed) ? 0 : parsed });
    },

    setExcluded: (tx, leg, isExcluded) => updateLeg(tx, leg, { isExcluded }),

    setDate: (tx, leg, field, date) => {
      const error = validateLegDate(values.transactions[tx]?.legs[leg], field, date, values.agreementDatetime);
      if (!error) updateLeg(tx, leg, field === 'settlement' ? { settlementDatetime: date } : { expiryDatetime: date });
      return error;
    },

    addLeg: (tx) =>
      setTransactions((prev) => prev.map((t, i) => (i !== tx ? t : { ...t, legs: [...t.legs, newLeg(tx + 1)] }))),

    addTransaction: () => setTransactions((prev) => [...prev, { legs: [newLeg(prev.length + 1)] }]),

    deleteLeg: (tx, leg) => {
      setTransactions((prev) =>
        prev
          .map((t, i) => (i !== tx ? t : { ...t, legs: t.legs.filter((_, j) => j !== leg) }))
          .filter((t) => t.legs.length > 0)
      );
      setQtyText({});
    },

    deleteTransaction: (tx) => {
      setTransactions((prev) => prev.filter((_, i) => i !== tx));
      setQtyText({});
    },

    setGST: (tx, amount) => {
      const legs = values.transactions[tx]?.legs ?? [];
      const existing = legs.findIndex((l) => l.instrument === GST_INSTRUMENT);
    
      if (existing >= 0) {
        // Only update the existing GST row
        updateLeg(tx, existing, { quantity: amount });
        setQtyText((p) => ({ ...p, [`${tx}-${existing}`]: String(amount) }));
      } else {
        // Append a new GST row
        const newIndex = legs.length;
        setTransactions((prev) =>
          prev.map((t, i) =>
            i !== tx ? t : { ...t, legs: [...t.legs, { ...newLeg(tx + 1), instrument: GST_INSTRUMENT, quantity: amount }] }
          )
        );
        setQtyText((p) => ({ ...p, [`${tx}-${newIndex}`]: String(amount) }));
      }
    },
  };

  /** Fills the shared fields from a withdrawn amendment so the user can fix or extend it. */
  const loadProposal = useCallback((p: AmendmentProposal) => {
    setValues((v) => ({ ...v, agreementDatetime: p.agreementDatetime, sharedNotes: p.sharedNotes, transactions: p.transactions }));
    setQtyText({});
  }, []);

  // ----- submit / reset -----
  /** Form values as sent to the server; folds in a half-typed tag. */
  const getSubmission = (): NewReceipt => {
    const draft = tagDraft.trim();
    return { ...values, tags: draft ? [...values.tags, draft] : values.tags };
  };

  const reset = () => {
    setValues(initialValues(receipt, blank));
    setQtyText({});
    setTagDraft('');
  };

  return { values, set, setCounterparty, qtyText, tagApi, legOps, loadProposal, getSubmission, reset };
}