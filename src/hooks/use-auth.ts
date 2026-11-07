import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase, restoreSession } from '@/lib/supabase';
import { getRefreshToken } from '@/lib/token-store';
import { unregisterPushToken, disableNotifications } from '@/utils/notifications';

const USERNAME_KEY = 'central_username';

type SignInResult = 'ok' | 'invalid' | 'biometric' | 'unavailable';

async function scan(prompt: string) {
  const [hasHardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  if (!hasHardware || !enrolled) return 'unavailable' as const;

  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: prompt,
    disableDeviceFallback: true,
  });
  return res.success ? ('ok' as const) : ('failed' as const);
}

export function useAuthentication() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastUsername, setLastUsername] = useState<string | null>(null);

  // launch: fingerprint/face first, then restore the session from the stored refresh token
  useEffect(() => {
    (async () => {
      setLastUsername(await SecureStore.getItemAsync(USERNAME_KEY));

      if (!(await getRefreshToken())) {
        setIsLoggedIn(false);
        return;
      }

      if ((await scan('Unlock Central')) !== 'ok') {
        setIsLoggedIn(false); // cancelled, failed or unavailable -> password screen
        return;
      }

      const restored = await restoreSession();
      if (restored) {
        const { data } = await supabase.auth.getSession();
        setUserId(data.session?.user.id ?? null);
      }
      setIsLoggedIn(restored);
    })();
  }, []);

  const signIn = useCallback(async (username: string, password: string): Promise<SignInResult> => {
    // 1. scan first: no network call if it fails
    const result = await scan('Confirm it\u2019s you');
    if (result !== 'ok') return result === 'unavailable' ? 'unavailable' : 'biometric';
  
    // 2. then the password
    const clean = username.trim();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${clean.toLowerCase()}@central.invalid`,
      password,
    });
    if (error || !data.session) return 'invalid';
  
    await SecureStore.setItemAsync(USERNAME_KEY, clean);
    setLastUsername(clean);
    setUserId(data.session.user.id);
    setIsLoggedIn(true);
    return 'ok';
  }, []);

  const signOut = useCallback(async () => {
    try {
      await unregisterPushToken(); // needs the session, so it must run before signOut
    } catch (e) {
      console.log('Push token unregister failed', e); // don't block logout
    }
    await disableNotifications();
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUserId(null);
  }, []);

  return { isLoggedIn, userId, lastUsername, signIn, signOut };
}