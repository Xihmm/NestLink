import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

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
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Text style={{ fontSize: 20 }}>🏠</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E40AF', letterSpacing: -0.5 }}>Nest</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#3B82F6', letterSpacing: -0.5 }}>Link</Text>
              <Text style={{ fontSize: 20 }}>🐷</Text>
            </View>
          ),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Post',
          headerTitle: 'Create Post',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>➕</Text>,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingHorizontal: 16, paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 16, color: '#3B82F6' }}>‹ Back</Text>
            </TouchableOpacity>
          ),
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
