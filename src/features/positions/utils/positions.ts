import { buildDatetimeEvents, getTotalQuantity, type Receipt } from '@/features/receipt';
import { round6 } from '@/utils/format-numbers';
import type { Position } from '../types';

type Entry = { quantity: number; agreement: number; receiptIds: Set<string>; counterparties: Set<string> };

// one counterparty = one key: linked user, else the unregistered counterparty, else the typed name
const counterpartyKey = (r: Receipt) =>
  r.counterpartyPublicId ?? r.unregisteredCounterpartyId ?? `name:${r.counterpartyName}`;

// Per instrument, as of `asOf` (ms):
//  - quantity: settlement cumulative, from the receipt's datetime events (settle, and the reversing expiry)
//  - agreement: sum of getTotalQuantity for receipts agreed at or before asOf (same rule as the agreement list)
// A receipt (and its counterparty) counts once per instrument if it contributes to either number.
export const buildPositions = (receipts: Receipt[], asOf: number): Position[] => {
  const byInstrument = new Map<string, Entry>();
  const entryFor = (instrument: string) => {
    let entry = byInstrument.get(instrument);
    if (!entry) {
      entry = { quantity: 0, agreement: 0, receiptIds: new Set(), counterparties: new Set() };
      byInstrument.set(instrument, entry);
    }
    return entry;
  };

  for (const r of receipts) {
    // as of a date, only receipts agreed on or before it exist
    if (r.agreementDatetime.getTime() > asOf) continue;

    const cp = counterpartyKey(r);

    // settlement side
    for (const e of buildDatetimeEvents(r)) {
      if (e.datetime.getTime() > asOf) continue;
      const entry = entryFor(e.instrument);
      entry.quantity += e.quantity;
      entry.receiptIds.add(r.receiptId);
      entry.counterparties.add(cp);
    }

    // agreement side
    const names = new Set<string>();
    for (const tx of r.transactions) {
      for (const leg of tx.legs) if (!leg.isExcluded) names.add(leg.instrument);
    }
    for (const name of names) {
      const entry = entryFor(name);
      entry.agreement += getTotalQuantity(r, name);
      entry.receiptIds.add(r.receiptId);
      entry.counterparties.add(cp);
    }
  }

  return [...byInstrument.entries()]
    .map(([instrument, { quantity, agreement, receiptIds, counterparties }]): Position => ({
      instrument,
      quantity: round6(quantity),
      agreement: round6(agreement),
      receiptCount: receiptIds.size,
      counterpartyCount: counterparties.size,
    }))
    .sort((a, b) => b.receiptCount - a.receiptCount || a.instrument.localeCompare(b.instrument));
};