// utils/updates.ts
type UpdatesModule = typeof import('expo-updates');

let Updates: UpdatesModule | null = null;
try {
  Updates = require('expo-updates'); // throws if the native module isn't in this binary
} catch (e) {
  console.log('expo-updates not available in this build');
}

export const updatesAvailable = Updates !== null;

const fallback = { isUpdatePending: false };

// Safe because updatesAvailable is constant for the life of the app, so hook order never changes
export function useUpdatesSafe() {
  return Updates ? Updates.useUpdates() : fallback;
}

export async function checkAndFetchUpdate() {
  if (!Updates) return;
  const res = await Updates.checkForUpdateAsync();
  if (res.isAvailable) await Updates.fetchUpdateAsync();
}

export function reloadApp() {
  return Updates?.reloadAsync();
}