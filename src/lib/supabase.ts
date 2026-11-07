import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { saveRefreshToken, clearRefreshToken, getRefreshToken } from './token-store';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false } }
);

// keep the stored refresh token in sync (Supabase rotates it on every refresh)
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') clearRefreshToken();
  else if (session?.refresh_token) saveRefreshToken(session.refresh_token);
});

// call once on app launch; true = signed in again without a password
export async function restoreSession(): Promise<boolean> {
  const token = await getRefreshToken();
  if (!token) return false;

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: token });
  if (error || !data.session) {
    // only wipe the token if the server rejected it, not if the phone is just offline
    if (error?.name !== 'AuthRetryableFetchError') await clearRefreshToken();
    return false;
  }
  return true;
}