import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/auth-context';
import { FAVOURITES_KEY } from '../constants';

export function useFavouriteInstruments() {
  const { userId } = useAuth();
  const [favourites, setFavourites] = useState<string[]>([]); // instrument names, in the order shown
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const hydrated = !!userId && hydratedFor === userId;

  useEffect(() => {
    if (!userId) {
      setHydratedFor(null);
      return;
    }
    let cancelled = false;
    setHydratedFor(null);
    setFavourites([]);

    (async () => {
      let list: string[] = [];
      try {
        const raw = await AsyncStorage.getItem(`${FAVOURITES_KEY}:${userId}`);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed)) list = parsed.filter((x) => typeof x === 'string');
      } catch {
        // corrupt or missing: start empty
      }
      if (cancelled) return;
      setFavourites(list);
      setHydratedFor(userId);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    AsyncStorage.setItem(`${FAVOURITES_KEY}:${userId}`, JSON.stringify(favourites)).catch(() => {});
  }, [hydrated, userId, favourites]);

  return { favourites, setFavourites, hydrated };
}