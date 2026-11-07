import { useAuth } from '@/context/auth-context';
import { useUserContext } from '@/context/user-context';

export function useAppReady() {
  const { isLoggedIn, userId } = useAuth();
  const { userDetails, failed, refresh } = useUserContext();

  const authResolved = isLoggedIn !== null; // stays false through the launch fingerprint scan
  const userResolved = !userId || !!userDetails;
  // const ratesResolved = ...  <- each future loader: one line here

  return {
    ready: authResolved && userResolved,
    failed: !!userId && !userDetails && failed,
    retry: refresh,
  };
}