import { useState } from 'react';

import { parseCentralQr } from '@/utils/qr';
import { fetchCounterparty } from '../api/counterparty';

export function useCounterpartyLink(p: {
  ownPublicId: string | null | undefined;
  linkedId: string | null;
  setCounterparty: (name: string, publicId: string | null) => void;
  notify: (message: string) => void;
}) {
  const { ownPublicId, linkedId, setCounterparty, notify } = p;
  const [scannerOpen, setScannerOpen] = useState(false);
  const [unlinkArmed, setUnlinkArmed] = useState(false);

  const onScanned = async (data: string) => {
    setScannerOpen(false);

    const scanned = parseCentralQr(data);
    if (!scanned) return notify('Not a valid Central QR code.');
    if (scanned === ownPublicId) return notify("You can't scan your own QR code.");

    const row = await fetchCounterparty(scanned);
    if (!row) return notify('Could not find that user.');
    setCounterparty(row.display_name, scanned);
  };

  // scan → (tap) arm unlink → (tap again) unlink and clear name
  const onIconPress = () => {
    if (!linkedId) setScannerOpen(true);
    else if (!unlinkArmed) setUnlinkArmed(true);
    else {
      setCounterparty('', null);
      setUnlinkArmed(false);
    }
  };

  return {
    scannerOpen,
    unlinkArmed,
    onScanned,
    onIconPress,
    closeScanner: () => setScannerOpen(false),
    disarm: () => setUnlinkArmed(false),
  };
}

export type CounterpartyLink = ReturnType<typeof useCounterpartyLink>;