import { formatDatetime } from '@/utils/datetime';
import { FMT } from '../constants';
import type { Leg, LegDateField, ReceiptTransaction } from '../types';

export const newLeg = (order: number): Leg => ({
  transactionLegOrder: order,
  instrument: '',
  quantity: 0,
  settlementDatetime: null,
  expiryDatetime: null,
  isExcluded: false,
});

const effectiveSettlement = (leg: Leg, receiptDatetime: Date) => leg.settlementDatetime ?? receiptDatetime;

export const legDates = (leg: Leg) =>
  [
    leg.settlementDatetime && `Settles: ${formatDatetime(leg.settlementDatetime, FMT.full)}`,
    leg.expiryDatetime && `Expires: ${formatDatetime(leg.expiryDatetime, FMT.full)}`,
  ]
    .filter(Boolean)
    .join(' - ');

export const validateLegDate = (leg: Leg | undefined, field: LegDateField, date: Date | null, agreement: Date): string | null => {
  if (!leg) return null;
  if (field === 'settlement' && leg.expiryDatetime && leg.expiryDatetime.getTime() <= (date ?? agreement).getTime()) {
    return 'Settlement date must be before the expiry date.';
  }
  if (field === 'expiry' && date && date.getTime() <= effectiveSettlement(leg, agreement).getTime()) {
    return 'Expiry date must be after the settlement date.';
  }
  return null;
};

// 10% GST inclusive: GST = AUD * 0.1/1.1, sign flipped (AUD is negative when you pay, GST is positive)
export const calcGST = (aud: number) => {
  const raw = (-0.1 / 1.1) * aud;
  const rounded = Math.sign(raw) * Math.round((Math.abs(raw) + Number.EPSILON) * 100) / 100;
  return rounded + 0; // avoids -0
};

// First AUD leg with a non-zero quantity, or null
export const findAudQty = (tx: ReceiptTransaction): number | null => {
  const leg = tx.legs.find((l) => l.instrument === 'AUD' && Number(l.quantity) !== 0 && !Number.isNaN(Number(l.quantity)));
  return leg ? Number(leg.quantity) : null;
};