import { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import DraggableFlatList, { ScaleDecorator, type RenderItemParams } from 'react-native-draggable-flatlist';

import { AppText as Text } from '@/components/app-text';
import { useReceipts } from '@/context/receipts-context';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNow } from '@/hooks/use-now';
import { formatDatetime } from '@/utils/datetime';
import { formatAmount, qtyColor } from '@/utils/format-numbers';
import { pickDateTimeAndroid } from '@/features/receipt';
import {
  buildPositions, buildInstrumentChart, PositionsChart, useFavouriteInstruments, type Position,
} from '@/features/positions';
import { TAP_SLOP } from '@/constants/theme';

type ListItem =
  | { type: 'position'; position: Position }
  | { type: 'hint' }      // shown while there are no favourites: a visible drop target
  | { type: 'divider' };  // everything above it is a favourite

const HINT: ListItem = { type: 'hint' };
const DIVIDER: ListItem = { type: 'divider' };

// a favourite with no data at the chosen time still shows, with "--"
const emptyPosition = (instrument: string): Position => ({
  instrument, quantity: 0, agreement: 0, receiptCount: 0, counterpartyCount: 0,
});

const keyOf = (item: ListItem) => (item.type === 'position' ? item.position.instrument : `__${item.type}__`);

export default function Positions() {
  const colors = useTheme();
  const dark = useColorScheme() === 'dark';
  const receipts = useReceipts();
  const now = useNow();
  const { favourites, setFavourites } = useFavouriteInstruments();

  const [asOf, setAsOf] = useState<Date | null>(null); // null = live "now"
  const [showPicker, setShowPicker] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [view, setView] = useState<'cumulative' | 'incremental'>('cumulative');

  const effective = asOf ?? new Date(now);
  const positions = useMemo(
    () => buildPositions(receipts, effective.getTime()),
    [receipts, effective.getTime()] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // favourites (in your order), the hint if there are none, the divider, then everything else by receipt count
  const listData = useMemo<ListItem[]>(() => {
    const byName = new Map(positions.map((p) => [p.instrument, p]));
    const favSet = new Set(favourites);
    const favItems: ListItem[] = favourites.map((name) => ({
      type: 'position',
      position: byName.get(name) ?? emptyPosition(name),
    }));
    const others: ListItem[] = positions
      .filter((p) => !favSet.has(p.instrument))
      .map((p) => ({ type: 'position', position: p }));
    return [...favItems, ...(favItems.length === 0 ? [HINT] : []), DIVIDER, ...others];
  }, [positions, favourites]);

  // the chart shows the tapped instrument if it's still listed, otherwise the first one in the list
  const selected = useMemo(() => {
    const names = listData.flatMap((i) => (i.type === 'position' ? [i.position.instrument] : []));
    return picked && names.includes(picked) ? picked : names[0] ?? null;
  }, [listData, picked]);

  const chartPoints = useMemo(
    () => (selected ? buildInstrumentChart(receipts, selected, view, effective.getTime()) : []),
    [receipts, selected, view, effective.getTime()] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const openPicker = () => {
    if (Platform.OS === 'android') {
      pickDateTimeAndroid(effective, (d) => setAsOf(d));
      return;
    }
    setShowPicker((s) => !s);
  };

  // whatever sits above the divider after a drop is the new favourites list
  const handleDragEnd = useCallback(
    ({ data }: { data: ListItem[] }) => {
      const at = data.findIndex((i) => i.type === 'divider');
      setFavourites(data.slice(0, at).flatMap((i) => (i.type === 'position' ? [i.position.instrument] : [])));
    },
    [setFavourites]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<ListItem>) => {
      if (item.type === 'hint') {
        return (
          <View style={styles.hint}>
            <Text style={[styles.hintText, { color: colors.muted }]}>Hold and drag an instrument here</Text>
          </View>
        );
      }
      if (item.type === 'divider') {
        return (
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>All other instruments</Text>
          </View>
        );
      }

      const { position } = item;
      const active = position.instrument === selected;
      return (
        <ScaleDecorator activeScale={1.03}>
          <TouchableOpacity
            onPress={() => setPicked(position.instrument)}
            onLongPress={drag}
            delayLongPress={250}
            disabled={isActive}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Show chart for ${position.instrument}`}
            style={[styles.row, (active || isActive) && { backgroundColor: colors.card }]}
          >
            <View style={styles.rowLeft}>
              <Text style={[styles.instrument, { color: colors.text }]} numberOfLines={1}>
                {position.instrument}
              </Text>
              <Text style={[styles.count, { color: colors.muted }]}>
                {position.receiptCount} receipt{position.receiptCount === 1 ? '' : 's'} · {position.counterpartyCount}{' '}
                {position.counterpartyCount === 1 ? 'counterparty' : 'counterparties'}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.amount, { color: qtyColor(position.quantity, colors) }]}>
                {formatAmount(position.quantity)}
              </Text>
              <Text style={[styles.agreed, { color: colors.muted }]}>
                agreed <Text style={{ color: qtyColor(position.agreement, colors) }}>{formatAmount(position.agreement)}</Text>
              </Text>
            </View>
          </TouchableOpacity>
        </ScaleDecorator>
      );
    },
    [colors, selected]
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={openPicker}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Choose date and time"
          style={[styles.dateButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.dateLabel, { color: colors.muted }]}>As of</Text>
          <Text style={[styles.dateText, { color: colors.text }]}>
            {asOf ? formatDatetime(asOf, 'ddd, dd mmm yyyy hh:MM am/pm') : 'Now'}
          </Text>
        </TouchableOpacity>

        {asOf && (
          <TouchableOpacity
            onPress={() => { setAsOf(null); setShowPicker(false); }}
            hitSlop={TAP_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Reset to now"
          >
            <Text style={[styles.reset, { color: colors.primary as string }]}>Now</Text>
          </TouchableOpacity>
        )}
      </View>

      {showPicker && Platform.OS === 'ios' && (
        <View style={styles.picker}>
          <DateTimePicker
            value={effective}
            mode="datetime"
            display="inline"
            onValueChange={(_, d) => setAsOf(d)}
            themeVariant={dark ? 'dark' : 'light'}
            accentColor={colors.primary as string}
          />
        </View>
      )}

      {selected && (
        <View style={styles.chartBlock}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.text }]} numberOfLines={1}>
              {selected}
            </Text>
            <View style={[styles.toggle, { borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setView('cumulative')}
                activeOpacity={0.7}
                accessibilityRole="button"
                style={[styles.toggleSide, view === 'cumulative' && { backgroundColor: colors.card }]}
              >
                <Text style={[styles.toggleText, { color: view === 'cumulative' ? colors.text : colors.muted }]}>
                  Cumulative
                </Text>
              </TouchableOpacity>
              <View style={[styles.toggleDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                onPress={() => setView('incremental')}
                activeOpacity={0.7}
                accessibilityRole="button"
                style={[styles.toggleSide, view === 'incremental' && { backgroundColor: colors.card }]}
              >
                <Text style={[styles.toggleText, { color: view === 'incremental' ? colors.text : colors.muted }]}>
                  Incremental
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <PositionsChart
            points={chartPoints}
            mode={view === 'cumulative' ? 'step' : 'bar'}
            now={effective.getTime()}
            height={220}
          />
        </View>
      )}

      <DraggableFlatList
        data={listData}
        keyExtractor={keyOf}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        extraData={selected}
        containerStyle={styles.listContainer}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={[styles.sectionLabel, { color: colors.muted }]}>Favourites</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexShrink: 1,
  },
  dateLabel: { fontSize: 12, fontFamily: 'Courier' },
  dateText: { fontSize: 12, fontFamily: 'Courier', fontWeight: '600', flexShrink: 1 },
  reset: { fontSize: 13, fontFamily: 'Courier', fontWeight: '700' },
  picker: { paddingHorizontal: 15 },

  chartBlock: { paddingHorizontal: 15, paddingBottom: 6 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  chartTitle: { flex: 1, fontSize: 14, fontFamily: 'Courier', fontWeight: '700' },
  toggle: { flexDirection: 'row', alignItems: 'stretch', borderWidth: 1, borderRadius: 8, overflow: 'hidden', flexShrink: 0 },
  toggleSide: { justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 10 },
  toggleDivider: { width: 1 },
  toggleText: { fontSize: 12, fontFamily: 'Courier', fontWeight: '600' },

  listContainer: { flex: 1 },
  listContent: { paddingHorizontal: 7, paddingBottom: 30 },
  sectionLabel: { fontSize: 12, fontFamily: 'Courier', fontWeight: '600', paddingHorizontal: 8, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8 },
  rowLeft: { flex: 1, flexShrink: 1, gap: 2 },
  rowRight: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  instrument: { fontSize: 14, fontFamily: 'Courier', fontWeight: '700' },
  count: { fontSize: 12, fontFamily: 'Courier' },
  amount: { fontSize: 15, fontFamily: 'Courier', fontWeight: '600', flexShrink: 0 },
  agreed: { fontSize: 12, fontFamily: 'Courier', opacity: 0.6 },

  hint: { paddingVertical: 14, alignItems: 'center' },
  hintText: { fontSize: 12, fontFamily: 'Courier' },
  divider: { marginTop: 6 },
  dividerLine: { height: 1, marginHorizontal: 8 },
});