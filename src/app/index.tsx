import { useAuth } from '@/context/auth-context';

import { Redirect } from 'expo-router';
import { View } from 'react-native';

export default function Index() {
  const { isLoggedIn } = useAuth();

  if (isLoggedIn === null) {
    return <View />; 
  }

  return isLoggedIn
    ? <Redirect href="/(finance)/positions" />
    : <Redirect href="/(auth)/sign-in" />;
}