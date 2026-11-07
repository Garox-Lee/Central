import type { FormValues } from '../types';

export const validateReceipt = ({ agreementDatetime, counterpartyName, transactions }: FormValues): string | null => {
  if (agreementDatetime.getTime() > Date.now()) return "Agreement date can't be in the future.";
  if (counterpartyName.trim() === '') return 'Enter a counterparty.';

  const legs = transactions.flatMap((tx) => tx.legs);
  if (legs.length === 0) return 'Add at least one leg with an instrument and a nonzero quantity.';
  if (legs.some((leg) => leg.instrument.trim() === '' || leg.quantity === 0)) {
    return 'Every leg needs an instrument and a non-zero quantity.';
  }
  return null;
};