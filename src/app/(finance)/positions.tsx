import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useReceipts, useAddReceipt, useUpdateReceipt, useDeleteReceipt, useConfirmReceipt, useDeclineReceipt, useResolveAmendment, useWithdrawForEdit, useRefreshReceipts } from '@/context/receipts-context';
import { useTheme } from '@/hooks/use-theme';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';
import { useNow } from '@/hooks/use-now';

import { View, SectionList, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText as Text } from '@/components/app-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { addDays, formatDatetime, ymd } from '@/utils/datetime';
import { formatAmount, qtyColor, round6 } from '@/utils/format-numbers';
import SegmentedControl from '@/components/segmented-control';
import { consumePendingReceiptId, subscribeToReceiptTaps } from '@/utils/notifications';
import { ReceiptDetails, blankReceipt, type Receipt } from '@/features/receipt';
import {
  ReceiptPickerSheet, ReceiptRow, ReceiptSearch, GroupPeriodModal, InstrumentPickerModal, PositionsChart,
  usePositionsSettings, useScrollSnap,
  NOW_KEY, NO_DATES, DATETIME_TYPES, VIEW_MODES,
  periodKey, periodRange, periodText,
  allExcluded, buildListRows, byTime, compileFilters, counts, isNowRow, keyExtractor,
  type ChartPoint, type InstrumentOption, type ListRow, type Row, type SearchFilter, type Section,
  type Period,
} from '@/features/positions';
import { Palette, TAP_SLOP } from '@/constants/theme';
import { NowDivider } from '@/components/now-divider';

const GROUPINGS = [
  { key: 'counterparty', label: 'Counterparty' },
  { key: 'instruments', label: 'Instruments' },
];

