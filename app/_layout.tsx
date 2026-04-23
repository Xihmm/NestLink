import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { PostsProvider } from '@/hooks/usePostsStore';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

function AppShell() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { needsUsernameSetup, saveUsername, loading, user, sessionState } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const [usernameInput, setUsernameInput] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  console.log(
    '[root/_layout] render loading=',
    loading,
    'sessionState=',
    sessionState,
    'hasUser=',
    !!user,
    'needsUsernameSetup=',
    needsUsernameSetup
  );

  useEffect(() => {
    if (!needsUsernameSetup) {
      setUsernameInput('');
    }
  }, [needsUsernameSetup]);

  useEffect(() => {
    if (!navigationState?.key || loading) {
      return;
    }

    const routeKey = segments.join('/');
    // auth is intentionally excluded — it must be reachable by guests to register
    const isPublicRoute = routeKey === '' || routeKey === 'index' || routeKey === 'login';
    const isProtectedRoute =
      routeKey === '(tabs)' ||
      routeKey.startsWith('(tabs)/') ||
      routeKey === 'profile' ||
      routeKey === 'post' ||
      routeKey.startsWith('post/');
    const isSignedIn = sessionState === 'guest' || sessionState === 'registered';

    if (isSignedIn && isPublicRoute) {
      router.replace('/(tabs)');
      return;
    }

    if (sessionState === 'signed_out' && isProtectedRoute) {
      router.replace('/login');
    }
  }, [loading, navigationState?.key, router, segments, sessionState]);

  const handleSaveUsername = async () => {
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      Alert.alert('Username required', 'Please enter a username.');
      return;
    }

    setSavingUsername(true);
    try {
      await saveUsername(trimmed);
    } catch (error) {
      Alert.alert(
        'Username not saved',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setSavingUsername(false);
    }
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="post/[id]"
          options={{
            headerShown: true,
            title: 'Post Details',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen name="profile" options={{ headerShown: true, title: 'Profile', headerBackTitle: 'Back' }} />
        <Stack.Screen name="post/edit/[id]" options={{ headerShown: true, title: 'Edit Post' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
      <Toast />
      <Modal
        visible={!loading && !!user && !user.isAnonymous && needsUsernameSetup}
        transparent
        animationType="fade"
      >
        <Pressable style={styles.modalBackdrop} />
        <View style={[styles.modalCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          <Text style={[styles.modalTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            Set your username
          </Text>
          <Text style={[styles.modalText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Pick the name other users will see on your posts and comments.
          </Text>
          <TextInput
            value={usernameInput}
            onChangeText={setUsernameInput}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!savingUsername}
            placeholder="Enter a username"
            placeholderTextColor="#9CA3AF"
            style={[
              styles.modalInput,
              {
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                borderColor: isDark ? '#374151' : '#E5E7EB',
                color: isDark ? '#F9FAFB' : '#111827',
              },
            ]}
          />
          <TouchableOpacity
            style={[styles.modalButton, savingUsername && styles.modalButtonDisabled]}
            onPress={handleSaveUsername}
            disabled={savingUsername}
          >
            <Text style={styles.modalButtonText}>
              {savingUsername ? 'Saving...' : 'Save Username'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PostsProvider>
        <AppShell />
      </PostsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: '28%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  modalButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
