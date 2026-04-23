import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { sendVerificationEmail } from '@/lib/authService';

export default function VerifyEmailScreen() {
  const { userEmail, reloadUser, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const colors = {
    bg: isDark ? '#0F172A' : '#EEF2F7',
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F1F5F9' : '#1F2937',
    subtext: isDark ? '#94A3B8' : '#6B7280',
    border: isDark ? '#334155' : '#E5E7EB',
  };

  const handleVerified = async () => {
    setChecking(true);
    try {
      const verified = await reloadUser();
      if (!verified) {
        Alert.alert(
          'Not verified yet',
          'We couldn\'t detect your verification. Please check your email and click the link, then try again.'
        );
      }
      // If verified, nav guard in _layout.tsx will automatically redirect to /(tabs)
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await sendVerificationEmail();
      Alert.alert('Email sent!', 'Check your inbox for a new verification link.');
    } catch (error) {
      Alert.alert('Error', 'Could not resend the email. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('[verify-email] sign out error:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={styles.icon}>📧</Text>
        <Text style={[styles.title, { color: colors.text }]}>Verify your email</Text>
        <Text style={[styles.body, { color: colors.subtext }]}>
          We sent a verification link to:
        </Text>
        <Text style={[styles.email, { color: colors.text }]}>{userEmail}</Text>
        <Text style={[styles.body, { color: colors.subtext }]}>
          Click the link in the email, then tap the button below.
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, checking && styles.buttonDisabled]}
          onPress={handleVerified}
          disabled={checking || resending}
        >
          {checking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>I've verified my email ✓</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.border }, resending && styles.buttonDisabled]}
          onPress={handleResend}
          disabled={checking || resending}
        >
          {resending ? (
            <ActivityIndicator color="#3B82F6" />
          ) : (
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Resend email</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Use a different account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 6,
  },
  email: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signOutButton: {
    marginTop: 20,
    paddingVertical: 8,
  },
  signOutText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
