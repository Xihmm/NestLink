import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const [checked, setChecked] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('hasOnboarded').then((val) => {
      setHasOnboarded(!!val);
      setChecked(true);
    });
  }, []);

  if (!checked) return null;
  if (hasOnboarded) return <Redirect href="/(tabs)" />;
  return <Redirect href="/login" />;
}
