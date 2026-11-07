import { memo, useEffect, useMemo, useRef, useState } from 'react';

import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Svg, { Path, Rect, Line, Circle, Text as SvgText, Defs, ClipPath } from 'react-native-svg';
import { useTheme } from '@/hooks/use-theme';
import { formatAmount, qtyColor } from '@/utils/format-numbers';
import { formatDatetime } from '@/utils/datetime';
import { Palette } from '@/constants/theme';

export type ChartPoint = {
  key: string;
  value: number;
  label: string;       // no longer drawn on the axis (axis labels come from `time`)
  title: string;       // popout heading, e.g. "Sat, 10 Oct 7:34 am"
  detail: string;      // popout subtext, e.g. counterparty
  time: number;        // ms, places the point on the x axis
  spansNow?: boolean;  // collapsed group that contains "now"
  agreed?: number;     // cumulative agreement at this time (step mode only; draws the amber line and gap)
};

type Props = {
  points: ChartPoint[]; // oldest -> newest
  mode: 'bar' | 'step';
  now?: number;         // omit to hide the now line (e.g. agreement mode)
  height?: number;
};

export const NOW_BLUE = '#60A5FA';
const FONT = 9;
const CHAR_W = FONT * 0.6; // Courier advance width
const GAP = 6;             // space between y labels and the axis
const T = 8;
const B = 20;              // bottom gutter for x labels
const TIP_OFFSET = 8;
const PAD = 14;            // horizontal inset so edge bars don't hit the axis
const MAX_BAR = 28;
const LABEL_SPACING = 54;  // min px per x label
const DAY = 86_400_000;

// ---------- y axis ----------

// evenly spaced round values covering [min, max]; no extra headroom so data fills the plot
const niceTicks = (min: number, max: number, count = 4): { ticks: number[]; step: number } => {
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;

  const lo = Math.floor(min / step + 1e-9);
  const hi = Math.ceil(max / step - 1e-9);
  const ticks: number[] = [];
  for (let i = lo; i <= hi; i++) ticks.push(parseFloat((i * step).toPrecision(12)));
  return { ticks, step };
};

// one unit (k / M) for the whole axis, decimals chosen so adjacent ticks never look identical
const makeTickFormatter = (maxAbs: number, step: number) => {
  const unit = maxAbs >= 1e6 ? 1e6 : maxAbs >= 1e3 ? 1e3 : 1;
  const suffix = unit === 1e6 ? 'M' : unit === 1e3 ? 'k' : '';
  const s = step / unit;
  let d = 0;
  while (d < 4 && Math.abs(s * 10 ** d - Math.round(s * 10 ** d)) > 1e-6) d++;
  return (v: number) => {
    if (Math.abs(v) < step * 1e-9) return '0';
    return `${(v / unit).toFixed(d)}${suffix}`;
  };
};

// ---------- x axis ----------

type DateStep = { unit: 'days' | 'months'; count: number };
const DATE_STEPS: DateStep[] = [
  { unit: 'days', count: 1 },
  { unit: 'days', count: 2 },
  { unit: 'days', count: 7 },
  { unit: 'days', count: 14 },
  { unit: 'months', count: 1 },
  { unit: 'months', count: 2 },
  { unit: 'months', count: 3 },
  { unit: 'months', count: 6 },
  { unit: 'months', count: 12 },
];

// round calendar dates inside [t0, t1], at most ~maxCount of them
const dateTicks = (t0: number, t1: number, maxCount: number): { time: number; label: string }[] => {
  if (maxCount < 1) return [];
  const spanDays = (t1 - t0) / DAY;
  const start = new Date(t0);

  const build = (s: DateStep) => {
    const out: { time: number; label: string }[] = [];
    if (s.unit === 'days') {
      let first = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      if (first.getTime() < t0) first = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 1);
      for (let k = 0; ; k++) {
        const d = new Date(first.getFullYear(), first.getMonth(), first.getDate() + k * s.count);
        if (d.getTime() > t1) break;
        out.push({ time: d.getTime(), label: formatDatetime(d, 'dd mmm') });
      }
    } else {
      let first = new Date(start.getFullYear(), start.getMonth(), 1);
      if (first.getTime() < t0) first = new Date(first.getFullYear(), first.getMonth() + 1, 1);
      while (first.getMonth() % s.count !== 0) first = new Date(first.getFullYear(), first.getMonth() + 1, 1);
      for (let k = 0; ; k++) {
        const d = new Date(first.getFullYear(), first.getMonth() + k * s.count, 1);
        if (d.getTime() > t1) break;
        out.push({ time: d.getTime(), label: formatDatetime(d, 'mmm yyyy') });
      }
    }
    return out;
  };

  for (const s of DATE_STEPS) {
    const approx = s.unit === 'days' ? spanDays / s.count : spanDays / (30.44 * s.count);
    if (approx <= maxCount) {
      const t = build(s);
      if (t.length > 0) return t;
    }
  }

  // very long ranges: coarsest step, thinned
  const t = build(DATE_STEPS[DATE_STEPS.length - 1]);
  const every = Math.max(1, Math.ceil(t.length / maxCount));
  return t.filter((_, i) => i % every === 0);
};

