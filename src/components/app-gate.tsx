import { ReactNode, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import LoadingScreen from '@/components/loading-screen';
import { useAuth } from '@/context/auth-context';
import { useUserContext } from '@/context/user-context';

const MIN_LOADING_MS = 5000;

export function AppGate({ children }: { children: ReactNode }) {
  const { isLoggedIn, userId, signOut } = useAuth();
  const { userDetails, failed } = useUserContext();

  // every loader adds a line here
  const ready = isLoggedIn !== null && (!userId || !!userDetails);

  // user data couldn't load -> sign out and go back to the sign-in screen
  const signingOut = useRef(false);
  useEffect(() => {
    if (userId && !userDetails && failed && !signingOut.current) {
      signingOut.current = true;
      (async () => {
        await signOut();
        router.replace('/(auth)/sign-in');
        signingOut.current = false;
      })();
    }
  }, [userId, userDetails, failed, signOut]);

  // keep the overlay up until BOTH ready and the minimum time has passed
  const [showLoader, setShowLoader] = useState(true);
  const loadStart = useRef(Date.now());
  const splashHidden = useRef(false);

  useEffect(() => {
    if (!ready) {
      if (!showLoader) {
        loadStart.current = Date.now(); // a new loading phase (e.g. after sign-in)
        setShowLoader(true);
      }
      return;
    }
    const remaining = Math.max(0, MIN_LOADING_MS - (Date.now() - loadStart.current));
    const t = setTimeout(() => setShowLoader(false), remaining);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const overlayVisible = showLoader || !ready;

  return (
    <>
      {children}
      {overlayVisible && (
        <View
          style={StyleSheet.absoluteFill}
          onLayout={() => {
            // the overlay is drawn, so hand over from the native splash (once)
            if (!splashHidden.current) {
              splashHidden.current = true;
              SplashScreen.hideAsync();
            }
          }}
        >
          <LoadingScreen />
        </View>
      )}
    </>
  );
}