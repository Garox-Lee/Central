import type { DatetimeType, ViewMode } from './types';

export const NOW_KEY = '__now__' as const;
export const NO_DATES = new Set<string>();
export const STORAGE_KEY = 'positions-screen-state-v1';

export const DATETIME_TYPES: { key: DatetimeType; label: string }[] = [
  { key: 'settlement', label: 'Settlement' },
  { key: 'agreement', label: 'Agreement' },
];

export const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'incremental', label: 'Incremental' },
  { key: 'cumulative', label: 'Cumulative' },
];

export const FAVOURITES_KEY = 'positions-favourites';