function PositionsChart({ points, mode, now, height = 140 }: Props) {
  const colors = useTheme();
  const [width, setWidth] = useState(0);
  const [tipW, setTipW] = useState(150);
  const [sel, setSel] = useState<number | null>(null);
  const touch = useRef({ prev: null as number | null, start: 0, moved: false });

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const n = points.length;
  const values = points.map((p) => p.value);

  // clear the popout when the underlying data or mode changes
  const sig = useMemo(() => `${mode}|${points.map((p) => p.key).join(',')}`, [mode, points]);
  useEffect(() => setSel(null), [sig]);

  if (n === 0) return null;

  // ---- y scale ----
  // cumulative view only: the agreement line shares the y scale with the settlement line
  const hasAgreed = mode === 'step' && points.some((p) => p.agreed !== undefined);
  const agreed = points.map((p) => p.agreed ?? p.value);
  const scaled = hasAgreed ? [...values, ...agreed] : values;

  let dataMin = mode === 'bar' ? Math.min(0, ...scaled) : Math.min(...scaled);
  let dataMax = mode === 'bar' ? Math.max(0, ...scaled) : Math.max(...scaled);
  if (dataMin === dataMax) {
    dataMin -= 1;
    dataMax += 1;
  }

  const { ticks, step } = niceTicks(dataMin, dataMax);
  const min = ticks[0];
  const max = ticks[ticks.length - 1];
  const fmtTick = makeTickFormatter(Math.max(Math.abs(min), Math.abs(max)), step);
  const isZero = (v: number) => Math.abs(v) < (max - min) * 1e-9;

  // left gutter sized to the widest y label
  const L = Math.ceil(Math.max(...ticks.map((v) => fmtTick(v).length)) * CHAR_W) + GAP;
  const R = 0;

  const plotW = width - L - R;
  const plotH = height - T - B;
  const y = (v: number) => T + ((max - v) / (max - min)) * plotH;
  const y0 = y(0);

  // ---- x scale (time) ----
  // a collapsed group containing "now" can't be placed exactly, so it starts at now
  const times = points.map((p) => (p.spansNow && now !== undefined ? now : p.time));
  let t0 = Math.min(...times, ...(now !== undefined ? [now] : []));
  let t1 = Math.max(...times, ...(now !== undefined ? [now] : []));
  if (t0 === t1) {
    t0 -= DAY / 2;
    t1 += DAY / 2;
  }
  const innerW = Math.max(1, plotW - 2 * PAD);
  const xT = (t: number) => L + PAD + ((t - t0) / (t1 - t0)) * innerW;
  const xs = times.map(xT);
  const nowX = now !== undefined ? xT(now) : undefined;
  const clipId = nowX !== undefined ? Math.round(nowX * 10) : 0;
  const isFuture = (i: number) => now !== undefined && times[i] > now;

  // bar width from the closest pair of points
  const sortedX = [...new Set(xs.map((x) => Math.round(x * 100) / 100))].sort((a, b) => a - b);
  let minGap = Infinity;
  for (let i = 1; i < sortedX.length; i++) minGap = Math.min(minGap, sortedX[i] - sortedX[i - 1]);
  const bw = Number.isFinite(minGap) ? Math.max(2, Math.min(MAX_BAR, minGap * 0.7)) : Math.min(MAX_BAR, plotW * 0.1);

  // x labels
  const xTicks = dateTicks(t0, t1, Math.floor(plotW / LABEL_SPACING));

  // step path: each value holds until the next point's time, the last one to the right edge
  let stepPath = '';
  let agreedPath = '';
  let gapPath = '';
  if (mode === 'step') {
    stepPath = `M ${xs[0]} ${y(values[0])}`;
    for (let i = 1; i < n; i++) stepPath += ` H ${xs[i]} V ${y(values[i])}`;
    stepPath += ` H ${width - R}`;

    if (hasAgreed) {
      // amber is only drawn where it differs from the blue line, so the two never sit on top of each other
      const differs = (i: number) => Math.abs(agreed[i] - values[i]) > 5e-7;
      for (let i = 0; i < n; i++) {
        if (!differs(i)) continue;
        const x1 = i + 1 < n ? xs[i + 1] : width - R;
        if (i > 0 && differs(i - 1)) agreedPath += ` M ${xs[i]} ${y(agreed[i - 1])} V ${y(agreed[i])}`;
        agreedPath += ` M ${xs[i]} ${y(agreed[i])} H ${x1}`;
      }

      // the gap: out along the settlement line, then back along the agreement line
      gapPath = `${stepPath} V ${y(agreed[n - 1])}`;
      for (let i = n - 1; i >= 1; i--) gapPath += ` H ${xs[i]} V ${y(agreed[i - 1])}`;
      gapPath += ` H ${xs[0]} Z`;
    }
  }

  // ---- touch: tap or drag to inspect, tap the same point again (or the y labels) to dismiss ----
  const idxFromX = (x: number) => {
    let best = 0;
    let bestD = Infinity;
    xs.forEach((px, i) => {
      const d = Math.abs(px - x);
      if (d <= bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };
  const hasSel = sel !== null && sel < n;
  const selected = hasSel ? points[sel as number] : null;

  const cx = hasSel ? xs[sel as number] : 0;
  const tipLeft = cx < width / 2 ? cx + TIP_OFFSET : cx - TIP_OFFSET - tipW;

  return (
    <View style={styles.wrap}>
      <View
        style={{ height }}
        onLayout={onLayout}
        onTouchStart={(e) => {
          if (plotW <= 0) return;
          const x = e.nativeEvent.locationX;
          if (x < L) {
            setSel(null);
            return;
          }
          const i = idxFromX(x);
          touch.current = { prev: hasSel ? (sel as number) : null, start: i, moved: false };
          setSel(i);
        }}
        onTouchMove={(e) => {
          if (plotW <= 0 || e.nativeEvent.locationX < L) return;
          const i = idxFromX(e.nativeEvent.locationX);
          if (i !== touch.current.start) touch.current.moved = true;
          setSel(i);
        }}
        onTouchEnd={() => {
          if (!touch.current.moved && touch.current.prev === touch.current.start) setSel(null);
        }}
      >
        {width > 0 && (
          <Svg width={width} height={height} pointerEvents="none">
            <Defs>
              {nowX !== undefined && (
                <>
                  <ClipPath id={`past-${clipId}`}>
                    <Rect x={0} y={0} width={Math.max(0, nowX)} height={height} />
                  </ClipPath>
                  <ClipPath id={`future-${clipId}`}>
                    <Rect x={nowX} y={0} width={Math.max(0, width - nowX)} height={height} />
                  </ClipPath>
                </>
              )}
            </Defs>

            {/* muted horizontal grid lines */}
            {ticks.map((v, i) => (
              <Line
                key={`g${i}`}
                x1={L}
                x2={width - R}
                y1={y(v)}
                y2={y(v)}
                stroke={colors.muted}
                strokeOpacity={isZero(v) ? 0.6 : 0.25}
                strokeWidth={1}
                strokeDasharray={isZero(v) ? '3,3' : undefined}
              />
            ))}

            {/* faint vertical grid lines at each date label */}
            {xTicks.map((t) => (
              <Line
                key={`vg${t.time}`}
                x1={xT(t.time)}
                x2={xT(t.time)}
                y1={T}
                y2={height - B}
                stroke={colors.muted}
                strokeOpacity={0.12}
                strokeWidth={1}
              />
            ))}

            {/* y labels */}
            {ticks.map((v, i) => (
              <SvgText
                key={`t${i}`}
                x={L - GAP}
                y={y(v) + FONT * 0.35}
                fontSize={FONT}
                fontFamily="Courier"
                fill={colors.muted}
                textAnchor="end"
              >
                {fmtTick(v)}
              </SvgText>
            ))}

            {/* axes */}
            <Line x1={L} x2={L} y1={T} y2={height - B} stroke={colors.border} strokeWidth={1} />
            <Line x1={L} x2={width - R} y1={height - B} y2={height - B} stroke={colors.border} strokeWidth={1} />

            {/* x labels */}
            {xTicks.map((t) => {
              const w = t.label.length * CHAR_W;
              const x = Math.max(L + w / 2, Math.min(width - R - w / 2, xT(t.time)));
              return (
                <SvgText
                  key={`x${t.time}`}
                  x={x}
                  y={height - B / 2 + FONT * 0.35}
                  fontSize={FONT}
                  fontFamily="Courier"
                  fill={colors.muted}
                  textAnchor="middle"
                >
                  {t.label}
                </SvgText>
              );
            })}

            {/* agreement: shaded gap to the settlement line, plus the amber dotted line */}
            {hasAgreed && (
              <>
                <Path d={gapPath} fill={Palette.amber} fillOpacity={0.15} />
                {agreedPath !== '' && (
                  <Path
                    d={agreedPath}
                    stroke={Palette.amber}
                    strokeWidth={2}
                    fill="none"
                    strokeDasharray="2,3"
                    strokeLinecap="round"
                  />
                )}
              </>
            )}

            {/* data */}
            {mode === 'bar' ? (
              points.map((p, i) => {
                const yv = y(p.value);
                const h = p.value === 0 ? 0 : Math.max(1, Math.abs(yv - y0));
                if (h === 0) return null;
                return (
                  <Rect
                    key={p.key}
                    x={xs[i] - bw / 2}
                    y={Math.min(yv, y0)}
                    width={bw}
                    height={h}
                    fill={p.value < 0 ? colors.negativeQuantity : colors.positiveQuantity}
                    opacity={isFuture(i) ? 0.45 : 1}
                  />
                );
              })
            ) : nowX !== undefined ? (
              <>
                <Path d={stepPath} stroke={colors.primary} strokeWidth={2} fill="none" clipPath={`url(#past-${clipId})`} />
                <Path
                  d={stepPath}
                  stroke={colors.primary}
                  strokeWidth={2}
                  fill="none"
                  strokeDasharray="5,4"
                  clipPath={`url(#future-${clipId})`}
                />
              </>
            ) : (
              <Path d={stepPath} stroke={colors.primary} strokeWidth={2} fill="none" />
            )}

            {/* now line */}
            {nowX !== undefined && (
              <Line x1={nowX} x2={nowX} y1={T} y2={height - B} stroke={NOW_BLUE} strokeWidth={1.5} strokeOpacity={0.9} />
            )}

            {/* selection: crosshair + marker */}
            {selected && (
              <>
                <Line
                  x1={cx}
                  x2={cx}
                  y1={T}
                  y2={height - B}
                  stroke={colors.text}
                  strokeOpacity={0.5}
                  strokeWidth={1}
                />
                <Circle
                  cx={cx}
                  cy={y(selected.value)}
                  r={4}
                  fill={colors.background}
                  stroke={mode === 'bar' ? (qtyColor(selected.value, colors) as string) : colors.primary}
                  strokeWidth={2}
                />
              </>
            )}
          </Svg>
        )}

        {/* popout */}
        {selected && (
          <View
            pointerEvents="none"
            onLayout={(e) => setTipW(e.nativeEvent.layout.width)}
            style={[
              styles.tip,
              {
                left: Math.max(0, Math.min(width - tipW, tipLeft)),
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.tipTitle, { color: colors.text }]} numberOfLines={1}>
              {selected.title}
            </Text>
            <Text style={[styles.tipValue, { color: qtyColor(selected.value, colors) }]}>
              {formatAmount(selected.value)}
            </Text>
            {selected.agreed !== undefined ? (
              <Text style={[styles.tipDetail, styles.tipAgreed, { color: colors.muted }]} numberOfLines={1}>
                agreed <Text style={{ color: qtyColor(selected.agreed, colors) }}>{formatAmount(selected.agreed)}</Text>
              </Text>
            ) : (
              <Text style={[styles.tipDetail, { color: colors.muted }]} numberOfLines={1}>
                {selected.detail}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 8 },
  tip: {
    position: 'absolute',
    top: T,
    maxWidth: 200,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 2,
  },
  tipTitle: { fontSize: 11, fontFamily: 'Courier', fontWeight: '700', alignSelf: 'flex-end' },
  tipDetail: { fontSize: 10, fontFamily: 'Courier', alignSelf: 'flex-end' },
  tipValue: { fontSize: 14, fontFamily: 'Courier', fontWeight: '700', alignSelf: 'flex-end' },
  tipAgreed: { opacity: 0.6 },
});

export default memo(PositionsChart);