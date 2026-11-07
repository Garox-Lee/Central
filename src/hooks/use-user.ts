import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type UserDetails = {
  publicId: string;
  firstName: string;
  lastName: string;
  birthday: Date | null;
  mustChangePassword: boolean;
};

function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function useUser(userId: string | null) {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [failed, setFailed] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [biometrics, setBiometrics] = useState<boolean>(true);

  const load = useCallback(async (id: string) => {
    setFailed(false);
    const { data, error } = await supabase
      .schema('users')
      .from('users')
      .select('public_id, first_name, last_name, birthday, must_change_password')
      .eq('user_id', id)
      .single();

    if (error) {
      console.log('user details failed to load:', JSON.stringify(error));
      setFailed(true);
      return;
    }

    setUserDetails({
      publicId: data.public_id,
      firstName: data.first_name,
      lastName: data.last_name,
      birthday: data.birthday ? parseDateOnly(data.birthday) : null,
      mustChangePassword: data.must_change_password,
    });
  }, []);

  useEffect(() => {
    setUserDetails(null); 
    if (userId) load(userId);
  }, [userId, load]);

  const refresh = useCallback(async () => {
    if (userId) await load(userId);
  }, [userId, load]);

  return { userDetails, failed, refresh, darkMode, setDarkMode, biometrics, setBiometrics };
}