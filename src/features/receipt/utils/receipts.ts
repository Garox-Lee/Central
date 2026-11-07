import { round6 } from '@/utils/format-numbers';
import type { Leg, Receipt, ReceiptStatus } from '../types';

export type AggregatedLeg = Pick<Leg, 'instrument' | 'quantity'>;

const rank = (instrument: string) => (instrument === 'AUD' ? 1 : instrument === 'GST' ? 2 : 0);

const netQuantity = (leg: Leg) => (leg.expiryDatetime ? 0 : leg.quantity);

export const getTotalQuantity = (receipt: Receipt, instrument: string) => {
  let sum = 0;
  for (const tx of receipt.transactions) {
    for (const leg of tx.legs) {
      if (leg.isExcluded) continue;
      if (leg.instrument === instrument) sum += netQuantity(leg);
    }
  }
  return round6(sum);
};

export const aggregateLegs = (receipt: Receipt): AggregatedLeg[] => {
  const totals = new Map<string, number>();
  for (const tx of receipt.transactions) {
    for (const leg of tx.legs) {
      if (leg.isExcluded) continue;
      totals.set(leg.instrument, (totals.get(leg.instrument) ?? 0) + leg.quantity);
    }
  }
  return [...totals.entries()]
    .map(([instrument, quantity]) => ({ instrument, quantity: round6(quantity) }))
    .sort((a, b) => rank(a.instrument) - rank(b.instrument));
};

export const blankReceipt = (): Receipt => ({
  receiptId: '0',
  agreementDatetime: new Date(),
  confirmationDatetime: null,
  declinedDatetime: null,
  counterpartyName: '',
  counterpartyPublicId: null,
  sharedNotes: '',
  isNegativeParty: false,
  personalNotes: '',
  transactions: [],
});

export const getReceiptStatus = (receipt: Receipt): ReceiptStatus => {
  if (!receipt.counterpartyPublicId) return 'unlinked';
  if (receipt.declinedDatetime) return 'declined';
  return receipt.confirmationDatetime ? 'confirmed' : 'unconfirmed';
};