import type { ViewMode } from './types';

export const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'datetime', label: 'By Datetime' },
  { key: 'legs', label: 'Individual Legs' },
  { key: 'aggregate', label: 'Aggregated' },
];

export const FMT = {
  full: 'ddd, dd mmm yyyy hh:MM am/pm',
  day: 'ddd, dd mmm yyyy',
  dayKey: 'yyyy-mm-dd',
  chip: 'dd mmm yyyy hh:MM am/pm',
  time: 'hh:MM am/pm',
} as const;

export const SAVE_CLOSE_DELAY_MS = 500;
export const GST_INSTRUMENT = 'Taxes: GST';
