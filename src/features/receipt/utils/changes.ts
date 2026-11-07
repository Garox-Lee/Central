import type { NewReceipt, Receipt } from '../types';

const sameDate = (a: Date | null, b: Date | null) => (a?.getTime() ?? null) === (b?.getTime() ?? null);

// anything the counterparty can see
export const hasSharedChanges = (orig: Receipt, next: NewReceipt): boolean => {
  if (orig.agreementDatetime.getTime() !== next.agreementDatetime.getTime()) return true;
  if ((orig.sharedNotes ?? '').trim() !== (next.sharedNotes ?? '').trim()) return true;
  if (!orig.counterpartyPublicId && orig.counterpartyName.trim() !== next.counterpartyName.trim()) return true;

  const before = orig.transactions.flatMap((tx, i) => tx.legs.map((leg) => ({ leg, order: i + 1 })));
  const after = next.transactions.flatMap((tx, i) => tx.legs.map((leg) => ({ leg, order: i + 1 })));
  if (before.length !== after.length) return true;

  return after.some(({ leg, order }) => {
    if (leg.transactionLegId == null) return true; // a new leg
    const old = before.find((b) => b.leg.transactionLegId === leg.transactionLegId);
    if (!old) return true;
    return (
      old.order !== order || old.leg.isExcluded !== leg.isExcluded ||
      old.leg.instrument.trim() !== leg.instrument.trim() ||
      old.leg.quantity !== leg.quantity ||
      !sameDate(old.leg.settlementDatetime, leg.settlementDatetime) ||
      !sameDate(old.leg.expiryDatetime, leg.expiryDatetime)
    );
  });
};

// anything only the editing user can see
export const hasPersonalChanges = (orig: Receipt, next: NewReceipt): boolean => {
  const before = orig.tags ?? [];
  const after = (next.tags ?? []).map((t) => t.trim()).filter(Boolean);
  return (
    before.length !== after.length ||
    before.some((t, i) => t !== after[i]) ||
    (orig.personalNotes ?? '').trim() !== (next.personalNotes ?? '').trim()
  );
};