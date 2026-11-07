import type { Receipt } from '@/features/receipt';
import { addDays, formatDatetime, parseDate } from '@/utils/datetime';

// ---------- filter types ----------

export type SearchFilter = (
  | { id: string; kind: 'counterparty'; value: string }
  | { id: string; kind: 'instrument'; value: string }
  | { id: string; kind: 'tag'; value: string }
  | { id: string; kind: 'text'; value: string }
  | { id: string; kind: 'amount'; op: 'gte' | 'lte'; value: number }
  | { id: string; kind: 'date'; op: DateOp; value: number }
) & { negate?: boolean };

type CounterpartyFilter = Extract<SearchFilter, { kind: 'counterparty' }>;
type InstrumentFilter = Extract<SearchFilter, { kind: 'instrument' }>;
type TagFilter = Extract<SearchFilter, { kind: 'tag' }>;
type TextFilter = Extract<SearchFilter, { kind: 'text' }>;
type AmountFilter = Extract<SearchFilter, { kind: 'amount' }>;
type DateFilter = Extract<SearchFilter, { kind: 'date' }>;

export type Suggestion = {
  key: string;
  group: string; // shown on the left of the dropdown row
  label: string;
  count?: number;
  filter: SearchFilter;
};

type DateOp = 'before' | 'after' | 'on';

export type Searchable = {
  counterparty: string;
  amount: number;
  datetime: Date;
  instruments: string[]; // instruments on this row's legs
  tags: string[]; // tags on this row's receipt(s)
  receipt: Pick<Receipt, 'sharedNotes' | 'personalNotes'>;
};

// ---------- constructors (ids are stable so duplicates can be detected) ----------

const counterpartyFilter = (value: string): SearchFilter => ({ id: `cp:${value}`, kind: 'counterparty', value });
const instrumentFilter = (value: string): SearchFilter => ({ id: `inst:${value}`, kind: 'instrument', value });
const textFilter = (value: string): SearchFilter => ({ id: `txt:${value.toLowerCase()}`, kind: 'text', value });
const tagFilter = (value: string): SearchFilter => ({ id: `tag:${value.toLowerCase()}`, kind: 'tag', value });

export const amountFilter = (op: 'gte' | 'lte', value: number): SearchFilter => ({
  id: `amt:${op}:${value}`,
  kind: 'amount',
  op,
  value,
});

export const dateFilter = (op: DateOp, value: number): SearchFilter => ({
  id: `date:${op}:${value}`,
  kind: 'date',
  op,
  value,
});

// ---------- labels ----------

const compact = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${+(n / 1_000).toFixed(2)}k` : `${+n.toFixed(2)}`;

export const filterLabel = (f: SearchFilter): string => {
  switch (f.kind) {
    case 'counterparty':
      return f.value;
    case 'instrument':
      return f.value;
    case 'tag':
      return `#${f.value}`;
    case 'text':
      return `"${f.value}"`;
    case 'amount':
      return `${f.op === 'gte' ? '≥' : '≤'} $${compact(f.value)}`;
    case 'date': {
      const label = f.op === 'before' ? 'Before' : f.op === 'after' ? 'After' : 'On';
      return `${label} ${formatDatetime(new Date(f.value), 'dd mmm yyyy')}`;
    }
  }
};

// ---------- amount parsing: "10k", ">10k", "<= $2.5m" ----------

const AMOUNT_RE = /^(>=|<=|>|<|≥|≤)?\s*\$?\s*(\d+(?:\.\d+)?)\s*([km])?$/i;

const parseAmountQuery = (q: string) => {
  const m = AMOUNT_RE.exec(q.trim());
  if (!m) return null;
  const unit = m[3]?.toLowerCase();
  const mult = unit === 'k' ? 1_000 : unit === 'm' ? 1_000_000 : 1;
  const value = Math.round(parseFloat(m[2]) * mult * 100) / 100;
  const op: 'gte' | 'lte' = m[1] === '<' || m[1] === '<=' || m[1] === '≤' ? 'lte' : 'gte';
  return { op, value, explicit: !!m[1] };
};

// ---------- date query parsing: "before 15 oct", "after today", "15/10" ----------

