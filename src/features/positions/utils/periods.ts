import { addDays, addMonths, formatDatetime, ymd } from '@/utils/datetime';
import { Period } from '../types';

const stepPeriod = (p: Period, anchor: Date, k: number) =>
  p.unit === 'days' ? addDays(anchor, k * p.count) : addMonths(anchor, k * p.count);

// the period (start..end inclusive) containing `date`, counted from the anchor in both directions
export const periodRange = (date: Date, p: Period): { start: Date; end: Date } => {
  const anchor = new Date(p.anchor.getFullYear(), p.anchor.getMonth(), p.anchor.getDate());
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  let k: number;
  if (p.unit === 'days') {
    const diff = Math.round((d.getTime() - anchor.getTime()) / 86_400_000);
    k = Math.floor(diff / p.count);
  } else {
    const months = (d.getFullYear() - anchor.getFullYear()) * 12 + d.getMonth() - anchor.getMonth();
    k = Math.floor(months / p.count);
    while (stepPeriod(p, anchor, k) > d) k--;
    while (stepPeriod(p, anchor, k + 1) <= d) k++;
  }

  return { start: stepPeriod(p, anchor, k), end: addDays(stepPeriod(p, anchor, k + 1), -1) };
};

export const periodKey = (date: Date, p: Period) => ymd(periodRange(date, p).start);

// timestamp -> period key, remembering the last period so runs of nearby times skip the date maths
export const makePeriodKeyer = (p: Period) => {
  let lo = 0;
  let hi = 0;
  let key = '';
  return (t: number) => {
    if (key === '' || t < lo || t >= hi) {
      const { start, end } = periodRange(new Date(t), p);
      lo = start.getTime();
      hi = addDays(end, 1).getTime();
      key = ymd(start);
    }
    return key;
  };
};

export const periodText = (start: Date, end: Date) =>
  start.getTime() === end.getTime()
    ? formatDatetime(start, 'ddd, dd mmm yyyy')
    : `${formatDatetime(start, 'ddd, dd mmm yyyy')} - ${formatDatetime(end, 'ddd, dd mmm yyyy')}`;