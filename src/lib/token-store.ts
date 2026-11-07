import * as SecureStore from 'expo-secure-store';

const KEY = 'central.refresh_token';
export const saveRefreshToken = (t: string) => SecureStore.setItemAsync(KEY, t);
export const getRefreshToken = () => SecureStore.getItemAsync(KEY);
export const clearRefreshToken = () => SecureStore.deleteItemAsync(KEY);