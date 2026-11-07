import { useCallback, useEffect, useMemo, useState } from 'react';
import { useReceipts, useAddReceipt, useUpdateReceipt, useDeleteReceipt, useConfirmReceipt, useDeclineReceipt, useResolveAmendment, useWithdrawForEdit, useRefreshReceipts } from '@/context/receipts-context';
import { useTheme } from '@/hooks/use-theme';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';

import { View, SectionList, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText as Text } from '@/components/app-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { addDays, ymd } from '@/utils/datetime';
import { formatAmount, qtyColor, round6 } from '@/utils/format-numbers';
import { consumePendingReceiptId, subscribeToReceiptTaps } from '@/utils/notifications';
import { ReceiptDetails, blankReceipt, type Receipt } from '@/features/receipt';
import {
  ReceiptPickerSheet, ReceiptRow, ReceiptSearch, GroupPeriodModal,
  usePositionsSettings, useScrollSnap,
  NO_DATES,
  periodRange, periodText,
  buildListRows, byTime, compileFilters, counts, keyExtractor,
  type ListRow, type Row, type SearchFilter, type Section,
  type Period,
} from '@/features/positions';
import { Palette, TAP_SLOP } from '@/constants/theme';

// the receipts list is fixed: dated by agreement, shown in AUD, period totals only
const DATETIME_TYPE = 'agreement' as const;
const DISPLAY_INSTRUMENT = 'AUD';

export default function ReceiptsScreen() {
  // ----- context -----
  const colors = useTheme();
  const { textScale, stacked, iconScale } = useAdaptiveLayout();
  const receipts = useReceipts();
  const addReceipt = useAddReceipt();
  const updateReceipt = useUpdateReceipt();
  const deleteReceipt = useDeleteReceipt();
  const confirmReceipt = useConfirmReceipt();
  const declineReceipt = useDeclineReceipt();
  const resolveAmendment = useResolveAmendment();
  const withdrawForEdit = useWithdrawForEdit();
  const refreshReceipts = useRefreshReceipts();

  // ----- persisted view settings -----
  const { period, setPeriod, collapsedDates, setCollapsedDates, hydrated } = usePositionsSettings(receipts);

  // ----- transient UI state -----
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [searchCollapsed, setSearchCollapsed] = useState<Set<string>>(NO_DATES);
  const [selectedTx, setSelectedTx] = useState<Receipt | null>(null);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [pickerRow, setPickerRow] = useState<ListRow | null>(null); // merged row awaiting a receipt choice

  // ----- derived data -----

  // the open sheet follows live updates: the list reloads on every change, so look the receipt up again
  const openTx = selectedTx ? receipts.find((r) => r.receiptId === selectedTx.receiptId) ?? selectedTx : null;

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

  // rows; newest first
  const rows = useMemo<ListRow[]>(() => {
    if (!hydrated) return [];
    const keep = filters.length > 0 ? compileFilters(filters) : undefined;
    const built = buildListRows(receipts, DATETIME_TYPE, DISPLAY_INSTRUMENT, keep);
    built.sort(byTime);
    for (const r of built) {
      r.counted = round6(r.parts.reduce((s, p) => (counts(p.receipt) ? s + p.counted : s), 0));
    }
    return built.reverse();
  }, [hydrated, receipts, filters]);

  // grouped into periods
  const sections = useMemo<Section[]>(() => {
    const out: Section[] = [];
    let current: Section | null = null;
    let lo = 0;
    let hi = 0; // current period is [lo, hi) in ms
    let sum = 0;
    for (const r of rows) {
      if (!current || r.t < lo || r.t >= hi) {
        if (current) current.aggregate = round6(sum);
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
    if (current) current.aggregate = round6(sum);
    return out;
  }, [rows, period]);

  const searching = filters.length > 0;
  const currentCollapsed = searching ? searchCollapsed : (collapsedDates?.[DATETIME_TYPE] ?? NO_DATES);
  const allExpanded = sections.every((s) => !currentCollapsed.has(s.dateKey));
  const showDate = !(period.unit === 'days' && period.count === 1);
  const periodLabel = `${period.count} ${period.unit === 'days' ? 'day' : 'month'}${period.count === 1 ? '' : 's'}`;

  // what the list renders: collapsed groups show no rows
  const displaySections = useMemo(
    () => sections.map((section) => (currentCollapsed.has(section.dateKey) ? { ...section, data: [] } : section)),
    [sections, currentCollapsed]
  );

  // ----- scroll to "next future group + today" -----
  const { listRef, renderCount, hideList, onScrollToIndexFailed, onContentSizeChange } = useScrollSnap({
    sections,
    displaySections,
    datetimeType: DATETIME_TYPE,
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
    const next = allExpanded ? new Set(sections.map((s) => s.dateKey)) : new Set<string>();
    if (searching) {
      setSearchCollapsed(next);
      return;
    }
    setCollapsedDates((prev) => prev && { ...prev, [DATETIME_TYPE]: next });
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
      setCollapsedDates((prev) => prev && { ...prev, [DATETIME_TYPE]: flip(prev[DATETIME_TYPE]) });
    },
    [searching, setCollapsedDates]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => {
      const value = section.aggregate ?? 0;
      const isFirst = section.dateKey === sections[0]?.dateKey;
      return (
        <TouchableOpacity
          onPress={() => toggleDate(section.dateKey)}
          activeOpacity={0.7}
          style={[styles.dateHeader, isFirst && { marginTop: 0 }]}
        >
          <Text style={[styles.dateText, { color: colors.text }]}>{section.date}</Text>
          <Text style={[styles.amount, styles.amountNoShrink, { color: qtyColor(value, colors) }]}>
            {formatAmount(value)}
          </Text>
        </TouchableOpacity>
      );
    },
    [colors, toggleDate, sections]
  );

  const renderItem = useCallback(
    ({ item }: { item: Row }) => {
      const row = item as ListRow; // no now-rows on this screen
      return (
        <ReceiptRow
          row={row}
          value={row.amount}
          showDate={showDate}
          textColor={colors.text}
          amountColor={qtyColor(row.amount, colors)}
          dangerColor={colors.danger}
          textScale={textScale}
          stacked={stacked}
          iconScale={iconScale}
          onPress={handleRowPress}
        />
      );
    },
    [showDate, colors, textScale, stacked, iconScale, handleRowPress]
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
      </View>

      <View style={styles.container}>
        {sections.length === 0 ? (
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
            extraData={`${stacked}|${textScale}`}
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

      {/* receipt picker for merged rows */}
      {pickerRow && <ReceiptPickerSheet row={pickerRow} onClose={handlePickerClosed} />}
    </SafeAreaView>
  );
}

// ---------- styles ----------

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  // top bar
  topBar: { paddingHorizontal: 15, paddingBottom: 6, gap: 15, zIndex: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  plus: { paddingRight: 5, flexShrink: 0 },

  splitButton: { flexDirection: 'row', alignItems: 'stretch', borderWidth: 1, borderRadius: 8, overflow: 'hidden', flexShrink: 1 }, // shrinks so the + button can never be pushed off-screen
  splitLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, flexShrink: 1 },
  splitDivider: { width: 1 },
  splitRight: { justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 10, flexShrink: 1 },
  splitText: { fontSize: 12, fontFamily: 'Courier', fontWeight: '600' },

  // list container
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