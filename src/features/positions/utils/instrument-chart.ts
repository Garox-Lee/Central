import { buildDatetimeEvents, getTotalQuantity, type Receipt } from '@/features/receipt';
import { formatDatetime } from '@/utils/datetime';
import { formatAmount, round6 } from '@/utils/format-numbers';
import type { ChartPoint } from '../components/positions-chart';

type Step = { time: number; settle: number; agree: number; settleIds: Set<string> };

const TITLE = 'ddd, dd mmm h:MM am/pm';

// every settlement and agreement increment for one instrument, merged by instant, oldest first
const collectSteps = (receipts: Receipt[], instrument: string, asOf: number): Step[] => {
  const byTime = new Map<number, Step>();
  const at = (time: number) => {
    let s = byTime.get(time);
    if (!s) {
      s = { time, settle: 0, agree: 0, settleIds: new Set() };
      byTime.set(time, s);
    }
    return s;
  };

  for (const r of receipts) {
    if (r.agreementDatetime.getTime() > asOf) continue; // not agreed yet as of this date

    // settlement: same events as the receipt's datetime view (settle, and the reversing expiry)
    for (const e of buildDatetimeEvents(r)) {
      if (e.instrument !== instrument) continue;
      const s = at(e.datetime.getTime());
      s.settle += e.quantity;
      s.settleIds.add(r.receiptId);
    }
    // agreement: same rule as the agreement list (getTotalQuantity at the agreement time)
    const hasLeg = r.transactions.some((tx) => tx.legs.some((l) => !l.isExcluded && l.instrument === instrument));
    if (hasLeg) at(r.agreementDatetime.getTime()).agree += getTotalQuantity(r, instrument);
  }

  return [...byTime.values()].sort((a, b) => a.time - b.time);
};

// cumulative: one point per instant, carrying both running totals
// incremental: settlement increments only, no agreement
export const buildInstrumentChart = (
  receipts: Receipt[],
  instrument: string,
  view: 'cumulative' | 'incremental',
  asOf: number
): ChartPoint[] => {
  const steps = collectSteps(receipts, instrument, asOf);

  if (view === 'incremental') {
    return steps
      .filter((s) => round6(s.settle) !== 0)
      .map((s) => ({
        key: String(s.time),
        value: round6(s.settle),
        label: '',
        title: formatDatetime(new Date(s.time), TITLE),
        detail: `${s.settleIds.size} receipt${s.settleIds.size === 1 ? '' : 's'}`,
        time: s.time,
      }));
  }

  let settled = 0;
  let agreed = 0;
  return steps.map((s) => {
    settled += s.settle;
    agreed += s.agree;
    return {
      key: String(s.time),
      value: round6(settled),
      agreed: round6(agreed),
      label: '',
      title: formatDatetime(new Date(s.time), TITLE),
      detail: `agreed ${formatAmount(round6(agreed))}`,
      time: s.time,
    };
  });
};