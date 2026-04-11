import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderTopColor: isDark ? '#374151' : '#E5E7EB',
        },
        headerStyle: {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
        },
        headerShadowVisible: false,
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
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                if (user?.isAnonymous) {
                  Alert.alert(
                    'You\'re browsing as guest',
                    'Sign in to post and contact others.',
                    [
                      { text: 'Sign In / Sign Up', onPress: () => router.push('/auth') },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                } else {
                  Alert.alert(
                    'Account',
                    user?.email ?? undefined,
                    [
                      { text: 'Sign Out', style: 'destructive', onPress: signOut },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }
              }}
              style={{ position: 'absolute', right: 16 }}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: user?.isAnonymous ? '#3B82F6' : '#6B7280',
              }}>
                {user?.isAnonymous ? 'Sign In' : 'Account'}
              </Text>
            </TouchableOpacity>
          ),
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