export default function PositionsScreen() {
  // ----- context -----
  const colors = useTheme();
  const { textScale, stacked, huge, iconScale } = useAdaptiveLayout();
  const receipts = useReceipts();
  const addReceipt = useAddReceipt();
  const updateReceipt = useUpdateReceipt();
  const deleteReceipt = useDeleteReceipt();
  const confirmReceipt = useConfirmReceipt();
  const declineReceipt = useDeclineReceipt();
  const resolveAmendment = useResolveAmendment();
  const withdrawForEdit = useWithdrawForEdit();
  const refreshReceipts = useRefreshReceipts();

  // chart gets smaller when stacked and is hidden at huge sizes so the list keeps usable space
  const showChart = !huge;
  const chartHeight = stacked ? 130 : 200;

  // ----- persisted view settings -----
  const {
    datetimeType, setDatetimeType,
    viewMode, setViewMode,
    displayInstrument, setDisplayInstrument,
    period, setPeriod,
    collapsedDates, setCollapsedDates,
    hydrated,
  } = usePositionsSettings(receipts);;

  // ----- transient UI state -----
  const now = useNow();
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [searchCollapsed, setSearchCollapsed] = useState<Set<string>>(NO_DATES);
  const [selectedTx, setSelectedTx] = useState<Receipt | null>(null);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [instrumentModalOpen, setInstrumentModalOpen] = useState(false);
  const [pickerRow, setPickerRow] = useState<ListRow | null>(null); // merged row awaiting a receipt choice
  const [grouping, setGrouping] = useState<string>('counterparty');

  // ----- derived data -----

  // the open sheet follows live updates: the list reloads on every change, so look the receipt up again
  const openTx = selectedTx ? receipts.find((r) => r.receiptId === selectedTx.receiptId) ?? selectedTx : null;

  const instruments = useMemo<InstrumentOption[]>(() => {
    const usage = new Map<string, number>([['AUD', 0]]);
    for (const r of receipts) {
      const used = new Set<string>();
      for (const tx of r.transactions) for (const leg of tx.legs) used.add(leg.instrument);
      used.forEach((name) => usage.set(name, (usage.get(name) ?? 0) + 1));
    }
    return [...usage]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => (a.name === 'AUD' ? -1 : b.name === 'AUD' ? 1 : a.name.localeCompare(b.name)));
  }, [receipts]);

  // counterparties I've used before, most used first (for the counterparty picker)
  const counterpartyOptions = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; identifier: string | null; count: number }>();
    for (const r of receipts) {
      const id = r.unregisteredCounterpartyId;
      if (!id) continue;
      const existing = byId.get(id);
      if (existing) existing.count += 1;
      else byId.set(id, { id, name: r.counterpartyName, identifier: r.counterpartyIdentifier ?? null, count: 1 });
    }
    return [...byId.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [receipts]);

  // rows + running totals for the active mode only (ignores now, period); newest first
  const rows = useMemo<ListRow[]>(() => {
    if (!hydrated) return [];
    const keep = filters.length > 0 ? compileFilters(filters) : undefined;
    const built = buildListRows(receipts, datetimeType, displayInstrument, keep);
    built.sort(byTime);
    let running = 0;
    for (const r of built) {
      r.counted = round6(r.parts.reduce((s, p) => (counts(p.receipt) ? s + p.counted : s), 0));
      running = round6(running + r.counted);
      r.cumulative = running;
    }
    return built.reverse();
  }, [hydrated, receipts, datetimeType, displayInstrument, filters]);

  // grouped into periods (ignores now)
  const grouped = useMemo<Section[]>(() => {
    const out: Section[] = [];
    const finish = (s: Section, sum: number) => {
      s.aggregate = round6(sum);
      s.cumulative = (s.data[0] as ListRow).cumulative;
    };
    let current: Section | null = null;
    let lo = 0;
    let hi = 0; // current period is [lo, hi) in ms
    let sum = 0;
    for (const r of rows) {
      if (!current || r.t < lo || r.t >= hi) {
        if (current) finish(current, sum);
        const { start, end } = periodRange(r.datetime, period);
        lo = start.getTime();
        hi = addDays(end, 1).getTime();
        current = { dateKey: ymd(start), date: periodText(start, end), data: [] };
        out.push(current);
        sum = 0;
      }
      current.data.push(r);
      sum += r.counted ?? r.amount;
    }
    if (current) finish(current, sum);
    return out;
  }, [rows, period]);

  const sections = useMemo<Section[]>(() => {
    if (datetimeType === 'agreement') return grouped;

    // settlement mode: place "now"
    const nowKey = periodKey(new Date(now), period);
    const nowSection = grouped.find((s) => s.dateKey === nowKey);

    if (nowSection) {
      // line goes inside the period that contains now
      let idx = nowSection.data.findIndex((r) => (r as ListRow).t <= now);
      if (idx === -1) idx = nowSection.data.length;
      return grouped.map((s) =>
        s !== nowSection
          ? s
          : {
              ...s,
              hasDivider: true,
              data: [...s.data.slice(0, idx), { id: NOW_KEY }, ...s.data.slice(idx)],
            }
      );
    }

    // now falls in a period with no rows: standalone line between the neighbouring periods
    const at = grouped.findIndex((s) => s.dateKey < nowKey);
    const out = [...grouped];
    out.splice(at === -1 ? out.length : at, 0, { dateKey: NOW_KEY, date: '', data: [{ id: NOW_KEY }] });
    return out;
  }, [grouped, now, datetimeType, period]);

  const dateSections = useMemo(() => sections.filter((s) => s.dateKey !== NOW_KEY), [sections]);
  const searching = filters.length > 0;
  const currentCollapsed = searching ? searchCollapsed : (collapsedDates?.[datetimeType] ?? NO_DATES);
  const allExpanded = dateSections.every((s) => !currentCollapsed.has(s.dateKey));
  const showDate = !(period.unit === 'days' && period.count === 1);
  const deferredViewMode = useDeferredValue(viewMode);
  const cumulativeView = deferredViewMode === 'cumulative';
  const periodLabel = `${period.count} ${period.unit === 'days' ? 'day' : 'month'}${period.count === 1 ? '' : 's'}`;

  // what the list renders: collapsed groups show no rows
  const displaySections = useMemo(
    () =>
      sections.map((section) =>
        section.dateKey === NOW_KEY || !currentCollapsed.has(section.dateKey) ? section : { ...section, data: [] }
      ),
    [sections, currentCollapsed]
  );

  const chartPoints = useMemo<ChartPoint[]>(() => {
    const label = (d: Date) => formatDatetime(d, 'dd mmm');
    const pts: ChartPoint[] = [];
    for (let i = sections.length - 1; i >= 0; i--) {
      const s = sections[i];
      if (s.dateKey === NOW_KEY) continue;
      // newest first; the now-line and fully declined rows never reach the chart
      const data = s.data.filter((item): item is ListRow => !isNowRow(item) && !allExcluded(item));
      const count = data.length;
      if (count === 0) continue;

      if (currentCollapsed.has(s.dateKey)) {
        const first = data[0];
        pts.push({
          key: s.dateKey,
          value: cumulativeView ? s.cumulative ?? 0 : s.aggregate ?? 0,
          label: label(first.datetime),
          title: s.date,
          detail: `${count} ${count === 1 ? 'entry' : 'entries'} · ${cumulativeView ? 'balance at end' : 'period total'}`,
          time: first.t,
          spansNow: !!s.hasDivider,
        });
      } else {
        for (let j = data.length - 1; j >= 0; j--) {
          const r = data[j];
          pts.push({
            key: r.key,
            value: cumulativeView ? r.cumulative ?? 0 : r.counted ?? r.amount,
            label: label(r.datetime),
            title: formatDatetime(r.datetime, 'ddd, dd mmm hh:MM am/pm'),
            detail: r.counterparty,
            time: r.t,
          });
        }
      }
    }
    return pts;
  }, [sections, currentCollapsed, cumulativeView]);

  // ----- scroll to "next future group + today" -----
  const { listRef, renderCount, hideList, onScrollToIndexFailed, onContentSizeChange } = useScrollSnap({
    sections,
    displaySections,
    datetimeType,
    searching,
    hydrated,
  });

  // ----- handlers (everything that is a hook stays above the `!hydrated` early return) -----

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshReceipts();
    } finally {
      setRefreshing(false);
    }
  };

  // one receipt behind the row: open it. several: let the user pick.
  const handleRowPress = useCallback((row: ListRow) => {
    if (row.parts.length === 1) setSelectedTx(row.parts[0].receipt);
    else setPickerRow(row);
  }, []);

  const openTappedReceipt = useCallback(async () => {
    const id = consumePendingReceiptId();
    if (!id) return;
    const fresh = await refreshReceipts();
    const found = fresh?.find((r) => r.receiptId === id);
    if (found) setSelectedTx(found);
  }, [refreshReceipts]);

  useEffect(() => {
    openTappedReceipt(); // the tap that launched the app
    return subscribeToReceiptTaps(openTappedReceipt);
  }, [openTappedReceipt]);

  // fires once the picker has finished closing; opens the chosen receipt if there is one
  const handlePickerClosed = useCallback((chosen: Receipt | null) => {
    setPickerRow(null);
    if (chosen) setSelectedTx(chosen);
  }, []);

  // every new search starts fully expanded
  const handleFiltersChange = (next: SearchFilter[]) => {
    setFilters(next);
    setSearchCollapsed(new Set());
  };

  const handlePeriodChange = (next: Period) => {
    setPeriod(next);
    setCollapsedDates(null);
    setSearchCollapsed(new Set());
  };

  const toggleAll = () => {
    const next = allExpanded ? new Set(dateSections.map((s) => s.dateKey)) : new Set<string>();
    if (searching) {
      setSearchCollapsed(next);
      return;
    }
    setCollapsedDates((prev) => prev && { ...prev, [datetimeType]: next });
  };

  const toggleDate = useCallback(
    (dateKey: string) => {
      const flip = (set: Set<string>) => {
        const next = new Set(set);
        next.has(dateKey) ? next.delete(dateKey) : next.add(dateKey);
        return next;
      };
      if (searching) {
        setSearchCollapsed(flip);
        return;
      }
      setCollapsedDates((prev) => prev && { ...prev, [datetimeType]: flip(prev[datetimeType]) });
    },
    [searching, datetimeType, setCollapsedDates]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => {
      if (section.dateKey === NOW_KEY) return null;
      const isNow = section.hasDivider;
      const value = cumulativeView ? section.cumulative ?? 0 : section.aggregate ?? 0;
      return (
        <TouchableOpacity
          onPress={() => toggleDate(section.dateKey)}
          activeOpacity={0.7}
          style={styles.dateHeader}
        >
          <Text style={[styles.dateText, { color: isNow ? Palette.blue : colors.text }]}>{section.date}</Text>
          <Text style={[styles.amount, styles.amountNoShrink, { color: qtyColor(value, colors) }]}>
            {formatAmount(value)}
          </Text>
        </TouchableOpacity>
      );
    },
    [cumulativeView, colors, toggleDate]
  );

  const renderItem = useCallback(
    ({ item }: { item: Row }) => {
      if (isNowRow(item)) return <NowDivider />;

      const row = item as ListRow;
      const value = cumulativeView ? row.cumulative ?? 0 : row.amount;
      return (
        <ReceiptRow
          row={row}
          value={value}
          showDate={showDate}
          textColor={colors.text}
          amountColor={qtyColor(value, colors)}
          dangerColor={colors.danger}
          textScale={textScale}
          stacked={stacked}
          iconScale={iconScale}
          onPress={handleRowPress}
        />
      );
    },
    [cumulativeView, showDate, colors, textScale, stacked, iconScale, handleRowPress]
  );

  // ----- render -----

  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={[Palette.blue]}
      progressBackgroundColor="rgba(128, 128, 128, 0.18)"
      tintColor={Palette.blue}
    />
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, selectedTx && { zIndex: 0 }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <SegmentedControl options={DATETIME_TYPES} value={datetimeType} onChange={setDatetimeType} fullWidth={false} />
            <SegmentedControl options={GROUPINGS} value={grouping} onChange={setGrouping} fullWidth={false} />
          </View>

          <TouchableOpacity
            style={styles.plus}
            onPress={() => setSelectedTx(blankReceipt())}
            hitSlop={TAP_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Add receipt"
          >
            <Plus size={26 * Math.min(textScale, 1.5)} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ReceiptSearch receipts={receipts} filters={filters} onChange={handleFiltersChange} />

        <View style={styles.controlRow}>
          <View style={[styles.splitButton, { borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setPeriodModalOpen(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Group by ${periodLabel}`}
              style={styles.splitLeft}
            >
              <Text style={[styles.splitText, { color: colors.text }]}>{periodLabel}</Text>
            </TouchableOpacity>

            <View style={[styles.splitDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              onPress={toggleAll}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={allExpanded ? 'Collapse all' : 'Expand all'}
              style={styles.splitRight}
            >
              <Text style={[styles.splitText, { color: colors.text }]}>
                {allExpanded ? 'Expanded' : 'Collapsed'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controlsRight}>
            <TouchableOpacity
              onPress={() => setInstrumentModalOpen(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Display in ${displayInstrument}`}
              style={[
                styles.displayInstrumentButton,
                { borderColor: colors.border, maxWidth: 110 * textScale },
              ]}
            >
              <Text
                style={[styles.displayInstrumentText, { color: colors.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {displayInstrument}
              </Text>
            </TouchableOpacity>

            <SegmentedControl options={VIEW_MODES} value={viewMode} onChange={setViewMode} fullWidth={false} />
          </View>
        </View>
      </View>

      {chartPoints.length > 0 && showChart && (
        <View style={styles.chartWrap}>
          <PositionsChart
            points={chartPoints}
            mode={cumulativeView ? 'step' : 'bar'}
            now={datetimeType === 'settlement' ? now : undefined}
            height={chartHeight}
          />
        </View>
      )}

      <View style={styles.container}>
        {dateSections.length === 0 ? (
          <ScrollView contentContainerStyle={styles.emptyState} refreshControl={refreshControl}>
            {searching ? (
              <>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No matches</Text>
                <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Try removing a filter</Text>
              </>
            ) : (
              <>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No receipts yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Tap + to add your first one</Text>
              </>
            )}
          </ScrollView>
        ) : (
          <SectionList
            ref={listRef}
            initialNumToRender={renderCount}
            onScrollToIndexFailed={onScrollToIndexFailed}
            onContentSizeChange={onContentSizeChange}
            extraData={`${deferredViewMode}|${stacked}|${textScale}`}
            refreshControl={refreshControl}
            keyboardShouldPersistTaps="handled"
            style={[styles.list, hideList && { opacity: 0 }]}
            contentContainerStyle={styles.listContent}
            sections={displaySections}
            keyExtractor={keyExtractor}
            renderSectionHeader={renderSectionHeader}
            renderItem={renderItem}
          />
        )}
      </View>

      {openTx && (
        <ReceiptDetails
          key={openTx.receiptId}
          receipt={openTx}
          counterpartyOptions={counterpartyOptions}
          editable={openTx.receiptId === '0'}
          onClose={() => setSelectedTx(null)}
          onSave={async (r) => {
            await addReceipt(r);
          }}
          onUpdate={async (id, r) => {
            await updateReceipt(id, r);
          }}
          onDelete={async (id) => {
            await deleteReceipt(id);
          }}
          onConfirm={async (id) => {
            await confirmReceipt(id);
          }}
          onDecline={async (id) => {
            await declineReceipt(id);
          }}
          onResolveAmendment={async (amendmentId, outcome) => {
            await resolveAmendment(amendmentId, outcome);
          }}
          onWithdrawForEdit={
            (receiptId, amendmentId) => withdrawForEdit(receiptId, amendmentId)
          }
        />
      )}

      <GroupPeriodModal
        visible={periodModalOpen}
        value={period}
        onChange={handlePeriodChange}
        onClose={() => setPeriodModalOpen(false)}
      />

      <InstrumentPickerModal
        visible={instrumentModalOpen}
        instruments={instruments}
        onSelect={setDisplayInstrument}
        onClose={() => setInstrumentModalOpen(false)}
      />

      {/* receipt picker for merged rows */}
      {pickerRow && <ReceiptPickerSheet row={pickerRow} onClose={handlePickerClosed} />}
    </SafeAreaView>
  );
}

// ---------- styles ----------

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  // top bar
  topBar: { paddingHorizontal: 15, paddingBottom: 8, gap: 8, zIndex: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  headerLeft: { flexDirection: 'row', gap: 8, flexShrink: 1 }, // shrinks so the + button can never be pushed off-screen
  plus: { paddingRight: 5, flexShrink: 0 },

  // control row (wraps onto a second line when it doesn't fit)
  controlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  controlsRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, flexWrap: 'wrap' },

  splitButton: { flexDirection: 'row', alignItems: 'stretch', borderWidth: 1, borderRadius: 8, overflow: 'hidden', maxWidth: '100%' },
  splitLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, flexShrink: 1 },
  splitDivider: { width: 1 },
  splitRight: { justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 10, flexShrink: 1 },
  splitText: { fontSize: 12, fontFamily: 'Courier', fontWeight: '600' },

  displayInstrumentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
    maxWidth: 110, // overridden inline with textScale
    flexShrink: 1,
  },
  displayInstrumentText: { fontSize: 12, fontFamily: 'Courier', fontWeight: '600', flexShrink: 1 },

  // chart + list containers
  chartWrap: { paddingLeft: 8, paddingRight: 15 },
  container: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 15 },

  // section header
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
    paddingVertical: 6,
  },
  dateText: { fontSize: 14, fontFamily: 'Courier', fontWeight: '700', flexShrink: 1 },
  amount: { fontSize: 15, fontFamily: 'Courier', fontWeight: '600' },
  amountNoShrink: { flexShrink: 0 },

  // empty state
  emptyState: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 60 },
  emptyTitle: { fontSize: 15, fontFamily: 'Courier', fontWeight: '600' },
  emptySubtitle: { fontSize: 13, fontFamily: 'Courier' }, // colour set inline
});