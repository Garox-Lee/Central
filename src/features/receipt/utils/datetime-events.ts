import { formatDatetime } from '@/utils/datetime';
import { FMT } from '../constants';
import type { DatetimeEvent, DatetimeGroup, DatetimeRow, Receipt } from '../types';

const aggregateEvents = (events: DatetimeEvent[]): DatetimeEvent[] => {
  const totals = new Map<string, DatetimeEvent>();
  for (const event of events) {
    const key = `${event.datetime.getTime()}|${event.instrument}`;
    const existing = totals.get(key);
    if (existing) existing.quantity += event.quantity;
    else totals.set(key, { ...event });
  }
  return Array.from(totals.values());
};

export const buildDatetimeEvents = (receipt: Receipt): DatetimeEvent[] => {
  const events: DatetimeEvent[] = [];
  for (const tx of receipt.transactions) {
    for (const { settlementDatetime, expiryDatetime, instrument, quantity, isExcluded } of tx.legs) {
      if (isExcluded) continue;
      events.push({ datetime: settlementDatetime ?? receipt.agreementDatetime, instrument, quantity });
      if (expiryDatetime) events.push({ datetime: expiryDatetime, instrument, quantity: -quantity });
    }
  }
  return aggregateEvents(events).sort((a, b) => b.datetime.getTime() - a.datetime.getTime());
};

export const groupEventsByDate = (events: DatetimeEvent[]): DatetimeGroup[] => {
  const groups: DatetimeGroup[] = [];
  for (const event of events) {
    const dateKey = formatDatetime(event.datetime, FMT.dayKey);
    const last = groups[groups.length - 1];
    if (last?.dateKey === dateKey) last.events.push(event);
    else groups.push({ dateKey, label: formatDatetime(event.datetime, FMT.day), events: [event] });
  }
  return groups;
};

/** Flattens groups into rows and inserts the "now" divider where past meets future. */
export const buildDatetimeRows = (groups: DatetimeGroup[], now: number): DatetimeRow[] => {
  const rows: DatetimeRow[] = [];
  let dividerInserted = false;
  const insertDividerIfPast = (time: number) => {
    if (!dividerInserted && time <= now) {
      rows.push({ type: 'divider' });
      dividerInserted = true;
    }
  };

  for (const group of groups) {
    insertDividerIfPast(group.events[0].datetime.getTime()); // whole day is past: line goes above its date
    rows.push({ type: 'header', dateKey: group.dateKey, label: group.label });
    group.events.forEach((event, i) => {
      insertDividerIfPast(event.datetime.getTime()); // mixed day: line goes between future and past
      rows.push({ type: 'event', dateKey: group.dateKey, event, key: `${group.dateKey}-${i}` });
    });
  }

  if (!dividerInserted) rows.push({ type: 'divider' }); // everything is in the future: line sits at the bottom
  return rows;
};