import { getReceiptStatus, getTotalQuantity, type Receipt } from '@/features/receipt';
import { NOW_KEY } from '../constants';
import type { DatetimeType, ListRow, NowRow, Part, Row } from '../types';

export const isNowRow = (row: Row): row is NowRow => 'id' in row && row.id === NOW_KEY;

export const keyExtractor = (item: Row) => (isNowRow(item) ? NOW_KEY : (item as ListRow).key);

const buildAgreementRows = (receipts: Receipt[], instrument: string, keep?: (r: ListRow) => boolean): ListRow[] => {
  const rows: ListRow[] = [];
  for (const r of receipts) {
    const amount = getTotalQuantity(r, instrument);
    const names = new Set<string>();
    for (const tx of r.transactions) for (const leg of tx.legs) names.add(leg.instrument);
    const row: ListRow = {
      key: String(r.receiptId),
      datetime: r.agreementDatetime,
      t: r.agreementDatetime.getTime(),
      cp: r.counterpartyPublicId ?? `name:${r.counterpartyName}`,
      counterparty: r.counterpartyName,
      amount,
      instruments: [...names],
      tags: r.tags ?? [],
      receipt: r,
      parts: [{ receipt: r, amount, counted: amount }],
    };
    if (!keep || keep(row)) rows.push(row);
  }
  return rows;
};

const buildSettlementRows = (receipts: Receipt[], instrument: string, keep?: (r: ListRow) => boolean): ListRow[] => {
  const rows: ListRow[] = [];
  const add = (row: ListRow) => {
    if (!keep || keep(row)) rows.push(row);
  };

  for (const r of receipts) {
    const tags = r.tags ?? [];
    const cp = r.counterpartyPublicId ?? `name:${r.counterpartyName}`;
    const txs = r.transactions;

    for (let txIndex = 0; txIndex < txs.length; txIndex++) {
      const legs = txs[txIndex].legs;
      for (let legIndex = 0; legIndex < legs.length; legIndex++) {
        const leg = legs[legIndex];
        const settleDt = leg.settlementDatetime ?? r.agreementDatetime;
        const settleAmount = leg.instrument === instrument ? leg.quantity : 0;
        const settleCounted = leg.isExcluded ? 0 : settleAmount;
        add({
          key: `${r.receiptId}-${txIndex}-${legIndex}-settle`,
          datetime: settleDt,
          t: settleDt.getTime(),
          cp,
          counterparty: r.counterpartyName,
          instruments: [leg.instrument],
          tags,
          amount: settleAmount,
          receipt: r,
          parts: [{ receipt: r, amount: settleAmount, counted: settleCounted }],
        });
        if (leg.expiryDatetime) {
          const expiryAmount = leg.instrument === instrument ? -leg.quantity : 0;
          const expiryCounted = leg.isExcluded ? 0 : expiryAmount;
          add({
            key: `${r.receiptId}-${txIndex}-${legIndex}-expiry`,
            datetime: leg.expiryDatetime,
            t: leg.expiryDatetime.getTime(),
            cp,
            counterparty: r.counterpartyName,
            instruments: [leg.instrument],
            tags,
            amount: expiryAmount,
            receipt: r,
            parts: [{ receipt: r, amount: expiryAmount, counted: expiryCounted }],
          });
        }
      }
    }
  }
  return rows;
};

type Bucket = {
  row: ListRow;
  inst?: Set<string>;
  tags?: Set<string>;
  parts?: Map<Receipt['receiptId'], Part>;
};

// Merges rows with the same counterparty at the same instant, across receipts.
// Counterparty identity prefers the public id and falls back to the name for unlinked counterparties.
const mergeSettlementRows = (rows: ListRow[]): ListRow[] => {
  const map = new Map<string, Bucket>();

  for (const row of rows) {
    const key = `${row.cp}|${row.t}`;
    const b = map.get(key);
    if (!b) {
      map.set(key, { row: { ...row, key, parts: row.parts.map((p) => ({ ...p })) } });
      continue;
    }

    const ex = b.row;
    // sets/maps are only built once a second row actually merges in
    if (!b.parts) {
      b.inst = new Set(ex.instruments);
      b.tags = new Set(ex.tags);
      b.parts = new Map<Receipt['receiptId'], Part>();
      for (const p of ex.parts) b.parts.set(p.receipt.receiptId, p);
    }

    ex.amount += row.amount;
    for (const i of row.instruments) b.inst!.add(i);
    for (const t of row.tags) b.tags!.add(t);
    for (const p of row.parts) {
      const same = b.parts.get(p.receipt.receiptId);
      if (same) {
        same.amount += p.amount;
        same.counted += p.counted;
      }
      else {
        const np = { ...p };
        b.parts.set(p.receipt.receiptId, np);
        ex.parts.push(np);
      }
    }
  }

  const out: ListRow[] = [];
  map.forEach((b) => {
    if (b.parts) {
      b.row.instruments = [...b.inst!];
      b.row.tags = [...b.tags!];
    }
    out.push(b.row);
  });
  return out;
};

// `keep` filters rows BEFORE merging in settlement mode, so a merged row only
// contains receipts that match the active search.
export const buildListRows = (
  receipts: Receipt[],
  type: DatetimeType,
  instrument = 'AUD',
  keep?: (r: ListRow) => boolean
): ListRow[] =>
  type === 'agreement'
    ? buildAgreementRows(receipts, instrument, keep)
    : mergeSettlementRows(buildSettlementRows(receipts, instrument, keep));

export const byTime = (a: ListRow, b: ListRow) => a.t - b.t || a.key.localeCompare(b.key);

// only confirmed receipts and personal (unlinked) ones count toward balances, totals and graphs;
// pending and declined receipts still show as rows but add zero
export const counts = (r: Receipt) => {
  const status = getReceiptStatus(r);
  return status === 'confirmed' || status === 'unlinked';
};

// a row is out of the sums and graphs when none of the receipts behind it count
export const allExcluded = (r: ListRow) => r.parts.every((p) => !counts(p.receipt));