const DATE_OPS: Record<string, DateOp> = { before: 'before', '<': 'before', after: 'after', '>': 'after', on: 'on' };

const parseDateQuery = (q: string) => {
  const m = /^(before|after|on|<|>)\s*(.+)$/.exec(q.trim().toLowerCase());
  const op = m ? DATE_OPS[m[1]] : null; // null = no operator typed, so offer all three
  const value = parseDate(m ? m[2] : q);
  return value === null ? null : { op, value };
};

// ---------- suggestions ----------

export function buildSuggestions(receipts: Receipt[], query: string, active: SearchFilter[]): Suggestion[] {
  const matchingNames = (counts: Map<string, number>, q: string) =>
    [...counts.entries()]
      .filter(([name]) => name.toLowerCase().includes(q))
      .sort(
        ([a, ac], [b, bc]) =>
          Number(b.toLowerCase().startsWith(q)) - Number(a.toLowerCase().startsWith(q)) || bc - ac
      );

  const raw = query.trim();
  const q = raw.toLowerCase();
  if (!q) return [];

  const out: Suggestion[] = [];

  const amount = parseAmountQuery(q);
  if (amount) {
    const ops: ('gte' | 'lte')[] = amount.explicit ? [amount.op] : [amount.op, amount.op === 'gte' ? 'lte' : 'gte'];
    ops.forEach((op) => {
      const filter = amountFilter(op, amount.value);
      out.push({ key: filter.id, group: 'Amount', label: filterLabel(filter), filter });
    });
  }

  const date = parseDateQuery(q);
  if (date) {
    const ops: DateOp[] = date.op ? [date.op] : ['on', 'before', 'after'];
    ops.forEach((op) => {
      const filter = dateFilter(op, date.value);
      out.push({ key: filter.id, group: 'Date', label: filterLabel(filter), filter });
    });
  }

  // one pass over the receipts for every count the dropdown needs
  const wantsContains = !amount?.explicit && !date;
  const counts = new Map<string, number>();
  const instrumentCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const tagNames = new Map<string, string>(); // lowercase -> first spelling seen
  let containsCount = 0;

  for (const r of receipts) {
    counts.set(r.counterpartyName, (counts.get(r.counterpartyName) ?? 0) + 1);

    const seenInstruments = new Set<string>();
    let instrumentHit = false;
    for (const tx of r.transactions) {
      for (const leg of tx.legs) {
        const name = leg.instrument;
        if (!seenInstruments.has(name)) {
          seenInstruments.add(name);
          instrumentCounts.set(name, (instrumentCounts.get(name) ?? 0) + 1);
        }
        if (wantsContains && !instrumentHit && name.toLowerCase().includes(q)) instrumentHit = true;
      }
    }

    const seenTags = new Set<string>();
    let tagHit = false;
    for (const t of r.tags ?? []) {
      const k = t.toLowerCase();
      if (k.includes(q)) tagHit = true;
      if (seenTags.has(k)) continue;
      seenTags.add(k);
      if (!tagNames.has(k)) tagNames.set(k, t);
      tagCounts.set(k, (tagCounts.get(k) ?? 0) + 1);
    }

    if (
      wantsContains &&
      (r.counterpartyName.toLowerCase().includes(q) ||
        r.sharedNotes.toLowerCase().includes(q) ||
        r.personalNotes.toLowerCase().includes(q) ||
        tagHit ||
        instrumentHit)
    ) {
      containsCount++;
    }
  }

  matchingNames(counts, q)
    .slice(0, 4)
    .forEach(([name, count]) => {
      const filter = counterpartyFilter(name);
      out.push({ key: filter.id, group: 'Counterparty', label: name, count, filter });
    });

  matchingNames(instrumentCounts, q)
    .slice(0, 3)
    .forEach(([name, count]) => {
      const filter = instrumentFilter(name);
      out.push({ key: filter.id, group: 'Instrument', label: name, count, filter });
    });

  matchingNames(tagCounts, q)
    .slice(0, 3)
    .forEach(([k, count]) => {
      const name = tagNames.get(k) ?? k;
      const filter = tagFilter(name);
      out.push({ key: filter.id, group: 'Tag', label: `#${name}`, count, filter });
    });

  if (wantsContains) {
    const filter = textFilter(raw);
    out.push({
      key: filter.id,
      group: 'Anywhere',
      label: `Contains "${raw}"`,
      count: containsCount,
      filter,
    });
  }

  const activeIds = new Set(active.map((f) => f.id));
  return out.filter((s) => !activeIds.has(s.filter.id));
}

