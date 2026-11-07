import { useEffect } from 'react';
import { useTheme } from '@/hooks/use-theme';

import { Tabs, router, useSegments } from 'expo-router';
import { View } from 'react-native';
import { List, QrCode, ReceiptText } from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useUserContext } from '@/context/user-context';
import { registerPushToken } from '@/utils/notifications';

export default function FinanceLayout() {
  const { background, primary, muted } = useTheme();
  const { userDetails } = useUserContext();
  const segments = useSegments();

  useEffect(() => {
    if (!userDetails) return;
    registerPushToken().catch(() => {})
  }, [userDetails?.publicId]);

  useEffect(() => {
    if (userDetails?.mustChangePassword && segments[segments.length - 1] !== 'change-password') {
      router.replace('/(finance)/change-password');
    }
  }, [userDetails?.mustChangePassword, segments]);

  if (!userDetails) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Tabs
        backBehavior="history"
        screenOptions={{
          lazy: false,
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: primary,
          tabBarInactiveTintColor: muted,
          tabBarStyle: { backgroundColor: background, borderTopWidth: 0 },
          tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
          tabBarIconStyle: { marginTop: 4 },
        }}
      >
        <Tabs.Screen
          name="positions"
          options={{
            title: 'Positions',
            tabBarIcon: ({ color, size }) => <List color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="receipts"
          options={{
            title: 'Receipts',
            tabBarIcon: ({ color, size }) => <ReceiptText color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="qr-code"
          options={{
            title: 'QR Code',
            tabBarIcon: ({ color, size }) => (
              <View>
                <QrCode color={color} size={size} />
              </View>
            ),
          }}
        />
        <Tabs.Screen name="user-details" options={{ href: null }} />
        <Tabs.Screen name="change-password" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="privacy-policy" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="terms-of-service" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      </Tabs>
    </GestureHandlerRootView>
  );
}