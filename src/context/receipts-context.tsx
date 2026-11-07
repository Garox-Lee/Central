import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { useReceiptsData } from '@/features/receipt';

type ReceiptsContextValue = ReturnType<typeof useReceiptsData>;

const ReceiptsContext = createContext<ReceiptsContextValue | null>(null);

export function ReceiptsProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const value = useReceiptsData(userId);
  return <ReceiptsContext.Provider value={value}>{children}</ReceiptsContext.Provider>;
}

export function useReceiptsContext() {
  const ctx = useContext(ReceiptsContext);
  if (!ctx) throw new Error('useReceiptsContext must be used within a ReceiptsProvider');
  return ctx;
}

export const useReceipts = () => useReceiptsContext().receipts;
export const useAddReceipt = () => useReceiptsContext().addReceipt;
export const useUpdateReceipt = () => useReceiptsContext().updateReceipt;
export const useDeleteReceipt = () => useReceiptsContext().deleteReceipt;
export const useConfirmReceipt = () => useReceiptsContext().confirmReceipt;
export const useDeclineReceipt = () => useReceiptsContext().declineReceipt;
export const useResolveAmendment = () => useReceiptsContext().resolveAmendment;
export const useWithdrawForEdit = () => useReceiptsContext().withdrawForEdit;
export const useRefreshReceipts = () => useReceiptsContext().refresh;
