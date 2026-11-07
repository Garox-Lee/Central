import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from '@/lib/supabase'; // adjust to your client path
import type { NotificationResponse } from 'expo-notifications';

export type NotificationResult = 'sent' | 'denied' | 'unsupported';

// Expo Go on Android can't load expo-notifications at all, so don't import it there
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const appName = Constants.expoConfig?.name ?? 'Central';

let handlerSet = false;

let notificationsAllowed = false;

export function setNotificationsAllowed(allowed: boolean) {
  notificationsAllowed = allowed;
  if (!allowed) pendingReceiptId = null;
}

async function ensureHandler() {
  if (handlerSet) return;
  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: notificationsAllowed,
      shouldShowList: notificationsAllowed,
      shouldPlaySound: notificationsAllowed,
      shouldSetBadge: false,
    }),
  });
  handlerSet = true;
}

type TapListener = (receiptId: string) => void;

let pendingReceiptId: string | null = null;
let tapHandlerSet = false;
const tapListeners = new Set<TapListener>();

// remembers the tapped receipt; only live taps (app already running) tell listeners
const queueReceiptTap = (response: NotificationResponse, live: boolean) => {
  const raw = response.notification.request.content.data?.receiptId;
  if (raw == null) return; // not a receipt notification (e.g. the 7am summary)
  const id = String(raw);
  pendingReceiptId = id;
  if (live) tapListeners.forEach((fn) => fn(id));
};

export function consumePendingReceiptId(): string | null {
  const id = pendingReceiptId;
  pendingReceiptId = null;
  return id;
}

export function subscribeToReceiptTaps(fn: TapListener) {
  tapListeners.add(fn);
  return () => {
    tapListeners.delete(fn);
  };
}

export async function initNotifications() {
  if (inExpoGo && Platform.OS === 'android') return;
  await ensureHandler();
  if (tapHandlerSet) return;
  tapHandlerSet = true;

  const Notifications = await import('expo-notifications');
  Notifications.addNotificationResponseReceivedListener((response) => queueReceiptTap(response, true));

  // the tap that launched the app: no navigation here, the Positions screen picks it up when it mounts
  const launch = await Notifications.getLastNotificationResponseAsync();
  if (launch) {
    queueReceiptTap(launch, false);
    await Notifications.clearLastNotificationResponseAsync();
  }
}

export async function sendTestNotification(): Promise<NotificationResult> {
  if (inExpoGo && Platform.OS === 'android') return 'unsupported';

  const Notifications = await import('expo-notifications');

  await ensureHandler();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return 'denied';

  await Notifications.scheduleNotificationAsync({
    content: { title: appName, body: `A notification from ${appName}` },
    trigger: Platform.OS === 'android' ? { channelId: 'default' } : null,
  });
  return 'sent';
}

export async function registerPushToken(): Promise<NotificationResult> {
  if (inExpoGo && Platform.OS === 'android') return 'unsupported';

  const Notifications = await import('expo-notifications');

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return 'denied';

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  const { error } = await supabase
    .schema('users') // drop this line if the RPC is in public
    .rpc('register_push_token', { p_token: token, p_platform: Platform.OS, p_app_name: appName });
  if (error) throw error;

  return 'sent';
}

export async function unregisterPushToken() {
  if (inExpoGo && Platform.OS === 'android') return;
  const Notifications = await import('expo-notifications');
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  const { error } = await supabase
    .schema('users')
    .rpc('unregister_push_token', { p_token: token });
  if (error) throw error;
}

export async function disableNotifications() {
  setNotificationsAllowed(false);
  if (inExpoGo && Platform.OS === 'android') return;
  const Notifications = await import('expo-notifications');
  await Notifications.cancelAllScheduledNotificationsAsync(); // local ones, e.g. 7am summary
  await Notifications.dismissAllNotificationsAsync();         // anything already in the tray
}