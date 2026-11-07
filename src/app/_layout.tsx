// app/_layout.tsx
import { useEffect, useRef } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { AppState } from 'react-native';
import { ThemeProvider, Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { NavDarkTheme, NavLightTheme } from '@/constants/theme';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { UserProvider } from '@/context/user-context';
import { AppGate } from '@/components/app-gate';
import { ReceiptsProvider } from '@/context/receipts-context';
import { initNotifications, subscribeToReceiptTaps, setNotificationsAllowed, registerPushToken } from '@/utils/notifications';
import { updatesAvailable, useUpdatesSafe, checkAndFetchUpdate } from '@/utils/updates';

SplashScreen.preventAutoHideAsync();

function NotificationsAuthSync() {
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    setNotificationsAllowed(isLoggedIn === true);
    if (isLoggedIn === true) registerPushToken().catch(console.log);
  }, [isLoggedIn]);

  return null;
}

// -> npm run update:preview -- --message "Test: rename expand button"  Try this next time
function UpdateChecker() {
  const { isUpdatePending } = useUpdatesSafe();
  const pendingRef = useRef(isUpdatePending);
  const busyRef = useRef(false);

  useEffect(() => { pendingRef.current = isUpdatePending; }, [isUpdatePending]);

  useEffect(() => {
    if (__DEV__ || !updatesAvailable) return;

    const check = async () => {
      if (busyRef.current || pendingRef.current) return;
      busyRef.current = true;
      try {
        await checkAndFetchUpdate(); // silent; applies on next cold start
      } catch (e) {
        console.log('Update check failed', e);
      } finally {
        busyRef.current = false;
      }
    };

    check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, []);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const navTheme = colorScheme === 'dark' ? NavDarkTheme : NavLightTheme;
  const router = useRouter();

  useEffect(() => { initNotifications(); }, []);
  useEffect(() => subscribeToReceiptTaps(() => router.navigate('/(finance)/receipts')), [router]);
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(navTheme.colors.background);
  }, [navTheme]);

  return (
    <AuthProvider>
      <NotificationsAuthSync />
      <UpdateChecker />
      <UserProvider>
        <ReceiptsProvider>
          <ThemeProvider value={navTheme}>
            <AppGate>
              <AnimatedSplashOverlay />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'default',
                  contentStyle: { backgroundColor: navTheme.colors.background },
                  animationTypeForReplace: 'push',
                }}
              />
            </AppGate>
          </ThemeProvider>
        </ReceiptsProvider>
      </UserProvider>
    </AuthProvider>
  );
}