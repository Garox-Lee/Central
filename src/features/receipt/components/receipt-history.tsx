import { useMemo, useState } from 'react';

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { useAdaptiveLayout } from '@/hooks/use-adaptive-layout';
import { formatQty, qtyColor } from '@/utils/format-numbers';
import SegmentedControl from '../../../components/segmented-control';
import { formatDatetime } from '@/utils/datetime';
import { HistoryEvent, TransactionSnapshot } from '../utils/receipt-history';
import { buildGraph, type RowGraph, type Tone } from '../utils/history-graph';
import { Receipt } from '../types';
import { TagChip } from './tag-chip';
import { Palette } from '@/constants/theme';
import { FMT } from '../constants';

type HistoryFilter = 'shared' | 'all';

const FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: 'shared', label: 'Shared only' },
  { key: 'all', label: 'With personal' },
];

// ----- rail geometry (the git-style graph on the left of each entry) -----
const LANE_W = 18;
const DOT = 10;
const DOT_Y = 9;  // vertical centre of a dot, level with the first line of text
const CURVE = 7;  // radius of the fork and merge curves
const laneX = (p: number) => p * LANE_W + DOT / 2;

function Struck({ children }: { children: React.ReactNode }) {
  const colors = useTheme();
  return (
    <Text style={[styles.text, { color: colors.muted, textDecorationLine: 'line-through' }]}>
      {children}
    </Text>
  );
}

