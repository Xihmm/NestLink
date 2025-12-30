import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          headerTitle: 'NestLink Feed',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Post',
          headerTitle: 'Create Post',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>➕</Text>,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Hide this tab
        }}
      />
    </Tabs>
  );
}
