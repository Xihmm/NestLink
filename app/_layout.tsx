import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Alert, InteractionManager, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { applyActionCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { PostsProvider } from '@/hooks/usePostsStore';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

function AppShell() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { needsUsernameSetup, saveUsername, loading, user, sessionState, emailVerified, reloadUser } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const [usernameInput, setUsernameInput] = useState('');
  const [showUsernameModal, setShowUsernameModal] = useState(false);
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
      setShowUsernameModal(false);
      return;
    }
    const task = InteractionManager.runAfterInteractions(() => {
      setShowUsernameModal(true);
    });
    return () => task.cancel();
  }, [needsUsernameSetup]);

  useEffect(() => {
    if (!navigationState?.key || loading) {
      return;
    }

    const routeKey = segments.join('/');
    // auth is intentionally excluded — it must be reachable by guests to register
    const isPublicRoute = routeKey === '' || routeKey === 'index' || routeKey === 'login';
    const isVerifyRoute = routeKey === 'verify-email';
    const isProtectedRoute =
      routeKey === '(tabs)' ||
      routeKey.startsWith('(tabs)/') ||
      routeKey === 'profile' ||
      routeKey === 'post' ||
      routeKey.startsWith('post/');
    const isSignedIn = sessionState === 'guest' || sessionState === 'registered';

    // Registered but email not verified → must stay on verify-email screen
    const isUnverified = sessionState === 'registered' && !!user && !emailVerified;
    if (isUnverified && !isVerifyRoute) {
      router.replace('/verify-email');
      return;
    }

    // Verified registered user on verify screen → push to feed
    if (sessionState === 'registered' && emailVerified && isVerifyRoute) {
      router.replace('/(tabs)');
      return;
    }

    if (isSignedIn && isPublicRoute) {
      router.replace('/(tabs)');
      return;
    }

    if (sessionState === 'signed_out' && isProtectedRoute) {
      router.replace('/login');
    }
  }, [emailVerified, loading, navigationState?.key, router, segments, sessionState, user]);

  // Handle email verification deep links (iOS Universal Links / Android App Links)
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      try {
        const queryString = url.split('?')[1];
        if (!queryString) return;
        const params: Record<string, string> = {};
        queryString.split('&').forEach((pair) => {
          const eqIdx = pair.indexOf('=');
          if (eqIdx > 0) {
            const key = pair.slice(0, eqIdx);
            const val = pair.slice(eqIdx + 1);
            params[key] = decodeURIComponent(val);
          }
        });
        if (params.mode === 'verifyEmail' && params.oobCode) {
          console.log('[deep-link] handling verifyEmail');
          await applyActionCode(auth, params.oobCode);
          await reloadUser();
        }
      } catch (error) {
        console.warn('[deep-link] error:', error);
        Alert.alert('Verification failed', 'This link may have expired. Please request a new one from the app.');
      }
    };

    // App opened from a deep link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // App already open, deep link received
    const subscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => subscription.remove();
  }, [reloadUser]);

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
        <Stack.Screen name="verify-email" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
      <Toast />
      {showUsernameModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop}>
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
          </View>
        </View>
      )}
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
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
