import type { Receipt } from '@/features/receipt';
import type { DatetimeType, Period } from '../types';
import { makePeriodKeyer } from './periods';

// every datetime a mode would show a row at (collapse defaults only need the dates, not the rows)
export const collectTimes = (receipts: Receipt[], type: DatetimeType): Float64Array => {
  const times: number[] = [];
  for (const r of receipts) {
    if (type === 'agreement') {
      times.push(r.agreementDatetime.getTime());
      continue;
    }
    for (const tx of r.transactions) {
      for (const leg of tx.legs) {
        times.push((leg.settlementDatetime ?? r.agreementDatetime).getTime());
        if (leg.expiryDatetime) times.push(leg.expiryDatetime.getTime());
      }
    }
  }
  return Float64Array.from(times).sort();
};

// Returns every date key except the nearest date at or before `now`
// and the nearest date after it, i.e. the days either side of the "now" divider.
export const collapseAllButNearest = (sorted: Float64Array, now: number, p: Period): Set<string> => {
  let prev = -Infinity;
  let next = Infinity;
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (t <= now) {
      if (t > prev) prev = t;
    } else if (t < next) {
      next = t;
    }
  }

  const keyOf = makePeriodKeyer(p);
  const keep = new Set<string>();
  if (prev !== -Infinity) keep.add(keyOf(prev));
  if (next !== Infinity) keep.add(keyOf(next));

  const collapsed = new Set<string>();
  for (let i = 0; i < sorted.length; i++) {
    const key = keyOf(sorted[i]);
    if (!keep.has(key)) collapsed.add(key);
  }
  return collapsed;
};