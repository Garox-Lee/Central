import { ColorValue } from 'react-native';

type QtyColors = {
  text: ColorValue;
  positiveQuantity: ColorValue;
  negativeQuantity: ColorValue;
};

export const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export const qtyColor = (q: number, colors: QtyColors): ColorValue =>
  q === 0 ? colors.text : q < 0 ? colors.negativeQuantity : colors.positiveQuantity;

const isMoney = (instrument: string) => instrument === 'AUD' || instrument === 'GST';

export const formatQty = (leg: { instrument: string; quantity: number }) => {
  const abs = Math.abs(leg.quantity);
  const num = isMoney(leg.instrument) ? abs.toFixed(2) : String(Number(abs.toFixed(3)));
  return `${leg.quantity < 0 ? '-' : '+'}${num}`;
};

const withCommas = (n: number) => {
  const [int, dec] = String(parseFloat(n.toFixed(6))).split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec ? `.${dec}` : '');
};

export const formatAmount = (v: number) => {
  if (v === 0) return '--';
  return `${v < 0 ? '-' : '+'}${withCommas(Math.abs(v))}`;
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: '$', USD: '$', HKD: '$', EUR: '€', GBP: '£',
};

export const formatCurrency = (amount: number, currency = 'AUD') =>
  `${amount < 0 ? '-' : '+'}${CURRENCY_SYMBOLS[currency] ?? ''}${Math.abs(amount).toFixed(2)}`;