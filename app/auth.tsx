import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { Redirect } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { registerWithEmail, signInWithEmail, isEduEmail } from '@/lib/authService';
import { useAuth } from '@/hooks/useAuth';

type Tab = 'login' | 'signup';

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'This email is already registered. Try logging in instead.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
};

function friendlyError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    return FIREBASE_ERRORS[code] ?? 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

const getColors = (isDark: boolean) => ({
  bg: isDark ? '#0F172A' : '#EEF2F7',
  card: isDark ? '#1E293B' : '#FFFFFF',
  text: isDark ? '#F1F5F9' : '#1F2937',
  subtext: isDark ? '#94A3B8' : '#6B7280',
  border: isDark ? '#334155' : '#E5E7EB',
  input: isDark ? '#1E293B' : '#FFFFFF',
  tabsBg: isDark ? '#0F172A' : '#F3F4F6',
});

const createStyles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.card,
    },
    keyboardView: {
      flex: 1,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 28,
      paddingTop: 48,
      paddingBottom: 40,
    },
    title: {
      fontSize: 32,
      fontWeight: '800',
      color: '#1E40AF',
      letterSpacing: -0.5,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.subtext,
      textAlign: 'center',
      marginBottom: 32,
    },
    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.tabsBg,
      borderRadius: 12,
      padding: 4,
      marginBottom: 28,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
    },
    tabActive: {
      backgroundColor: colors.card,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
    tabText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#9CA3AF',
    },
    tabTextActive: {
      color: '#1E40AF',
    },
    form: {
      gap: 4,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
      marginTop: 12,
    },
    input: {
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    eduBanner: {
      backgroundColor: '#EFF6FF',
      borderRadius: 10,
      padding: 12,
      marginTop: 16,
      borderWidth: 1,
      borderColor: '#BFDBFE',
    },
    eduBannerText: {
      fontSize: 13,
      color: '#1E40AF',
      fontWeight: '500',
      textAlign: 'center',
    },
    submitButton: {
      backgroundColor: '#3B82F6',
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 24,
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    submitButtonDisabled: {
      backgroundColor: '#93C5FD',
      shadowOpacity: 0,
      elevation: 0,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '700',
    },
    skipButton: {
      marginTop: 20,
      alignItems: 'center',
    },
    skipText: {
      fontSize: 14,
      color: '#9CA3AF',
      fontWeight: '500',
    },
  });

export default function AuthScreen() {
  const [tab, setTab] = useState<Tab>('signup');
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [eduDetected, setEduDetected] = useState(false);
  const { loading, hasSession, continueAsGuest } = useAuth();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const styles = createStyles(colors);

  console.log('[auth] render tab=', tab, 'submitting=', submitting, 'eduDetected=', eduDetected);

  if (!loading && hasSession) {
    return <Redirect href="/(tabs)" />;
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const handleSubmit = async () => {
    if (submitting) return;

    const trimmedEmail = emailInput.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }

    if (tab === 'signup') {
      if (password !== confirmPassword) {
        Alert.alert('Password mismatch', 'Passwords do not match. Please try again.');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Weak password', 'Password must be at least 6 characters.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (tab === 'signup') {
        await registerWithEmail(trimmedEmail, password);
        if (isEduEmail(trimmedEmail)) {
          setEduDetected(true);
          console.log('[auth] signup success (.edu), waiting for auth-state redirect to /(tabs)');
        }
      } else {
        await signInWithEmail(trimmedEmail, password);
        console.log('[auth] login success, waiting for auth-state redirect to /(tabs)');
      }
    } catch (error) {
      Alert.alert('Error', friendlyError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      await continueAsGuest();
    } catch (error) {
      console.error('Failed to continue as guest from auth screen:', error);
      Alert.alert('Unable to continue', 'We could not start your guest session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!emailInput.trim()) {
      Alert.alert('Enter your email first');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, emailInput.trim());
      Alert.alert('Email sent!', 'Check your inbox for a password reset link.');
    } catch {
      Alert.alert('Error', 'Could not send reset email. Check your email address.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>NestLink 🏠</Text>
          <Text style={styles.subtitle}>
            {tab === 'signup' ? 'Create your account' : 'Welcome back'}
          </Text>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'signup' && styles.tabActive]}
              onPress={() => setTab('signup')}
            >
              <Text style={[styles.tabText, tab === 'signup' && styles.tabTextActive]}>Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'login' && styles.tabActive]}
              onPress={() => setTab('login')}
            >
              <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>Log In</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#9CA3AF"
              value={emailInput}
              onChangeText={setEmailInput}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {tab === 'login' && (
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={{ fontSize: 12, color: '#3B82F6', textAlign: 'right', marginTop: 4 }}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            )}

            {tab === 'signup' && (
              <>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Repeat your password"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </>
            )}

            {eduDetected && (
              <View style={styles.eduBanner}>
                <Text style={styles.eduBannerText}>
                  🎓 .edu email detected! You&apos;ll get a verified badge.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Please wait...' : tab === 'signup' ? 'Create Account' : 'Log In'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
