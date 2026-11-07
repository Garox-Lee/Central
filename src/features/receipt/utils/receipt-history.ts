import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase';
import { formatDatetime } from '@/utils/datetime';

export type LegSnapshot = {
  instrument: string;
  quantity: number;
  detailed?: boolean; // true when the event carries settle, expiry and exclusion
  settlementDatetime?: string | null;
  expiryDatetime?: string | null;
  isExcluded?: boolean;
};

export type TransactionSnapshot = { index: number; legs: LegSnapshot[] };

export type Change =
  | { kind: 'field'; label?: string; from: string; to: string }
  | { kind: 'tag_added'; tag: string }
  | { kind: 'tag_removed'; tag: string }
  | { kind: 'leg'; from: TransactionSnapshot | null; to: TransactionSnapshot | null };

export type HistoryEvent = {
  id: string;
  at: string;
  type: string;
  scope: 'shared' | 'personal';
  title: string;
  changes: Change[];
  pending?: { amendmentId: number; byMe: boolean };
  amendmentId?: number;
  byMe: boolean;
};

type Row = {
  id: string;
  happened_at: string;
  event_type: string;
  visibility: 'shared' | 'personal';
  by_me: boolean;
  changes: any[];
  amendment_id: number | null;
  requested_at: string | null; 
};

const VERB: Record<string, string> = {
  created: 'created the receipt',
  sent: 'sent the receipt',
  edited: 'edited the receipt',
  confirmed: 'confirmed the receipt',
  declined: 'declined the receipt',
  personal_edited: 'edited personal details',
  amendment_requested: 'requested an amendment',
};

const OUTCOME: Record<string, string> = {
  amendment_accepted: 'accepted',
  amendment_declined: 'declined',
  amendment_withdrawn: 'withdrew',
};
const WHEN = 'ddd, dd mmm yyyy hh:MM am/pm';
const IGNORED_FOR_LAST_UPDATED = new Set(['amendment_requested', 'amendment_declined', 'amendment_withdrawn']);

const FIELD_LABEL: Record<string, string | undefined> = {
  shared_notes: 'Shared Notes',
  personal_notes: 'Personal Notes',
  counterparty: 'Counterparty',
  agreement_datetime: 'Agreement',
  transaction_leg_order: 'Transaction',
  settlement_datetime: 'Settles',
  expiry_datetime: 'Expires',
  is_excluded: 'Exclusion',
};

const show = (field: string, v: unknown) =>
  v == null || v === ''
    ? '--'
    : typeof v === 'boolean'
      ? (v ? 'Excluded' : 'Included')
      : field.endsWith('_datetime')
        ? formatDatetime(new Date(v as string), 'ddd, dd mmm yyyy hh:MM am/pm')
        : String(v);

const toChanges = (raw: any[] | null, sign: 1 | -1): Change[] =>
  (raw ?? []).flatMap((c): Change[] => {
    const snap = (o: any): TransactionSnapshot => ({
      index: o.transaction_leg_order,
      legs: [{
        instrument: o.instrument_name,
        quantity: o.quantity * sign,
        detailed: 'is_excluded' in o,
        settlementDatetime: o.settlement_datetime ?? null,
        expiryDatetime: o.expiry_datetime ?? null,
        isExcluded: !!o.is_excluded,
      }],
    });

    switch (c.field) {
      case 'tags': {
        const before: string[] = c.old ?? [];
        const after: string[] = c.new ?? [];
        return [
          ...after.filter((t) => !before.includes(t)).map((tag) => ({ kind: 'tag_added' as const, tag })),
          ...before.filter((t) => !after.includes(t)).map((tag) => ({ kind: 'tag_removed' as const, tag })),
        ];
      }
      case 'leg_added':
        return [{ kind: 'leg', from: null, to: snap(c.new) }];
      case 'leg_removed':
        return [{ kind: 'leg', from: snap(c.old), to: null }];
      case 'leg_changed':
        return [{ kind: 'leg', from: snap(c.old), to: snap(c.new) }];
    }

    const base = FIELD_LABEL[c.field] ?? c.field.replace(/_/g, ' ');
    const label = c.leg_id != null && c.instrument_name ? `${c.instrument_name} · ${base}` : base;
    return [{ kind: 'field', label, from: show(c.field, c.old), to: show(c.field, c.new) }];
  });

  export const toHistoryEvents = (rows: Row[], flip: boolean): HistoryEvent[] => {
    const answered = new Set(
      rows.filter((r) => r.amendment_id != null && r.event_type !== 'amendment_requested').map((r) => r.amendment_id),
    );
  
    return rows.map((r) => {
      const who = r.by_me ? 'You' : 'Counterparty';
      const outcome = OUTCOME[r.event_type];
      const title = outcome
        ? `${who} ${outcome} the amendment from ${formatDatetime(new Date(r.requested_at ?? r.happened_at), WHEN)}`
        : `${who} ${VERB[r.event_type] ?? r.event_type.replace(/_/g, ' ')}`;
  
      return {
        id: r.id,
        at: r.happened_at,
        type: r.event_type,
        scope: r.visibility,
        title,
        changes: toChanges(r.changes, flip ? -1 : 1),
        pending:
          r.event_type === 'amendment_requested' && !answered.has(r.amendment_id)
            ? { amendmentId: r.amendment_id!, byMe: r.by_me }
            : undefined,
        amendmentId: r.amendment_id ?? undefined,
        byMe: r.by_me,
      };
    });
  };

export function useReceiptHistory(receiptId: string, flip: boolean, enabled: boolean) {
  const [rows, setRows] = useState<Row[]>([]);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    supabase.schema('positions').rpc('get_receipt_history', { p_receipt_id: receiptId }).then(({ data, error }) => {
      if (error) console.warn('get_receipt_history failed:', error.code, error.message);
      if (!cancelled && !error) setRows((data as Row[]) ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [receiptId, enabled, reloads]);

  const events = useMemo(() => toHistoryEvents(rows, flip), [rows, flip]);
  const lastEvent = events.find((e) => !IGNORED_FOR_LAST_UPDATED.has(e.type)); // rows arrive newest first
  const lastUpdated = lastEvent ? new Date(lastEvent.at) : null;
  const pendingAmendment = events.find((e) => e.pending)?.pending ?? null;
  const reload = useCallback(() => setReloads((n) => n + 1), []);
  return { events, lastUpdated, pendingAmendment, reload };
}