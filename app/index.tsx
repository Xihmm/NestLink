import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { hasSession, loading, sessionState } = useAuth();

  console.log('[index] render loading=', loading, 'hasSession=', hasSession, 'sessionState=', sessionState);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2F7' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const target = hasSession ? '/(tabs)' : '/login';
  console.log('[index] redirecting to', target);
  return <Redirect href={target} />;
}