function TransactionBlock({ tx, struck }: { tx: TransactionSnapshot; struck?: boolean }) {
  const colors = useTheme();
  const { textScale } = useAdaptiveLayout();
  const strike = struck ? { textDecorationLine: 'line-through' as const } : null;

  return (
    <View style={[styles.tx, struck && styles.txStruck]}>
      {tx.legs.map((leg, i) => {
        const dates = leg.detailed
        ? [
            leg.settlementDatetime && `Settles: ${formatDatetime(new Date(leg.settlementDatetime), FMT.full)}`,
            leg.expiryDatetime && `Expires: ${formatDatetime(new Date(leg.expiryDatetime), FMT.full)}`,
          ]
            .filter(Boolean)
            .join(' - ')
        : '';
        const showExcluded = !!leg.detailed && !!leg.isExcluded;

        return (
          <View key={i} style={styles.legBlock}>
            <View style={styles.legLine}>
              <Text style={[styles.text, { color: colors.muted, width: 24 * textScale }, strike]}>
                {i === 0 ? `${tx.index}.` : ''}
              </Text>
              <Text style={[styles.text, styles.legName, { color: colors.text }, strike]}>
                {leg.instrument}
              </Text>
              <Text style={[styles.legQty, { color: qtyColor(leg.quantity, colors) }, strike]}>
                {formatQty(leg)}
              </Text>
            </View>

            {(showExcluded || dates !== '') && (
              <View style={[styles.legMeta, { marginLeft: 24 * textScale }]}>
                {showExcluded && (
                  <Text style={[styles.excludedText, { color: Palette.amber }, strike]}>Excluded</Text>
                )}
                {dates !== '' && (
                  <Text style={[styles.dateText, { color: colors.muted }, strike]}>{dates}</Text>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

type Change = HistoryEvent['changes'][number];

function headerOf(c: Change): string {
  if (c.kind === 'field') return c.label ?? 'Details';
  if (c.kind === 'leg') return 'Transaction Legs';
  return 'Tags';
}

function DashedRule() {
  const colors = useTheme();
  const [height, setHeight] = useState(0);
  const count = Math.ceil(height / 8);

  return (
    <View style={styles.rule} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <View style={styles.dashes}>
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={[styles.dash, { backgroundColor: colors.border }]} />
        ))}
      </View>
    </View>
  );
}

function ChangeBody({ event }: { event: HistoryEvent }) {
  const colors = useTheme();
  if (event.changes.length === 0) return null;

  const groups: { header: string; changes: Change[] }[] = [];
  for (const c of event.changes) {
    const header = headerOf(c);
    const g = groups.find((x) => x.header === header);
    if (g) g.changes.push(c);
    else groups.push({ header, changes: [c] });
  }

  return (
    <View style={styles.changeBody}>
      {groups.map((g) => (
        <View key={g.header} style={styles.group}>
          <Text style={[styles.groupHeader, { color: colors.text }]}>{g.header.toUpperCase()}</Text>
          <View style={styles.groupBody}>
            <DashedRule />
            <View style={styles.groupContent}>
              {g.changes.map((c, i) => {
                switch (c.kind) {
                  case 'field': {
                    const added = !c.from && !!c.to;
                    const removed = !!c.from && !c.to;
                    return (
                      <View key={i} style={{ gap: 4 }}>
                        {added && <Text style={[styles.text, { color: colors.muted }]}>Added</Text>}
                        {removed && <Text style={[styles.text, { color: colors.muted }]}>Removed</Text>}
                        {c.from ? <Struck>{c.from}</Struck> : null}
                        {c.to ? <Text style={[styles.text, { color: colors.text }]}>{c.to}</Text> : null}
                      </View>
                    );
                  }
                  case 'tag_added': {
                    const tags = g.changes.flatMap((x) => (x.kind === 'tag_added' ? [x.tag] : []));
                    if (g.changes.findIndex((x) => x.kind === 'tag_added') !== i) return null;
                    return (
                      <View key={i} style={styles.tagRow}>
                        <Text style={[styles.text, { color: colors.muted, marginTop: 3 }]}>Added</Text>
                        <View style={styles.tagChips}>
                          {tags.map((t) => (
                            <TagChip key={t} label={t} />
                          ))}
                        </View>
                      </View>
                    );
                  }
                  case 'tag_removed': {
                    const tags = g.changes.flatMap((x) => (x.kind === 'tag_removed' ? [x.tag] : []));
                    if (g.changes.findIndex((x) => x.kind === 'tag_removed') !== i) return null;
                    return (
                      <View key={i} style={styles.tagRow}>
                        <Text style={[styles.text, { color: colors.muted, marginTop: 3 }]}>Removed</Text>
                        <View style={[styles.tagChips, { opacity: 0.55 }]}>
                          {tags.map((t) => (
                            <TagChip key={t} label={t} struck />
                          ))}
                        </View>
                      </View>
                    );
                  }
                  case 'leg':
                    return (
                      <View key={i} style={{ gap: 8 }}>
                        {c.from && <TransactionBlock tx={c.from} struck />}
                        {c.to && <TransactionBlock tx={c.to} />}
                      </View>
                    );
                }
              })}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/** One row of the branch graph: the main line, plus any amendment branches passing through or starting or ending here. */
function Rail({ graph, event }: { graph: RowGraph; event: HistoryEvent }) {
  const colors = useTheme();
  const toneColor = (t: Tone): string =>
    t === 'amber'
      ? (Palette.amber as string)
      : t === 'red'
        ? (colors.danger as string)
        : t === 'muted'
          ? (colors.border as string)
          : (colors.border as string);
  const mainX = laneX(graph.main);
  const shared = event.scope === 'shared';

  return (
    <View style={{ width: graph.lanes.length * LANE_W }}>
      {graph.lanes.map((cell, p) => {
        const x = laneX(p);
        const color = toneColor(cell.tone);
        const isMain = p === graph.main;
        const dir = p > graph.main ? 1 : -1; // +1: this lane is right of the main line
        const fork = cell.elbow && cell.top;     // arrives from above, bends into the main line
        const merge = cell.elbow && cell.bottom; // leaves the main line, bends down
        const topEnd = fork ? DOT_Y + 1 - CURVE : DOT_Y;
        const bottomStart = merge ? DOT_Y - 1 + CURVE : DOT_Y;

        return (
          <View key={p} style={StyleSheet.absoluteFill} pointerEvents="none">
            {cell.top && (
              <View style={[styles.railV, { left: x - 1, top: 0, height: topEnd, backgroundColor: color }]} />
            )}
            {cell.bottom && (
              <View style={[styles.railV, { left: x - 1, top: bottomStart, bottom: 0, backgroundColor: color }]} />
            )}

            {cell.elbow && !isMain && (
              <>
                <View
                  style={[
                    styles.railH,
                    {
                      top: DOT_Y - 1,
                      left: dir > 0 ? mainX : x - 1 + CURVE,
                      width: dir > 0 ? x + 1 - CURVE - mainX : mainX - (x - 1 + CURVE),
                      backgroundColor: color,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.railCorner,
                    {
                      left: dir > 0 ? x + 1 - CURVE : x - 1,
                      top: fork ? DOT_Y + 1 - CURVE : DOT_Y - 1,
                      borderColor: color,
                      borderRightWidth: dir > 0 ? 2 : 0,
                      borderLeftWidth: dir > 0 ? 0 : 2,
                      borderBottomWidth: fork ? 2 : 0,
                      borderTopWidth: fork ? 0 : 2,
                      borderBottomRightRadius: fork && dir > 0 ? CURVE : 0,
                      borderBottomLeftRadius: fork && dir < 0 ? CURVE : 0,
                      borderTopRightRadius: !fork && dir > 0 ? CURVE : 0,
                      borderTopLeftRadius: !fork && dir < 0 ? CURVE : 0,
                    },
                  ]}
                />
              </>
            )}
          </View>
        );
      })}

      {graph.lanes.map((cell, p) => {
        if (!cell.dot) return null;
        const isMain = p === graph.main;
        return (
          <View key={`dot-${p}`} style={StyleSheet.absoluteFill} pointerEvents="none">
            <View
              style={[
                styles.railDot,
                { left: laneX(p) - DOT / 2, top: DOT_Y - DOT / 2 },
                isMain
                  ? shared
                    ? { backgroundColor: colors.primary as string }
                    : {
                        backgroundColor: colors.background as string,
                        borderColor: colors.muted as string,
                        borderWidth: 2,
                      }
                  : { backgroundColor: toneColor(cell.dotTone ?? 'line') },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

function HistoryEntry({ event, graph }: { event: HistoryEvent; graph: RowGraph }) {
  const colors = useTheme();

  return (
    <View style={styles.entry}>
      <Rail graph={graph} event={event} />
      <View style={styles.entryBody}>
        <Text style={styles.meta}>
          <Text style={{ color: colors.muted }}>{formatDatetime(new Date(event.at), 'ddd, dd mmm yyyy hh:MM am/pm')} - </Text>
          <Text style={{ color: colors.text }}>{event.title}</Text>
        </Text>
        <ChangeBody event={event} />
      </View>
    </View>
  );
}

type Props = { receipt: Receipt; events: HistoryEvent[]; onBack: () => void };

export default function ReceiptHistory({ events: all, onBack }: Props) {
  const colors = useTheme();
  const { stacked, iconScale } = useAdaptiveLayout();
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const events = useMemo(
    () =>
      all
        .filter((e) => filter === 'all' || e.scope === 'shared')
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [all, filter]
  );
  const graph = useMemo(() => buildGraph(events), [events]);

  return (
    <View style={styles.container}>
      <View style={stacked ? styles.headerStacked : styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { marginLeft: 6 - 11 * iconScale }]}
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Back to receipt"
          accessibilityRole="button"
        >
          <ChevronLeft size={22 * iconScale} color={colors.text as string} />
          <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>

        <SegmentedControl
          options={FILTERS}
          value={filter}
          onChange={setFilter}
          style={stacked ? undefined : styles.filterControl}
        />
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {events.map((event, i) => (
          <HistoryEntry key={event.id} event={event} graph={graph[i]} />
        ))}
      </BottomSheetScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 12,
  },
  headerStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 12,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 14, fontFamily: 'Courier', fontWeight: '600' },
  filterControl: { width: 220 },
  content: { paddingHorizontal: 24, paddingBottom: 40 },

  entry: { flexDirection: 'row', gap: 4 },
  railV: { position: 'absolute', width: 2 },
  railH: { position: 'absolute', height: 2 },
  railCorner: { position: 'absolute', width: CURVE, height: CURVE },
  railDot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2 },
  entryBody: { flex: 1, paddingBottom: 15 },
  meta: { fontSize: 12, fontFamily: 'Courier', fontWeight: '600' },
  changeBody: { marginTop: 8, gap: 14 },
  text: { fontSize: 14, fontFamily: 'Courier' },

  group: { gap: 8 },
  groupHeader: { fontSize: 12, fontFamily: 'Courier', fontWeight: '700', letterSpacing: 1 },
  groupBody: { flexDirection: 'row', gap: 12 },
  rule: { width: 2, overflow: 'hidden' },
  dashes: { position: 'absolute', top: 0, left: 0, right: 0 },
  dash: { width: 2, height: 4, marginBottom: 4 },
  groupContent: { flex: 1, gap: 10 },
  tagRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tagChips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  
  tx: { gap: 4 },
  txStruck: { opacity: 0.55 },
  legLine: { flexDirection: 'row', alignItems: 'center' },
  legBlock: { gap: 2 },
  legMeta: { flexDirection: 'row', alignItems: 'flex-start', columnGap: 12 },
  excludedText: { fontSize: 12, fontFamily: 'Courier', flexShrink: 0 },
  dateText: { fontSize: 12, fontFamily: 'Courier', flexShrink: 1, marginLeft: 'auto', textAlign: 'right' },
  metaText: { fontSize: 12, fontFamily: 'Courier' },
  legName: { flex: 1, marginRight: 12 },
  legQty: { fontSize: 14, fontFamily: 'Courier', fontWeight: '600', flexShrink: 0 },
});