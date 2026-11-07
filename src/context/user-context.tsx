import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { UserDetails, useUser } from '@/hooks/use-user';

type UserContextValue = ReturnType<typeof useUser>;

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const user = useUser(userId);

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }

  return context;
}

export function useUserDetails(): UserDetails {
  const { userDetails } = useUserContext();

  if (!userDetails) {
    throw new Error('useUserDetails used before user data loaded');
  }

  return userDetails;
}