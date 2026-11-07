import type { HistoryEvent } from './receipt-history';

export type Tone = 'line' | 'amber' | 'red' | 'muted';

export type Cell = {
  top: boolean;     // line from the top of the row down to the dot
  bottom: boolean;  // line from the dot down to the bottom of the row
  dot: boolean;
  elbow: boolean;   // curves into the main line on this row (with top: a fork, with bottom: a merge)
  tone: Tone;       // colour of the lines
  dotTone?: Tone;   // colour of the dot on a branch
};

// lanes run left to right; lanes[main] is the main line
export type RowGraph = { lanes: Cell[]; main: number };

// events that live on a branch rather than the main line (an accepted amendment merges into the main line)
const BRANCH_ROW = new Set(['amendment_requested', 'amendment_declined', 'amendment_withdrawn']);
const OUTCOME = new Set(['amendment_accepted', 'amendment_declined', 'amendment_withdrawn']);

type Branch = {
  iR: number;   // row of the request
  iO: number;   // row of the outcome, -1 while pending
  iF: number;   // row it forked from: the next older event on the main line
  top: number;
  bottom: number;
  side: 1 | -1;
  slot: number;
  outcome: string | null;
};

const blank = (): Cell => ({ top: false, bottom: false, dot: false, elbow: false, tone: 'line' });

/** events newest first. One graph row per event. */
export function buildGraph(events: HistoryEvent[]): RowGraph[] {
  const n = events.length;
  const branches: Branch[] = [];

  events.forEach((e, iR) => {
    if (e.type !== 'amendment_requested' || e.amendmentId == null) return;
    const iO = events.findIndex((x) => x.amendmentId === e.amendmentId && OUTCOME.has(x.type));
    let iF = n;
    for (let i = iR + 1; i < n; i++) {
      if (!BRANCH_ROW.has(events[i].type)) {
        iF = i;
        break;
      }
    }
    branches.push({
      iR,
      iO,
      iF,
      top: iO === -1 ? iR : iO,
      bottom: Math.min(iF, n - 1),
      side: e.byMe ? 1 : -1, // my requests branch to the right, the counterparty's to the left
      slot: 0,
      outcome: iO === -1 ? null : events[iO].type,
    });
  });

  // branches that overlap on the same side get separate lanes
  for (const b of branches) {
    let slot = 1;
    while (branches.some((o) => o !== b && o.slot === slot && o.side === b.side && o.top <= b.bottom && b.top <= o.bottom)) slot++;
    b.slot = slot;
  }

  const left = Math.max(0, ...branches.filter((b) => b.side === -1).map((b) => b.slot));
  const right = Math.max(0, ...branches.filter((b) => b.side === 1).map((b) => b.slot));
  const main = left;
  const laneCount = left + 1 + right;

  const rows: RowGraph[] = events.map((e, i) => {
    const lanes = Array.from({ length: laneCount }, blank);
    lanes[main] = { ...blank(), top: i > 0, bottom: i < n - 1, dot: !BRANCH_ROW.has(e.type) };
    return { lanes, main };
  });

  for (const b of branches) {
    const p = main + b.side * b.slot;
    const line: Tone = b.outcome === 'amendment_declined' ? 'red' : b.outcome === 'amendment_withdrawn' ? 'muted' : 'line';
    const paint = (i: number, c: Partial<Cell>) => Object.assign(rows[i].lanes[p], { tone: line }, c);

    // the request: the first commit on the branch
    paint(b.iR, { dot: true, dotTone: 'amber', top: b.iO !== -1, bottom: b.iR < n - 1 });

    // the outcome: merges into the main line, or ends the branch where it hangs
    if (b.iO !== -1) {
      if (b.outcome === 'amendment_accepted') paint(b.iO, { bottom: true, elbow: true });
      else paint(b.iO, { dot: true, dotTone: line, bottom: true });
      for (let i = b.iO + 1; i < b.iR; i++) paint(i, { top: true, bottom: true });
    }

    // down to where it forked off the main line
    for (let i = b.iR + 1; i < Math.min(b.iF, n); i++) paint(i, { top: true, bottom: true });
    if (b.iF < n) paint(b.iF, { top: true, elbow: true });
  }

  return rows;
}