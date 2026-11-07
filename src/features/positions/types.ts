import type { Receipt } from '@/features/receipt';
import type { NOW_KEY } from './constants';

export type DatetimeType = 'agreement' | 'settlement';
export type ViewMode = 'incremental' | 'cumulative';

export type NowRow = { id: typeof NOW_KEY };

export type Part = {
  receipt: Receipt;
  amount: number;
  counted: number; // what this part adds to totals and the cumulative; 0 when its leg is excluded
};

// A single row in the list: either one whole receipt (agreement mode)
// or one merged leg-level settlement/expiry event (settlement mode).
// In settlement mode several receipts can sit behind one row (same counterparty, same time).
export type ListRow = {
  key: string;
  datetime: Date;
  t: number; // datetime.getTime(), computed once
  cp: string; // counterparty identity (public id, else name)
  counterparty: string;
  amount: number;
  cumulative?: number; // running total after this row
  counted?: number;
  instruments: string[];
  tags: string[];
  receipt: Receipt; // primary (first) receipt
  parts: Part[]; // every receipt behind this row, with its contribution
};

export type Row = ListRow | NowRow;

export type Section = {
  dateKey: string;
  date: string;
  aggregate?: number;
  cumulative?: number; // running total after the period's newest row
  hasDivider?: boolean;
  data: Row[];
};

export type PeriodUnit = 'days' | 'months';
export type Period = { count: number; unit: PeriodUnit; anchor: Date };

export type Position = {
  instrument: string;
  quantity: number;          // settlement cumulative as of the chosen datetime (main number)
  agreement: number;         // agreement cumulative as of the chosen datetime (shown underneath)
  receiptCount: number;      // receipts that contributed to either number
  counterpartyCount: number; // distinct counterparties across those receipts
};