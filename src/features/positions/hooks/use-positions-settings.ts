import { useEffect, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/auth-context';
import type { Receipt } from '@/features/receipt';
import { STORAGE_KEY } from '../constants';
import type { DatetimeType, Period, ViewMode } from '../types';
import { collapseAllButNearest, collectTimes } from '../utils/collapse';

const defaultPeriod = (): Period => ({ count: 7, unit: 'days', anchor: new Date() });

export function usePositionsSettings(receipts: Receipt[]) {
  const { userId } = useAuth();
  const [datetimeType, setDatetimeType] = useState<DatetimeType>('settlement');
  const [viewMode, setViewMode] = useState<ViewMode>('incremental');
  const [displayInstrument, setDisplayInstrument] = useState<string>('AUD');
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [collapsedDates, setCollapsedDates] = useState<Record<DatetimeType, Set<string>> | null>(null);

  // hydrated only for the user whose settings are loaded: flips to false in the same render the user changes,
  // so the save effect can never write one user's state under another user's key
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const hydrated = !!userId && hydratedFor === userId;

  // runs once per user, the first render where receipts have loaded
  if (hydrated && collapsedDates === null && receipts.length > 0) {
    const loadedAt = Date.now();
    setCollapsedDates({
      agreement: collapseAllButNearest(collectTimes(receipts, 'agreement'), loadedAt, period),
      settlement: collapseAllButNearest(collectTimes(receipts, 'settlement'), loadedAt, period),
    });
  }

  useEffect(() => {
    if (!userId) {
      setHydratedFor(null);
      return;
    }
    let cancelled = false;
  
    setHydratedFor(null);
    setDatetimeType('settlement');
    setViewMode('incremental');
    setDisplayInstrument('AUD');
    setPeriod(defaultPeriod());
    setCollapsedDates(null);

    (async () => {
      let s: any = null;
      try {
        const raw = await AsyncStorage.getItem(`${STORAGE_KEY}:${userId}`);
        if (raw) s = JSON.parse(raw);
      } catch {
        // ignore corrupt/missing data and fall back to defaults
      }
      if (cancelled) return;

      if (s) {
        if (s.datetimeType === 'agreement' || s.datetimeType === 'settlement') setDatetimeType(s.datetimeType);
        if (s.viewMode === 'incremental' || s.viewMode === 'cumulative') setViewMode(s.viewMode);
        if (typeof s.displayInstrument === 'string') setDisplayInstrument(s.displayInstrument);
        if (s.period) {
          setPeriod({ count: s.period.count, unit: s.period.unit, anchor: new Date(s.period.anchor) });
        }
        if (s.v === 2 && s.collapsed) {
          setCollapsedDates({
            agreement: new Set<string>(s.collapsed.agreement ?? []),
            settlement: new Set<string>(s.collapsed.settlement ?? []),
          });
        }
      }
      setHydratedFor(userId);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // save whenever any of them change
  useEffect(() => {
    if (!hydrated || !userId) return;
    const payload = {
      v: 2,
      datetimeType,
      viewMode,
      displayInstrument,
      period: { count: period.count, unit: period.unit, anchor: period.anchor.getTime() },
      collapsed: collapsedDates && {
        agreement: [...collapsedDates.agreement],
        settlement: [...collapsedDates.settlement],
      },
    };
    AsyncStorage.setItem(`${STORAGE_KEY}:${userId}`, JSON.stringify(payload)).catch(() => {});
  }, [hydrated, userId, datetimeType, viewMode, displayInstrument, period, collapsedDates]);

  return {
    datetimeType, setDatetimeType,
    viewMode, setViewMode,
    displayInstrument, setDisplayInstrument,
    period, setPeriod,
    collapsedDates, setCollapsedDates,
    hydrated,
  };
}