// ---------- matching ----------
// Counterparty tokens are OR'd together, as are instrument tokens; every other token is AND'd.
// "Contains" matches the counterparty name, the receipt notes, or any instrument on the row.

const lc = (s: string) => s.toLowerCase();
const EMPTY: string[] = [];

const splitByNegate = (fs: { value: string; negate?: boolean }[]) => ({
  pos: fs.filter((f) => !f.negate).map((f) => lc(f.value)),
  neg: fs.filter((f) => f.negate).map((f) => lc(f.value)),
});

// Parses the filters once and returns a fast per-row predicate.
export function compileFilters(filters: SearchFilter[]): (row: Searchable) => boolean {
  if (filters.length === 0) return () => true;

  const cp = splitByNegate(filters.filter((f): f is CounterpartyFilter => f.kind === 'counterparty'));
  const inst = splitByNegate(filters.filter((f): f is InstrumentFilter => f.kind === 'instrument'));
  const tag = splitByNegate(filters.filter((f): f is TagFilter => f.kind === 'tag'));

  const texts = filters
    .filter((f): f is TextFilter => f.kind === 'text')
    .map((f) => ({ v: lc(f.value), negate: !!f.negate }));

  const amounts = filters
    .filter((f): f is AmountFilter => f.kind === 'amount')
    .map((f) => ({ op: f.op, value: f.value, negate: !!f.negate }));

  const dates = filters
    .filter((f): f is DateFilter => f.kind === 'date')
    .map((f) => ({
      op: f.op,
      value: f.value,
      next: addDays(new Date(f.value), 1).getTime(), // start of the following day
      negate: !!f.negate,
    }));

  const hasTexts = texts.length > 0;
  const needName = cp.pos.length > 0 || cp.neg.length > 0 || hasTexts;
  const needInst = inst.pos.length > 0 || inst.neg.length > 0 || hasTexts;
  const needTags = tag.pos.length > 0 || tag.neg.length > 0 || hasTexts;

  return (row) => {
    const name = needName ? lc(row.counterparty) : '';
    const instruments = needInst ? row.instruments.map(lc) : EMPTY;
    const tags = needTags ? row.tags.map(lc) : EMPTY;

    if (cp.pos.length > 0 && !cp.pos.includes(name)) return false;
    if (cp.neg.length > 0 && cp.neg.includes(name)) return false;

    if (inst.pos.length > 0 && !inst.pos.some((v) => instruments.includes(v))) return false;
    if (inst.neg.length > 0 && inst.neg.some((v) => instruments.includes(v))) return false;

    if (tag.pos.length > 0 && !tag.pos.some((v) => tags.includes(v))) return false;
    if (tag.neg.length > 0 && tag.neg.some((v) => tags.includes(v))) return false;

    if (hasTexts) {
      const sharedNotes = lc(row.receipt.sharedNotes);
      const personalNotes = lc(row.receipt.personalNotes);
      for (const { v, negate } of texts) {
        const hit =
          name.includes(v) ||
          sharedNotes.includes(v) ||
          personalNotes.includes(v) ||
          instruments.some((i) => i.includes(v)) ||
          tags.some((t) => t.includes(v));
        if (negate ? hit : !hit) return false;
      }
    }

    for (const f of amounts) {
      const abs = Math.abs(row.amount);
      const fails = row.amount === 0 || (f.op === 'gte' ? abs < f.value : abs > f.value);
      if (f.negate ? !fails : fails) return false;
    }

    if (dates.length > 0) {
      const t = row.datetime.getTime();
      for (const f of dates) {
        const fails =
          f.op === 'before' ? t >= f.value : f.op === 'after' ? t < f.next : t < f.value || t >= f.next;
        if (f.negate ? !fails : fails) return false;
      }
    }

    return true;
  };
}

export function matchesFilters(row: Searchable, filters: SearchFilter[]): boolean {
  return compileFilters(filters)(row);
}