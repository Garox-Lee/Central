import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SectionList } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { NOW_KEY } from '../constants';
import type { DatetimeType, Row, Section } from '../types';

type Params = {
  sections: Section[];
  displaySections: Section[];
  datetimeType: DatetimeType;
  searching: boolean;
  hydrated: boolean;
};

export function useScrollSnap({ sections, displaySections, datetimeType, searching, hydrated }: Params) {
  const listRef = useRef<SectionList<Row, Section>>(null);
  const [positioned, setPositioned] = useState(false); // list has been scrolled to its target
  const [focusKey, setFocusKey] = useState(0);
  const scrollAttempts = useRef(0);
  const pendingSnap = useRef(false);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const secondSnapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      if (snapTimer.current) clearTimeout(snapTimer.current);
      if (secondSnapTimer.current) clearTimeout(secondSnapTimer.current);
      if (revealTimer.current) clearTimeout(revealTimer.current);
    },
    []
  );

  // settlement only: the group just above the "now" line (the next future group) goes to the top,
  // which leaves today's group right beneath it
  const scrollTarget = useMemo(() => {
    if (datetimeType !== 'settlement' || searching) return null;
    const nowIdx = sections.findIndex((s) => s.hasDivider || s.dateKey === NOW_KEY);
    if (nowIdx === -1) return null;
    const index = Math.max(nowIdx - 1, 0);
    // enough rows to render everything above the target plus a screenful below it
    const renderCount = displaySections.slice(0, index + 2).reduce((n, s) => n + s.data.length + 2, 0) + 10;
    return { index, renderCount };
  }, [sections, displaySections, datetimeType, searching]);

  const targetRef = useRef(scrollTarget);
  targetRef.current = scrollTarget;
  const hasTarget = scrollTarget !== null;

  const scrollToTarget = () => {
    const t = targetRef.current;
    if (!t) return;
    listRef.current?.scrollToLocation({ sectionIndex: t.index, itemIndex: 0, viewPosition: 0, animated: false });
  };

  // scroll, scroll again once row heights have settled, then reveal the list
  const runSnap = () => {
    if (!pendingSnap.current || !targetRef.current) return;
    pendingSnap.current = false;
    scrollAttempts.current = 0;
    scrollToTarget();
    secondSnapTimer.current = setTimeout(scrollToTarget, 100);
    revealTimer.current = setTimeout(() => setPositioned(true), 140);
  };

  const scheduleSnap = (delay: number) => {
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(runSnap, delay);
  };

  // snap on first load, on mode switch, when a search is cleared, and on every return to this tab
  useEffect(() => {
    if (datetimeType !== 'settlement') {
      pendingSnap.current = false;
      return;
    }
    if (!hydrated || !hasTarget) return;

    pendingSnap.current = true;
    setPositioned(false);
    scheduleSnap(80);
    return () => {
      if (snapTimer.current) clearTimeout(snapTimer.current);
      if (secondSnapTimer.current) clearTimeout(secondSnapTimer.current);
      if (revealTimer.current) clearTimeout(revealTimer.current);
    };
  }, [hydrated, hasTarget, datetimeType, focusKey]);

  // re-snap when the tab regains focus; hide the list while away so it doesn't flash at the old position
  useFocusEffect(
    useCallback(() => {
      setFocusKey((k) => k + 1);
      return () => setPositioned(false);
    }, [])
  );

  const onScrollToIndexFailed = (info: { index: number; averageItemLength: number }) => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
    if (secondSnapTimer.current) clearTimeout(secondSnapTimer.current);
    if (scrollAttempts.current++ > 5) {
      setPositioned(true); // give up, but don't leave the list hidden
      return;
    }
    // jump near the target so those rows render, then run the full snap again
    (listRef.current?.getScrollResponder() as any)?.scrollTo({
      y: info.averageItemLength * info.index,
      animated: false,
    });
    pendingSnap.current = true;
    scheduleSnap(100);
  };

  const onContentSizeChange = () => {
    if (pendingSnap.current) scheduleSnap(30); // wait for layout to settle, then snap
  };

  return {
    listRef,
    renderCount: scrollTarget?.renderCount ?? 10,
    hideList: datetimeType === 'settlement' && hasTarget && !positioned,
    onScrollToIndexFailed,
    onContentSizeChange,
  };
}